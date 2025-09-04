
# Tony Candle Orderbook — Real-Time Trading Terminal Demo

This project is a full-stack prototype of a real-time trading terminal, designed to demonstrate my ability to build and deploy modern WebSocket-based systems. It features:

- **Next.js frontend** for interactive trading UI and live charting
- **Node.js backend** with a mock matching engine and order book
- **WebSocket server** for real-time data streaming (order book, trades, candlesticks)
- **Redis** for fast in-memory order book storage

## System Architecture

**Frontend:**
- Built with React/Next.js
- Displays a candlestick chart (TradingView Lightweight Charts)
- Shows live order book and trade widget
- Connects to backend via a single shared WebSocket for all real-time updates

**Backend:**
- Node.js services:
  - `mock_services/marketData.mjs`: Matching engine, order book, trade/candlestick aggregation
  - `mock_services/marketWebsocket.mjs`: WebSocket server, broadcasts all market events
- Redis for order book state

**WebSocket System:**
- All real-time events (order book, trades, candlesticks, order status) are sent over a single WebSocket connection
- Frontend uses a custom React context and event emitter to handle multiple event types efficiently

## Deployment (DigitalOcean)

The prototype is deployed on a single DigitalOcean droplet (Ubuntu):

1. **Clone repo & install dependencies**
	```sh
	git clone https://github.com/sjBao/tony-candle-orderbook.git
	cd tony-candle-orderbook
	pnpm install
	```
2. **Install Redis**
	```sh
	apt-get update && apt-get install -y redis-server
	systemctl enable redis-server && systemctl start redis-server
	```
3. **Build and start Next.js app**
	```sh
	pnpm build
	pnpm start
	```
4. **Start backend services (using pm2 for reliability)**
	```sh
	node mock_services/marketData.mjs
	node start mock_services/marketWebsocket.mjs
	```

## Key Features

- Real-time candlestick chart updates via WebSocket
- Live order book and trade status tracking
- Support for market and limit orders, partial fills, and order lifecycle events
- Responsive UI (chart stacks below widgets on tablet/mobile)
- Robust, type-safe WebSocket event handling in React


**Live Demo:** 
- http://134.122.15.203:3000/

---

