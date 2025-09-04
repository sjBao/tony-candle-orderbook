"use client"

import { UTCTimestamp } from 'lightweight-charts';
import React, { createContext, useContext, useEffect, useState } from 'react';


// --- Message Types ---
export interface CandleMsg {
  type: 'candle';
  candle: {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  };
}
export interface OrderBookMsg {
  type: 'orderbook';
  bids: Array<{ price: number; size: number; quantity: number }>;
  asks: Array<{ price: number; size: number; quantity: number }>;
}
export interface OrderResultMsg {
  type: 'order_result';
  orderId: number;
  status: string;
  order: {
    side: string;
    price: string;
    quantity: string;
    filled?: number;
    pricesFilled?: Array<{ price: number; size: number }>;
  };
}
export type MessageData = CandleMsg | OrderBookMsg | OrderResultMsg;
export type MessageHandler<T extends MessageData> = (data: T) => void;

// --- EventEmitter for message subscriptions ---
class MessageEmitter {
  listeners: { [type: string]: MessageHandler<MessageData>[] } = {};

  on<T extends MessageData>(type: T['type'], fn: MessageHandler<T>): () => void {
    if (!this.listeners[type]) this.listeners[type] = [];
    // TypeScript can't guarantee fn is MessageHandler<MessageData>, but we know it's safe
    this.listeners[type].push(fn as MessageHandler<MessageData>);
    return () => this.off(type, fn);
  }

  off<T extends MessageData>(type: T['type'], fn: MessageHandler<T>): void {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(f => f !== (fn as MessageHandler<MessageData>));
  }

  emit<T extends MessageData>(type: T['type'], data: T): void {
    if (!this.listeners[type]) return;
    this.listeners[type].forEach(fn => fn(data));
  }
}

const emitter = new MessageEmitter();

export const WebSocketContext = createContext<{ ws: WebSocket | null, emitter: MessageEmitter } | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new window.WebSocket('ws://134.122.15.203:4000');
    setWs(socket);
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type) {
          emitter.emit(msg.type, msg);
        }
      } catch {}
    };
    return () => {
      socket.close();
      setWs(null)
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ ws, emitter }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export function useWebSocketSubscription<T extends MessageData>(type: T['type'], handler: MessageHandler<T>) {
  const context = useContext(WebSocketContext);
  useEffect(() => {
    if (!context) return;
    const unsubscribe = context.emitter.on(type, handler);
    return unsubscribe;
  }, [context, type, handler]);
  return context?.ws;
}
