"use client"

import { useEffect, useRef, useState } from 'react';
import OrderBook, { type Order } from './components/OrderBook';
// import TradingViewTsx from './components/TradingView';
import LightweightChart from './components/LightweightChart';
import TradeWidget from './components/TradeWidget';

export default function Home() {
  const mockSocket = useRef<NodeJS.Timeout | null>(null);
  const [orderbookData, setOrderbookData] = useState<{ bids: Order[]; asks: Order[] }>({ bids: [], asks: [] });

  useEffect(()=> {
    mockSocket.current = setInterval(() => {
      setOrderbookData(generateMockLeveledOrders());
    }, 375)

    return function cleanUp() {
      clearInterval(mockSocket.current as NodeJS.Timeout);
    }
  }, [])

  return (
    <div className='p-4 h-screen flex flex-col'>
      <main className="flex flex-row gap-4 h-full">
        <div className="flex-1 min-w-0">
          <LightweightChart />
        </div>
        <div className="flex gap-4">
          <OrderBook bids={orderbookData?.bids} asks={orderbookData?.asks} />
          <TradeWidget />
        </div>
      </main>
    </div>
  );
}


function generateMockLeveledOrders(spread: number = 0.1): { bids: Order[]; asks: Order[] } {
  const getRandomQuantity = () => Math.floor(Math.random() * 10) + 1;
  const getRandomSize = (n = 900) => Math.floor(Math.random() * n) + 1;

  function getPrices(base: number, levels: number, side: 'buy' | 'sell') {
    return Array.from({ length: levels }, (_, i) => {
      if (side === 'buy') {
        return base - i * spread;
      } else {
        return base + i * spread;
      }
    });
  }

  const bids = getPrices(99, 20, 'buy').map(price => ({
    price,
    quantity: getRandomQuantity(),
    size: getRandomSize(100)
  }));

  const asks = getPrices(101, 20, 'sell').map(price => ({
    price,
    quantity: getRandomQuantity(),
    size: getRandomSize(75)
  }));

  return { bids, asks };

}
