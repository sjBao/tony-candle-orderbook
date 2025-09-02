"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';

// --- EventEmitter for message subscriptions ---
class MessageEmitter {
  listeners: { [type: string]: ((data: any) => void)[] } = {};

  on(type: string, fn: (data: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(fn);
    return () => this.off(type, fn);
  }

  off(type: string, fn: (data: any) => void) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(f => f !== fn);
  }

  emit(type: string, data: any) {
    if (!this.listeners[type]) return;
    this.listeners[type].forEach(fn => fn(data));
  }
}

const emitter = new MessageEmitter();

export const WebSocketContext = createContext<{ ws: WebSocket | null, emitter: MessageEmitter } | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new window.WebSocket('ws://localhost:4000');
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

export function useWebSocketSubscription(type: string, handler: (data: any) => void) {
  const context = useContext(WebSocketContext);
  useEffect(() => {
    if (!context) return;
    const unsubscribe = context.emitter.on(type, handler);
    return unsubscribe;
  }, [context, type, handler]);
  return context?.ws;
}
