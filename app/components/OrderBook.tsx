"use client"

import React, { useMemo, useState } from 'react';
import { createFormatter } from '../lib/formatter';
import { useWebSocketSubscription, OrderBookMsg } from './WebSocketProvider';

export interface Order {
  price: number;
  quantity: number; // number of participants
  size: number
}

interface OrderBookProps {
  bids: Order[];
  asks: Order[];
}

interface PriceRowData {
  price: number;
  quantity: number;
  size: number;
  total: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks }) => {
  const [wsReady, setWsReady] = useState(false);
  const [orderbookData, setOrderbookData] = useState<{ bids: Order[]; asks: Order[] }>({ bids, asks });

  useWebSocketSubscription<OrderBookMsg>('orderbook', (msg) => {
    setOrderbookData({ bids: msg.bids || [], asks: msg.asks || [] });
    setWsReady(true);
  });

  const askRowData = useMemo(() => {
    return orderbookData?.asks.reduce<PriceRowData[]>((acc, order) => {
      const total = acc.length > 0 ? acc[acc.length - 1]?.total + order.size : order.size;
      acc.push({ ...order, total });
      return acc;
    }, []).toReversed()
  }, [orderbookData?.asks])

  const bidRowData = useMemo(() => {
    return orderbookData?.bids.reduce<PriceRowData[]>((acc, order) => {
      const total = acc.length > 0 ? acc[acc.length - 1]?.total + order.size : order.size;
      acc.push({ ...order, total });
      return acc;
    }, []);
  }, [orderbookData?.bids])

  const highestVolume = useMemo(() => {
    return Math.max(bidRowData[bidRowData.length - 1]?.total || 0, askRowData[0]?.total || 0)
  }, [bidRowData, askRowData])

  if (wsReady === false) {
    return <div className='w-90'>Loading...</div>;
  }
  return (
    <div className="flex flex-col gap-4 font-mono w-90">
      <div className='flex flex-col gap-3'>
        <div>
          <h2 className="text-xl font-semibold">Asks</h2>
          <div className='text-sm'>
            <div className="grid grid-cols-4 gap-5">
              <span className='font-semibold'>Price</span>
              <span className='font-semibold text-right w-fit'>Size</span>
              <span className='font-semibold text-right'>Total</span>
            </div>
            {askRowData.map((ask, index) => {
              return (
                <div key={index} className="grid grid-cols-4 gap-5">
                  <span className='text-red-400'>{ask.price.toFixed(2)}</span>
                  <span className='text-right w-fit'>{ask.size}</span>
                  <span className='text-right'>{createFormatter({ preset: "$0,0.00" })(ask.total)}</span>
                  <div className='border border-dashed border-gray-800'>
                    <div style={{ width: `${(ask.total / (highestVolume) * 100)}%` }} className='bg-red-400 h-full'></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Bids</h2>
          <div className='text-sm'>
            {bidRowData.map((bid, index) => (
              <div key={index} className="grid grid-cols-4 gap-5">
                <span className='text-green-400'>{bid.price.toFixed(2)}</span>
                <span className='text-right w-fit'>{bid.size}</span>
                <span className='text-right'>{createFormatter({ preset: "$0,0.00" })(bid.total)}</span>
                <div className='border border-dashed border-gray-800'>
                  <div style={{ width: `${(bid.total / (highestVolume) * 100)}%` }} className='bg-green-400 h-full'></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
