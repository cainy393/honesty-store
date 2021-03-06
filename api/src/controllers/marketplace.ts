import { authenticateAccessToken } from '../middleware/authenticate';
import { mailStoreAgent } from './support';

export default (router) => {
  router.post(
    '/marketplace',
    authenticateAccessToken,
    async (
      key,
      _params,
      { item: { name, qualifier, itemPrice, quantity }, storeCode },
      { user }
    ) => {
      const subject = 'Marketplace Request';

      const adminUrl = `https://honesty.store/admin/listing/${storeCode}`;

      const message =
`A marketplace request has been made by ${user.emailAddress}.
If you're happy, you can list the item at ${adminUrl}.

Here's what they submitted:
Name: ${name}
Qualifier: ${qualifier || ''}
Item price (inclusive of all fees): £${(Number(itemPrice) / 100).toFixed(2)}
Quantity: ${quantity}
Seller Id: ${user.id}
`;

      return await mailStoreAgent({
        key,
        replyTo: user.emailAddress,
        subject,
        message,
        storeCode
      });
    });
};
