"use client"

import { useState, useContext } from 'react';
import { useWebSocketSubscription, WebSocketContext } from '../WebSocketProvider';

export default function TradeWidget() {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orders, setOrders] = useState<Record<number, {
    orderId: number;
    side: string;
    price: string;
    quantity: string;
    status: string;
    filled?: number;
    pricesFilled?: Array<{ price: number; size: number }>;
  }>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [bestPrice, setBestPrice] = useState<string>('');

  const wsContext = useContext(WebSocketContext);

  useWebSocketSubscription('order_result', (msg) => {
    let toastMsg = '';
    if (msg.status === "filled") {
      toastMsg = `Order filled! Order ID: ${msg.orderId}`;
    } else if (msg.status === "partial") {
      toastMsg = `Order partially filled! Order ID: ${msg.orderId}`;
    } else if (msg.status === "canceled") {
      toastMsg = `Order canceled (no liquidity)! Order ID: ${msg.orderId}`;
    }
    if (toastMsg) setToast(toastMsg);
    setTimeout(() => setToast(null), 4000);
    setOrders(prev => ({
      ...prev,
      [msg.orderId]: {
        orderId: msg.orderId,
        side: msg.order.side || prev[msg.orderId]?.side,
        price: msg.order.price || prev[msg.orderId]?.price,
        quantity: msg.order.quantity || prev[msg.orderId]?.quantity,
        status: msg.status,
        filled: msg.order.filled,
        pricesFilled: msg.order.pricesFilled,
      },
    }));
  });

  useWebSocketSubscription('orderbook', (msg) => {
    if (orderType === 'market') {
      if (side === 'buy' && msg.asks.length > 0) {
        setBestPrice(msg.asks[0].price.toString());
      } else if (side === 'sell' && msg.bids.length > 0) {
        setBestPrice(msg.bids[0].price.toString());
      }
    }
  });

  const handleSubmit = () => {
    if (!wsContext?.ws) return;
    if (orderType === 'market') {
      wsContext.ws.send(
        JSON.stringify({ type: 'market_order', side, size: quantity })
      );
    } else {
      wsContext.ws.send(
        JSON.stringify({ type: 'limit_order', side, size: quantity, price })
      );
    }
    setPrice('');
    setQuantity('');
  };

  return (
    <div className="px-4 rounded-lg w-70 text-gray-100">
      <h3 className="text-lg font-semibold mb-4">Trade BTC/USDC</h3>
      <div className="mb-3 flex justify-center gap-2">
        <button
          className={`px-4 py-1 rounded font-bold ${orderType === 'market' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={() => setOrderType('market')}
        >
          Market
        </button>
        <button
          className={`px-4 py-1 rounded font-bold ${orderType === 'limit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={() => setOrderType('limit')}
        >
          Limit
        </button>
      </div>
      <div className="mb-3">
        <label className="block mb-1 text-sm">Price:</label>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className={`w-full px-2 py-1 rounded bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${orderType === 'market' ? 'opacity-50 cursor-not-allowed' : ''}`}
          min="0"
          disabled={orderType === 'market'}
          placeholder={orderType === 'market' && bestPrice ? `Best ${side === 'buy' ? 'Ask' : 'Bid'}: ${bestPrice}` : ''}
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
        disabled={orderType === 'limit' ? !price || !quantity : !quantity}
      >
        Submit Order
      </button>
      {Object.keys(orders).length > 0 && (
        <div className="mt-4 bg-gray-800 p-3 rounded">
          <strong className="block mb-2">Order Preview:</strong>
          <ul className="space-y-2">
            {Object.values(orders).map(order => (
              <li
                key={order.orderId}
                className={`p-2 rounded flex flex-col ${order.status === 'filled' ? 'bg-gray-700 text-gray-400' : order.status === 'partial' ? 'bg-yellow-700 text-yellow-100' : order.status === 'canceled' ? 'bg-red-700 text-red-100' : 'bg-gray-900 text-gray-100'}`}
              >
                <div className="flex justify-between">
                  <span className="font-mono text-xs">ID: {order.orderId}</span>
                  <span className="text-xs font-bold uppercase">{order.status}</span>
                </div>
                <div>Side: {order.side}</div>
                <div>Price: {order.price}</div>
                <div>Quantity: {order.quantity}</div>
                {order.status === 'partial' && (
                  <div className="text-xs mt-1">Filled: {order.filled} (across {order.pricesFilled?.length} price levels)</div>
                )}
                {order.status === 'canceled' && (
                  <div className="text-xs mt-1">No liquidity for requested size</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
