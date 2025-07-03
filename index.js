const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 8080 });

const log = (message) => {
  console.log(`\x1b[36m📡 ${message}\x1b[0m`);
};

server.on("connection", (socket) => {
  log("Client connected");

  let lastTradePrice = 102900.0; // Stores last price from `all_trades`
  let currentCandle = {
    startTime: Date.now() * 1000, // Align to microseconds
    open: lastTradePrice,
    high: lastTradePrice,
    low: lastTradePrice,
    close: lastTradePrice,
    volume: 0,
  };

  const sendTradeAndCandleMessages = () => {
    if (socket.readyState === WebSocket.OPEN) {
      // Generate trade price and size
      lastTradePrice = (102900 + Math.random() * 200 - 100).toFixed(1); // Random price ±100
      const size = Math.floor(101 + Math.random() * 10 - 5); // Random size ±5
      const timestamp = Date.now() * 1000; // Microsecond timestamp

      // Update candle data
      currentCandle.high = Math.max(currentCandle.high, lastTradePrice);
      currentCandle.low = Math.min(currentCandle.low, lastTradePrice);
      currentCandle.close = lastTradePrice;
      currentCandle.volume += size;

      // Trade message
      const tradeMessage = JSON.stringify({
        buyer_role: "maker",
        price: lastTradePrice,
        product_id: 27,
        seller_role: "taker",
        size: size,
        symbol: "BTCUSD",
        timestamp: timestamp,
        type: "all_trades",
      });

      socket.send(tradeMessage);

      // Candlestick message (sent at the same frequency as trades)
      const candleMessage = JSON.stringify({
        candle_start_time: currentCandle.startTime,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close, // Matches last trade price
        resolution: "1m",
        sUID: "BTCUSD_#_BTCUSD_#_1",
        symbol: "BTCUSD",
        timestamp: timestamp,
        type: "candlestick_1m",
        volume: currentCandle.volume,
      });

      socket.send(candleMessage);

      // Reset candle every 1 minute
      if (timestamp - currentCandle.startTime >= 60 * 1000 * 1000) {
        currentCandle.startTime = timestamp;
        currentCandle.open = lastTradePrice;
        currentCandle.high = lastTradePrice;
        currentCandle.low = lastTradePrice;
        currentCandle.close = lastTradePrice;
        currentCandle.volume = 0;
      }
    }

    // Schedule next message at a random high frequency (10ms - 40ms)
    setTimeout(sendTradeAndCandleMessages, Math.floor(Math.random() * 10) + 10);
  };

  // Start streaming trade and candlestick data together
  sendTradeAndCandleMessages();

  socket.on("close", () => {
    log("Client disconnected");
  });
});

log("Server started on ws://localhost:8080");

// const WebSocket = require("ws");
// const wss = new WebSocket.Server({ port: 8080 });

// wss.on("connection", (ws) => {
//   console.log("Client connected");

//   ws.on("message", (message) => {
//     console.log("Received:", message);
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(message);
//       }
//     });
//   });

//   ws.on("close", () => console.log("Client disconnected"));
// });

// console.log("WebSocket Server running on ws://localhost:8080");
