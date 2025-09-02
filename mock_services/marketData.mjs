import Redis from 'ioredis';
import EventEmitter from 'events';
const redis = new Redis();

const BIDS_KEY = 'orderbook:bids';
const ASKS_KEY = 'orderbook:asks';
let orderCounter = 0;

// Store user orders and their status
const userOrders = new Map(); // orderId -> { ...order, status }

async function initializeOrderBook() {
  console.log('Initializing order book in Redis...');
  await redis.del(BIDS_KEY, ASKS_KEY);
}

function randomOrder(side) {
  // For demo: price near 100, size 1-10
  const price = side === 'buy'
    ? 99 + Math.random() * 2
    : 101 - Math.random() * 2;
  const size = Math.floor(Math.random() * 10) + 1;
  const n = Math.floor(Math.random() * 5) + 1;
  const id = orderCounter++;
  return { id, price: parseFloat(price.toFixed(2)), size, n };
}

async function addOrderToBook(order, side) {
  const key = side === 'buy' ? BIDS_KEY : ASKS_KEY;
  const member = `${order.id}:${order.size}:${order.n}`;
  await redis.zadd(key, order.price, member);
}

// --- Matching Engine Logic ---
// This class is NOT part of the Redis order book itself. It is a mock matching engine for demonstration.
class MatchingEngine extends EventEmitter {
  async matchOrders() {
    // Get best bid and ask
    const bestBidArr = await redis.zrevrange(BIDS_KEY, 0, 0, 'WITHSCORES');
    const bestAskArr = await redis.zrange(ASKS_KEY, 0, 0, 'WITHSCORES');
    if (bestBidArr.length < 2 || bestAskArr.length < 2) return;

    const [bidMember, bidPrice] = bestBidArr;
    const [askMember, askPrice] = bestAskArr;
    const [bidId, bidSize, bidN] = bidMember.split(':');
    const [askId, askSize, askN] = askMember.split(':');

    if (parseFloat(bidPrice) >= parseFloat(askPrice)) {
      // Match found
      const tradeSize = Math.min(parseFloat(bidSize), parseFloat(askSize));


      let filledBid = false, filledAsk = false;
      if (tradeSize === parseFloat(bidSize)) {
        this.updateOrderStatus(parseInt(bidId), 'filled');
        filledBid = true;
      }
      if (tradeSize === parseFloat(askSize)) {
        this.updateOrderStatus(parseInt(askId), 'filled');
        filledAsk = true;
      }
      if (filledBid || filledAsk) {
        this.emit('order_filled', { bidId: parseInt(bidId), askId: parseInt(askId), filledBid, filledAsk });
      }

      // Update or remove bid
      if (tradeSize < parseFloat(bidSize)) {
        const newBidSize = (parseFloat(bidSize) - tradeSize).toFixed(4);
        await redis.zrem(BIDS_KEY, bidMember);
        await redis.zadd(BIDS_KEY, bidPrice, `${bidId}:${newBidSize}:${bidN}`);
      } else {
        await redis.zrem(BIDS_KEY, bidMember);
      }

      // Update or remove ask
      if (tradeSize < parseFloat(askSize)) {
        const newAskSize = (parseFloat(askSize) - tradeSize).toFixed(4);
        await redis.zrem(ASKS_KEY, askMember);
        await redis.zadd(ASKS_KEY, askPrice, `${askId}:${newAskSize}:${askN}`);
      } else {
        await redis.zrem(ASKS_KEY, askMember);
      }

      console.log(`${new Date().getTime()} - Trade executed: ${tradeSize} BTC @ ${askPrice} USDC`);
      this.emit('trade', { price: parseFloat(askPrice), size: tradeSize, timestamp: Date.now() });
    }
  }

