import Redis from 'ioredis';
const redis = new Redis();

const BIDS_KEY = 'orderbook:bids';
const ASKS_KEY = 'orderbook:asks';
const MAX_ORDERS = 50;
let orderCounter = 0;


async function initializeOrderBook() {
  console.log('Initializing order book in Redis...');
  // Clear any old data
  await redis.del(BIDS_KEY, ASKS_KEY);

  const bidPromises = [];
  const askPromises = [];

  for (let i = 0; i < MAX_ORDERS; i++) {
    // Member: unique_id:size
  const bidPrice = 100 - i - Math.random();
  const bidSize = Math.random() * 10;
  const bidN = Math.floor(Math.random() * 5) + 1; // random n between 1 and 5
  const bidMember = `${orderCounter++}:${bidSize.toFixed(4)}:${bidN}`;
  bidPromises.push(redis.zadd(BIDS_KEY, bidPrice, bidMember));

  const askPrice = 100 + i + Math.random();
  const askSize = Math.random() * 10;
  const askN = Math.floor(Math.random() * 5) + 1;
  const askMember = `${orderCounter++}:${askSize.toFixed(4)}:${askN}`;
  askPromises.push(redis.zadd(ASKS_KEY, askPrice, askMember));
  }

  await Promise.all([...bidPromises, ...askPromises]);
  console.log('Order book initialized.');
}

async function simulateUpdate() {
  const side = Math.random() > 0.5 ? BIDS_KEY : ASKS_KEY;
  const orders = await redis.zrange(side, 0, -1); // Get all orders for the chosen side

  if (orders.length > 0) {
    const orderToUpdate = orders[Math.floor(Math.random() * orders.length)];
  const [id, _oldSize, oldN] = orderToUpdate.split(':');

  const price = await redis.zscore(side, orderToUpdate);

  await redis.zrem(side, orderToUpdate);

  const newSize = Math.random() * 10;
  const newMember = `${id}:${newSize.toFixed(4)}:${oldN}`;
  await redis.zadd(side, price, newMember);
  }
}

async function main() {
  await initializeOrderBook();
  console.log('Starting market simulation...');
  setInterval(simulateUpdate, 50);
}

main();
