import { DynamoDB, Lambda } from 'aws-sdk';
import concatStream = require('concat-stream');
import globCb = require('glob');
import yazl = require('yazl');
import { join, relative } from 'path';
import * as winston from 'winston';

const globFiles = (pattern) => new Promise<string[]>((resolve, reject) =>
  globCb(pattern, { mark: true }, (err, files) => {
    if (err) {
      return reject(err);
    }
    resolve(files.filter(file => file[file.length - 1] !== '/'));
  })
);

export const zip = (dir, pattern) =>
  Promise.all([
    globFiles(`${dir}/${pattern}`),
    globFiles('aws/xray/node_modules/**/*')
  ])
    .then(([files, xrayFiles]) =>
      new Promise<Buffer>((resolve) => {
        if (files.length === 0 || xrayFiles.length === 0) {
          throw new Error(`No files found in ${dir} ${pattern} (or xray files missing)`);
        }
        const zipfile = new yazl.ZipFile();
        zipfile.outputStream.pipe(concatStream(resolve));
        for (const file of files) {
          zipfile.addFile(file, relative(dir, file), {
            mtime: new Date(0),
            mode: parseInt('0100664', 8)
          });
        }
        for (const file of xrayFiles) {
          zipfile.addFile(file, relative(join('aws', 'xray'), file), {
            mtime: new Date(0),
            mode: parseInt('0100664', 8)
          });
        }
        zipfile.end();
      })
    );

const dynamoAccessToRole = ({ access, live }: { access?: 'ro' | 'rw', live: boolean }) => {
  if (!access) {
    return 'arn:aws:iam::812374064424:role/lambda_basic_execution';
  }

  const name = live ? 'honesty-store' : 'hs';

  return `arn:aws:iam::812374064424:role/${name}-lambda-dynamo-${access}`;
};

const ensureLambda = async ({ name, timeout, handler, environment, dynamoAccess, zipFile, live }) => {
  const lambda = new Lambda({ apiVersion: '2015-03-31' });

  const role = dynamoAccessToRole({ access: dynamoAccess, live });
  const params = {
    FunctionName: name,
    Timeout: timeout,
    Role: role,
    Handler: handler,
    Environment: {
      Variables: environment
    },
    Runtime: 'nodejs6.10',
    TracingConfig: {
      Mode: 'Active'
    }
  };

  try {
    const response = await lambda.createFunction({
      ...params,
      Code: {
        ZipFile: zipFile
      }
    })
      .promise();

    winston.debug(`function: createFunction`, response);

    return response;
  } catch (e) {
    if (e.code !== 'ResourceConflictException') {
      throw e;
    }
    const func = await lambda.updateFunctionCode({
      FunctionName: name,
      ZipFile: zipFile
    })
      .promise();

    winston.debug(`function: updateFunctionCode`, func);

    const config = await lambda.updateFunctionConfiguration({
      FunctionName: name,

      ...params
    })
      .promise();

    winston.debug(`function: updateFunctionConfiguration`, config);

    const version = await lambda.publishVersion({
      FunctionName: name,
      CodeSha256: func.CodeSha256
    })
      .promise();

    winston.debug(`function: publishVersion`, version);

    return func;
  }
};

const permitLambdaCallFromApiGateway = async ({ func }: { func: Lambda.FunctionConfiguration }) => {
  const lambda = new Lambda({ apiVersion: '2015-03-31' });
  const apiGatewaySid = 'apiGatewaySid';

  interface Policy {
    Version: string;
    Id: string;
    Statement: {
      Sid: string;
      Effect: string;
      Principal: {
        Service: string;
      };
      Action: string;
      Resource: string;
    }[];
  }

  let policyString;
  try {
    policyString  = await lambda.getPolicy({
      FunctionName: func.FunctionArn
    }).promise();

    const policy = JSON.parse(policyString.Policy) as Policy;

    const removePromises = policy.Statement
      .filter(({ Sid }) => Sid !== apiGatewaySid)
      .map(({ Sid }) => lambda.removePermission({
        FunctionName: func.FunctionArn,
        StatementId: Sid
      }).promise());

    await Promise.all(removePromises);

    if (policy.Statement.some(({ Sid }) => Sid === apiGatewaySid)) {
      return;
    }
  } catch (e) {
    if (e.code !== 'ResourceNotFoundException') {
      throw e;
    }
  }

  const permission = await lambda.addPermission({
    FunctionName: func.FunctionArn,
    StatementId: apiGatewaySid,
    Action: 'lambda:InvokeFunction',
    Principal: 'apigateway.amazonaws.com'
  })
    .promise();

  winston.debug(`function: addPermission`, permission);
};

export const ensureFunctionDynamoTrigger = async (
  { lambdaFunc, table }: { lambdaFunc: Lambda.FunctionConfiguration, table: DynamoDB.Types.TableDescription }
) => {
  const lambda = new Lambda({ apiVersion: '2015-03-31' });

  const source = table.LatestStreamArn;
  if (!source) {
    throw new Error(`trying to enable function trigger on non-streaming table '${table.TableName}'`);
  }

  try {
    return await lambda.createEventSourceMapping({
      EventSourceArn: source,
      FunctionName: lambdaFunc.FunctionArn,
      StartingPosition: 'TRIM_HORIZON'
    })
      .promise();
  } catch (e) {
    if (e.code !== 'ResourceConflictException' || !/already exists/.test(e.message)) {
      throw e;
    }
  }
};

export const ensureFunction = async ({
  name,
  codeDirectory,
  codeFilter,
  timeout,
  handler,
  environment,
  dynamoAccess,
  withApiGateway = false,
  live
}) => {
  winston.debug(`function: zipping...`);
  const zipFile = await zip(codeDirectory, codeFilter);
  winston.debug(`function: uploading...`);
  const lambda = await ensureLambda({ name, timeout, handler, environment, dynamoAccess, zipFile, live });

  if (withApiGateway) {
    await permitLambdaCallFromApiGateway({ func: lambda });
  }

  return lambda;
};

export const pruneFunctions = async (filter = (_func: Lambda.FunctionConfiguration) => false) => {
  const lambda = new Lambda({ apiVersion: '2015-03-31' });

  const listResponse = await lambda.listFunctions()
    .promise();

  winston.debug(`pruneFunctions: functions`, listResponse.Functions);

  const promises = listResponse.Functions
    .filter(filter)
    .map((func) =>
      lambda.deleteFunction({ FunctionName: func.FunctionName })
        .promise()
    );

  await Promise.all(promises);
};
