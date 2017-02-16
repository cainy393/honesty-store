import jwt = require('jsonwebtoken');
import ms = require('ms');
import { CodedError } from '../../service/src/error';
import { warn } from '../../service/src/log';

const secret = process.env.USER_TOKEN_SECRET;
if (!secret) {
  throw new Error('no $USER_TOKEN_SECRET provided');
}

const signToken = (payload, expiresIn) => jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn });

export const signAccessToken = ({ userId }) => signToken({ userId }, '5m');

export const signRefreshToken = ({ userId, refreshToken }) => signToken({ userId, refreshToken }, '1y');

const verifyToken = (key, token) => {
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'], clockTolerance: ms('30s') });
  } catch (e) {
    warn(key, `token failed validation`, { e, token });

    if (e.name === 'TokenExpiredError') {
      throw new CodedError('TokenExpired', 'token expired');
    }

    throw new CodedError('TokenError', 'token error');
  }
};

export const verifyAccessToken = (key, token) => {
  const { userId, refreshToken } = verifyToken(key, token);
  if (refreshToken != null) {
    throw new Error('Refresh token used in place of access token');
  }
  return { userId };
};

export const verifyRefreshToken = (key, token) => {
  const { userId, refreshToken } = verifyToken(key, token);
  if (refreshToken == null) {
    throw new Error('Access token used in place of refresh token');
  }
  return { userId, refreshToken };
};
