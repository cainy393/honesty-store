import { calculateServiceFee, getStoreFromId, StoreItem as StoreItemInternal } from '@honesty-store/store';

export interface StoreItem {
  id: string;
  name: string;
  qualifier?: string;
  image: string;
  isMarketplace: boolean;
  count: number;
  price: {
    total: number;
    breakdown: PriceBreakdown;
  };
  sellerId: string;
  listCount?: number;
  refundCount?: number;
  purchaseCount?: number;
  revenue?: number;
}

export interface PriceBreakdown {
  wholesaleCost: number;
  serviceFee: number;
  donation: number;
  handlingFee: number;
  creditCardFee: number;
  VAT: number;
}

export const calculateDonation = (_storeId: string, _price: number): number => 0;

const scottLogicId = '9127e1db-2a2c-41c5-908f-781ac816b633';

export const externaliseItem = (item: StoreItemInternal, storeId: string, userId: string): StoreItem => {
  const donation = calculateDonation(storeId, item.price);
  const serviceFee = calculateServiceFee(item.price);
  return {
    id: item.id,
    name: item.name,
    qualifier: item.qualifier,
    image: item.image,
    isMarketplace: item.sellerId !== scottLogicId,
    count: item.availableCount,
    price: {
      total: item.price + donation,
      breakdown: {
        wholesaleCost: item.price - serviceFee,
        serviceFee: serviceFee,
        donation,
        handlingFee: 0,
        creditCardFee: 0,
        VAT: 0
      }
    },
    sellerId: item.sellerId,
    ...(
      userId === item.sellerId
      ? {
        listCount: item.listCount,
        purchaseCount: item.purchaseCount,
        refundCount: item.refundCount,
        revenue: item.revenue
      }
      : {}
    )
  };
};

export const storeItems = async (key, storeId, userId): Promise<StoreItem[]> => {
  const { items } = await getStoreFromId(key, storeId);
  return items.map((item) => externaliseItem(item, storeId, userId));
};
