const http = require("http");
const WebSocket = require("ws");
const { PORT, HTTP_PORT, streamIntervals, log } = require("./config");
const { handleMessage } = require("./handlers");
const { startAllStreams } = require("./streams");

// --- WebSocket Server ---

const wss = new WebSocket.Server({ port: PORT });

wss.on("connection", (socket) => {
  log("Client connected");

  socket.clientData = {
    subscriptions: new Map(), // Map<channelName, Set<symbol>>
    candles: new Map(),       // Map<"resolution:symbol", candleState>
  };

  socket.on("message", (raw) => handleMessage(socket, raw));

  socket.on("close", () => {
    log("Client disconnected");
  });
});

startAllStreams(wss);

// --- HTTP API for runtime config ---

const httpServer = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  // GET /intervals — return current intervals
  if (req.method === "GET" && req.url === "/intervals") {
    res.writeHead(200);
    res.end(JSON.stringify(streamIntervals, null, 2));
    return;
  }

  // POST /intervals — update intervals
  if (req.method === "POST" && req.url === "/intervals") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const updates = JSON.parse(body);

        for (const [channel, interval] of Object.entries(updates)) {
          if (!streamIntervals[channel]) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Unknown channel: ${channel}` }));
            return;
          }
          if (typeof interval.min !== "number" || typeof interval.max !== "number") {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `min and max must be numbers for ${channel}` }));
            return;
          }
          if (interval.min < 1 || interval.max < interval.min) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Invalid range for ${channel}: min must be >= 1 and max >= min` }));
            return;
          }
        }

        for (const [channel, interval] of Object.entries(updates)) {
          streamIntervals[channel].min = interval.min;
          streamIntervals[channel].max = interval.max;
          log(`Updated ${channel} interval: ${interval.min}-${interval.max}ms`);
        }

        res.writeHead(200);
        res.end(JSON.stringify(streamIntervals, null, 2));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(HTTP_PORT);

log(`Server started on ws://localhost:${PORT}`);
log(`HTTP API on http://localhost:${HTTP_PORT}/intervals`);
log("Channels: all_trades, candlestick_<res>, l2_orderbook, v2/ticker");
log('Send: {"type":"subscribe","payload":{"channels":[{"name":"all_trades","symbols":["BTCUSD"]}]}}');
