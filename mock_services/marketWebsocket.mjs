import { WebSocketServer } from 'ws';
import Redis from 'ioredis';


const PORT = 4000;
const wss = new WebSocketServer({ port: PORT });
const redis = new Redis();

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
  // Send the initial state immediately on connection
  broadcast();
  ws.on('close', () => console.log('Client disconnected'));
});

// Broadcast updates every 100ms
setInterval(broadcast, 250);
