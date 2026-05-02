import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const COINS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'matic-network', 'chainlink', 'uniswap'];

export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  price_eur: number;
  change_24h: number;
}

export const useCryptoPrices = () => {
  const query = useQuery({
    queryKey: ['cryptoPrices'],
    queryFn: async () => {
      const ids = COINS.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch crypto prices');
      const data = await res.json();
      return COINS.map(id => {
        const coin = data[id];
        return {
          id,
          symbol: id.toUpperCase(),
          name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '),
          price_eur: coin.eur,
          change_24h: coin.eur_24h_change,
        };
      });
    },
    staleTime: 60000, // 1 min
    retry: 2,
  });

  // Fallback to mocks if error
  const fallback = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price_eur: 63245.82, change_24h: 2.34 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price_eur: 2947.15, change_24h: -1.12 },
    // ... (add more from mockStore if needed)
  ];

  return {
    coins: query.isError ? fallback : query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
};
