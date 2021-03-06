import { createServiceKey } from '@honesty-store/service/lib/key';
import { recordTransaction } from '@honesty-store/store';
import { subscribeTransactions } from '@honesty-store/transaction/lib/client/stream';

const asyncHandler = async event => {
  const key = createServiceKey({ service: 'transaction-store' });

  for (const transaction of subscribeTransactions(event)) {
    switch (transaction.type) {
      case 'topup':
      case 'debit':
      case 'credit':
        continue;
      default:
        break;
    }
    await recordTransaction(key, transaction);
  }

  return `Successfully processed ${event.Records.length} records`;
};

export const handler = (event, context) =>
  asyncHandler(event)
    .then(info => context.succeed(info))
    .catch(e => context.fail(e));
