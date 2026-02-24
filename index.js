const WebSocket = require("ws");
const { PORT, BASE_PRICE, log } = require("./config");
const { handleMessage } = require("./handlers");
const { startAllStreams } = require("./streams");

const wss = new WebSocket.Server({ port: PORT });

wss.on("connection", (socket) => {
  log("Client connected");

  socket.clientData = {
    subscriptions: new Set(),
    lastTradePrice: BASE_PRICE,
    candles: new Map(),
  };

  socket.on("message", (raw) => handleMessage(socket, raw));

  socket.on("close", () => {
    log("Client disconnected");
  });
});

startAllStreams(wss);

log(`Server started on ws://localhost:${PORT}`);
log("Channels: all_trades, candlestick_<res>, l2_orderbook, v2/ticker");
log('Send: {"type":"subscribe","channels":["all_trades"]} to start receiving data');
