import { WebSocketServer } from 'ws';
import Redis from 'ioredis';

// Import the instance for now, connect via WS later
import { engine } from './marketData.mjs';



const PORT = 4000;
const wss = new WebSocketServer({ port: PORT });
const redis = new Redis();

const orderClientMap = new Map(); // orderId -> ws
const userOrdersMap = new Map(); // ws -> Set<orderId>

const BIDS_KEY = 'orderbook:bids';
const ASKS_KEY = 'orderbook:asks';


function parseOrders(data) {
  const orders = [];
  // Redis returns an array like [member, score, member, score, ...]
  for (let i = 0; i < data.length; i += 2) {
    const [_id, size, n] = data[i].split(':');
    orders.push({
      price: parseFloat(data[i + 1]),
      size: parseFloat(size),
      n: parseInt(n, 10),
    });
  }
  return orders;
}

const broadcast = async () => {
  try {
    const pipeline = redis.pipeline();

    // Get top 20 bids (highest price first)
    pipeline.zrevrange(BIDS_KEY, 0, 19, 'WITHSCORES');
    // Get top 20 asks (lowest price first)
    pipeline.zrange(ASKS_KEY, 0, 19, 'WITHSCORES');

    const [bidsResult, asksResult] = await pipeline.exec();

    // bidsResult[0] is for errors, bidsResult[1] is the data
    const bids = parseOrders(bidsResult[1]);
    const asks = parseOrders(asksResult[1]);

    const orderBookState = { bids, asks };
    const data = JSON.stringify(orderBookState);

    for (const client of wss.clients) {
      if (client.readyState === 1) { // 1 means OPEN
        client.send(data);
      }
    }
  } catch (err) {
    console.error("Error fetching/broadcasting order book:", err);
  }
};

wss.on('connection', (ws) => {
  console.log('Client connected');
  broadcast();

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'market_order') {
        const result = await engine.placeMarketOrder({ side: data.side, size: data.size, n: 1 });
        // result: { orderId, totalFilled, pricesFilled, status }
        ws.send(JSON.stringify({
          type: 'order_result',
          orderId: result.orderId,
          status: result.status,
          order: {
            orderId: result.orderId,
            side: data.side,
            price: result.pricesFilled.length > 0 ? result.pricesFilled[0].price : null,
            quantity: data.size,
            filled: result.totalFilled,
            pricesFilled: result.pricesFilled,
          }
        }));
        orderClientMap.set(result.orderId, ws);
        if (!userOrdersMap.has(ws)) userOrdersMap.set(ws, new Set());
        userOrdersMap.get(ws).add(result.orderId);
      }
      if (data.type === 'order_status') {
        const status = engine.getOrderStatus(data.orderId);
        ws.send(JSON.stringify({ type: 'order_status', orderId: data.orderId, status }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

    ws.on('close', () => {
      console.log('Client disconnected');
      const orderIds = userOrdersMap.get(ws);
      if (orderIds) {
        for (const orderId of orderIds) {
          orderClientMap.delete(orderId);
        }
        userOrdersMap.delete(ws);
      }
    });
});

engine.on('order_filled', ({ bidId, askId, filledBid, filledAsk }) => {
  if (filledBid) {
    const wsBid = orderClientMap.get(bidId);

    if (wsBid && wsBid.readyState === 1) {
      const status = engine.getOrderStatus(bidId);
      const order = engine.userOrders?.get?.(bidId) || {};
      wsBid.send(JSON.stringify({ type: 'order_result', orderId: bidId, status, order }));
      const orderIds = userOrdersMap.get(wsBid);
      if (orderIds) orderIds.delete(bidId);
    }
    orderClientMap.delete(bidId);
  }
  if (filledAsk) {
    const wsAsk = orderClientMap.get(askId);
    if (wsAsk && wsAsk.readyState === 1) {
      const status = engine.getOrderStatus(askId);
      const order = engine.userOrders?.get?.(askId) || {};
      wsAsk.send(JSON.stringify({ type: 'order_result', orderId: askId, status, order }));
      const orderIds = userOrdersMap.get(wsAsk);
      if (orderIds) orderIds.delete(askId);
    }
    orderClientMap.delete(askId);
  }
});

// Broadcast updates every 100ms
setInterval(broadcast, 250);
