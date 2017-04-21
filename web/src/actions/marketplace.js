import apifetch from './apirequest';
import history from '../history';

export const MARKETPLACE_REQUEST = 'MARKETPLACE_REQUEST';
export const MARKETPLACE_SUCCESS = 'MARKETPLACE_SUCCESS';
export const MARKETPLACE_FAILURE = 'MARKETPLACE_FAILURE';

const marketplaceRequest = () => {
  return {
    type: MARKETPLACE_REQUEST,
  };
};

const marketplaceSuccess = () => {
  return {
    type: MARKETPLACE_SUCCESS
  };
};

const marketplaceFailure = (error) => {
  return {
    type: MARKETPLACE_FAILURE,
    error
  };
};

export const performMarketplace = ({
  description,
  totalPrice,
  quantity,
  location,
  expiry
}) => async (dispatch, getState) => {
  dispatch(marketplaceRequest());

  try {
    const response = await apifetch({
      url: '/_api/v1/marketplace',
      body: {
        item: {
          description,
          totalPrice,
          quantity,
          location,
          expiry
        }
      },
      getToken: () => getState().accessToken
    }, dispatch, getState);

    dispatch(marketplaceSuccess(response));
    history.push(`/more/success`);

  } catch (e) {
    dispatch(marketplaceFailure(e));
  }
};
