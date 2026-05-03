import { useQuery } from '@tanstack/react-query';

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  spread: number;
  bestBid: number;
  bestAsk: number;
}

export const useCryptoOrderBook = (coinId: string) => {
  const query = useQuery({
    queryKey: ['orderBook', coinId],
    queryFn: async () => {
      // CoinGecko doesn't have free order book; simulate realistic data
       const basePrice = 60000; // Mock BTC price
       const initialSpread = 0.001; // 0.1%
       const depth = 10;

      const generateSide = (isAsk: boolean) => {
        const side: OrderBookEntry[] = [];
        let price = isAsk ? basePrice * (1 + initialSpread) : basePrice;
        let cumulative = 0;
        for (let i = 0; i < depth; i++) {
          const size = Math.random() * 5 + 0.5; // 0.5-5.5 BTC
          cumulative += size;
          side.push({
            price: Math.round(price * 100) / 100,
            size,
            total: cumulative,
          });
          price *= isAsk ? (1 + 0.0005 * (i + 1)) : (1 - 0.0005 * (i + 1));
        }
        return side;
      };

      const asks = generateSide(true);
      const bids = generateSide(false);
      const bestAsk = asks[0].price;
      const bestBid = bids[0].price;
      const spread = ((bestAsk - bestBid) / bestBid) * 100;

      return { asks, bids, spread, bestBid, bestAsk };
    },
    enabled: !!coinId,
    staleTime: 10000, // 10s for "live"
  });

  return query;
};
