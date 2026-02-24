const PORT = 8080;
const HTTP_PORT = 3000;
const BASE_PRICE = 102900.0;

// Stream intervals in ms [min, max] — mutable at runtime via HTTP API
const streamIntervals = {
  all_trades: { min: 10, max: 40 },
  candlestick: { min: 10, max: 40 },
  l2_orderbook: { min: 50, max: 100 },
  "v2/ticker": { min: 200, max: 500 },
};

const STATIC_CHANNELS = new Set(["all_trades", "l2_orderbook", "v2/ticker"]);
const CANDLESTICK_REGEX = /^candlestick_(1m|5m|15m|30m|1h|4h|1d|1w)$/;

const RESOLUTION_MS = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

function isValidChannel(name) {
  return STATIC_CHANNELS.has(name) || CANDLESTICK_REGEX.test(name);
}

function parseCandleResolution(channel) {
  const match = channel.match(/^candlestick_(.+)$/);
  return match ? match[1] : null;
}

const log = (message) => {
  console.log(`\x1b[36m📡 ${message}\x1b[0m`);
};

module.exports = {
  PORT,
  HTTP_PORT,
  BASE_PRICE,
  RESOLUTION_MS,
  streamIntervals,
  isValidChannel,
  parseCandleResolution,
  log,
};
