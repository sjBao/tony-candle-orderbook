
import React from 'react';

export interface Order {
  price: number;
  quantity: number;
}

interface OrderBookProps {
  bids: Order[];
  asks: Order[];
}

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks }) => {
  return (
    <div className="flex flex-col gap-4 font-mono w-60">
      <div className='flex flex-col gap-3'>
        <div>
          <h2 className="text-xl font-semibold">Asks</h2>
          <div>
            {asks.map((ask, index) => (
              <div key={index} className="grid grid-cols-3">
                <span className='text-red-400'>{ask.price.toFixed(2)}</span>
                <span>{ask.quantity}</span>
                <span>{(ask.price * ask.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Bids</h2>
          <div>
            {bids.map((bid, index) => (
              <div key={index} className="grid grid-cols-3 gap-3">
                <span className='text-green-400'>{bid.price.toFixed(2)}</span>
                <span>{bid.quantity}</span>
                <span>{(bid.price * bid.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