  // Allow users to place orders via the matching engine
  async placeOrder({ side, price, size, n }) {
    const id = orderCounter++;
    const order = { id, price: parseFloat(price), size: parseFloat(size), n: parseInt(n), status: 'open', side };
    userOrders.set(id, order); // Track order status
    await addOrderToBook(order, side);
    // Optionally, try to match after placing
    await this.matchOrders();
    return order;
  }

  async placeMarketOrder({ side, size, n = 1 }) {
    // Fill as much as possible, cancel remainder
    let remaining = parseFloat(size);
    let totalFilled = 0;
    let orderId = null;
    let pricesFilled = [];
    while (remaining > 0) {
      let price;
      let available;
      if (side === 'buy') {
        const bestAskArr = await redis.zrange(ASKS_KEY, 0, 0, 'WITHSCORES');
        if (bestAskArr.length < 2) break;
        price = parseFloat(bestAskArr[1]);
        const [_id, availSize] = bestAskArr[0].split(':');
        available = parseFloat(availSize);
      } else {
        const bestBidArr = await redis.zrevrange(BIDS_KEY, 0, 0, 'WITHSCORES');
        if (bestBidArr.length < 2) break;
        price = parseFloat(bestBidArr[1]);
        const [_id, availSize] = bestBidArr[0].split(':');
        available = parseFloat(availSize);
      }
      const fillSize = Math.min(remaining, available);
      const order = await this.placeOrder({ side, price, size: fillSize, n });
      if (!orderId) orderId = order.id;
      pricesFilled.push({ price, size: fillSize });
      totalFilled += fillSize;
      remaining -= fillSize;
    }
    // If not fully filled, mark remainder as canceled and return 'partial' status
    let status = 'filled';
    if (remaining > 0 && orderId) {
      this.updateOrderStatus(orderId, 'canceled');
      status = totalFilled > 0 ? 'partial' : 'canceled';
    }
    if (!orderId) throw new Error('No liquidity for market order');
    return { orderId, totalFilled, pricesFilled, status };
  }

  // Update order status (called after matching)
  updateOrderStatus(orderId, newStatus) {
    const order = userOrders.get(orderId);
    if (order) {
      order.status = newStatus;
      userOrders.set(orderId, order);
    }
  }

  // Get order status by ID
  getOrderStatus(orderId) {
    return userOrders.get(orderId)?.status || null;
  }
}

export const engine = new MatchingEngine();

// --- CANDLESTICK AGGREGATION FOR DEMO PURPOSES ---
// In a real system, this should be a separate service for scalability and reliability.
// Here, we aggregate trades into candlesticks in the matching engine for real-time demo only.

const TRADE_INTERVAL = 60 * 1000; // 1 minute
let tradeBuffer = [];
let candles = [];

// Listen for trade events from the matching engine
engine.on('trade', (trade) => {
  tradeBuffer.push(trade);
});

// Aggregate trades into candlesticks every interval
setInterval(() => {
  if (tradeBuffer.length === 0) return;
  const open = tradeBuffer[0].price;
  const close = tradeBuffer[tradeBuffer.length - 1].price;
  const high = Math.max(...tradeBuffer.map(t => t.price));
  const low = Math.min(...tradeBuffer.map(t => t.price));
  const volume = tradeBuffer.reduce((sum, t) => sum + t.size, 0);
  const candle = {
    time: Date.now(),
    open, high, low, close, volume
  };
  candles.push(candle);
  tradeBuffer = [];
  // Optionally emit or serve candles to other services
}, TRADE_INTERVAL);

// --- END CANDLESTICK AGGREGATION ---

async function simulateEngine() {
  // Add a random order
  const side = Math.random() > 0.5 ? 'buy' : 'sell';
  const order = randomOrder(side);
  await addOrderToBook(order, side);
  // Try to match orders using the matching engine
  await engine.matchOrders();
}

async function main() {
  await initializeOrderBook();
  console.log('Starting matching engine simulation...');
  setInterval(simulateEngine, 200); // Add/match every 200ms
}

main();
