"use client"

import { useEffect, useRef, useState } from 'react';
import OrderBook, { type Order } from './components/OrderBook';

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
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <OrderBook bids={orderbookData?.bids} asks={orderbookData?.asks} />
      </main>
    </div>
  );
}


function generateMockLeveledOrders(spread: number = 0.1): { bids: Order[]; asks: Order[] } {

  const getRandomQuantity = () => Math.floor(Math.random() * 10) + 1;
  const getRandomPrice = (base: number) => base + (Math.random() * spread - spread / 2);

  const bids = [
    { price: getRandomPrice(100), quantity: getRandomQuantity() },
    { price: getRandomPrice(99), quantity: getRandomQuantity() },
    { price: getRandomPrice(98), quantity: getRandomQuantity() },
  ];

  const asks = [
    { price: getRandomPrice(101), quantity: getRandomQuantity() },
    { price: getRandomPrice(102), quantity: getRandomQuantity() },
    { price: getRandomPrice(103), quantity: getRandomQuantity() },
  ];

  return { bids, asks };
}
