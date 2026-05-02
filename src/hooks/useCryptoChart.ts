import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export interface ChartDataPoint {
  date: string;
  price: number;
}

export const useCryptoChart = (coinId: string) => {
  const [days, setDays] = useState(7);

  const query = useQuery({
    queryKey: ['cryptoChart', coinId, days],
    queryFn: async () => {
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=eur&days=${days}&interval=daily`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch chart data');
      const data = await res.json();
      return data.prices.map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toLocaleDateString(),
        price,
      })) as ChartDataPoint[];
    },
    enabled: !!coinId,
    staleTime: 300000, // 5 min
  });

  return {
    chartData: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    setDays,
    days,
  };
};
