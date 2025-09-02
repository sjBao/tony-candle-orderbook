"use client"

import React, { useState } from 'react';

export default function TradeWidget() {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [order, setOrder] = useState<{ side: string; price: string; quantity: string } | null>(null);

  const handleSubmit = () => {
    setOrder({ side, price, quantity });
    // Next step: send order to "backend"
  };

  return (
    <div className="px-4 rounded-lg w-70 text-gray-100">
      <h3 className="text-lg font-semibold mb-4">Trade BTC/USDC</h3>
      <div className="mb-3">
        <label className="block mb-1 text-sm">Price:</label>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
        />
      </div>
      <div className="mb-3">
        <label className="block mb-1 text-sm">Quantity:</label>
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
        />
      </div>
      <div className="mb-3 flex">
        <button
          className={`flex-1 py-2 rounded rounded-r-none font-bold ${side === 'buy' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={() => setSide('buy')}
        >
          Buy
        </button>
        <button
          className={`flex-1 py-2 rounded rounded-l-none font-bold ${side === 'sell' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={() => setSide('sell')}
        >
          Sell
        </button>
      </div>
      <button
        className="w-full py-2 rounded bg-blue-700 text-white font-bold disabled:opacity-50"
        onClick={handleSubmit}
        disabled={!price || !quantity}
      >
        Submit Order
      </button>
      {order && (
        <div className="mt-4 bg-gray-800 p-3 rounded">
          <strong className="block mb-2">Order Preview:</strong>
          <div>Side: {order.side}</div>
          <div>Price: {order.price}</div>
          <div>Quantity: {order.quantity}</div>
        </div>
      )}
    </div>
  );
}
