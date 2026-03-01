const PORT = 8080;
const HTTP_PORT = 3000;

// Symbol definitions: price range, decimal precision, tick size for orderbook spread
const SYMBOLS = {
  BTCUSD: { min: 60000.0, max: 65000.0, precision: 1 },
  ETHUSD: { min: 1500.0, max: 2000.0, precision: 2 },
  XRPUSD: { min: 1.0, max: 2.0, precision: 4 },
  SOLUSD: { min: 70.0, max: 80.0, precision: 4 },
  PAXGUSD: { min: 5000.0, max: 5500.0, precision: 2 },
  DOGEUSD: { min: 0.0, max: 0.1, precision: 6 },
};

const VALID_SYMBOLS = new Set(Object.keys(SYMBOLS));

// Stream intervals in ms [min, max] — mutable at runtime via HTTP API
const streamIntervals = {
  all_trades: { min: 5, max: 20 },
  candlestick: { min: 5, max: 20 },
  l2_orderbook: { min: 10, max: 40 },
  "v2/ticker": { min: 10, max: 50 },
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

function isValidSymbol(name) {
  return VALID_SYMBOLS.has(name);
}

function parseCandleResolution(channel) {
  const match = channel.match(/^candlestick_(.+)$/);
  return match ? match[1] : null;
}

// Get a random price within the symbol's range
function randomPrice(symbol) {
  const s = SYMBOLS[symbol];
  return parseFloat(
    (s.min + Math.random() * (s.max - s.min)).toFixed(s.precision),
  );
}

// Format a number to the symbol's precision
function formatPrice(symbol, value) {
  return parseFloat(value).toFixed(SYMBOLS[symbol].precision);
}

const log = (message) => {
  console.log(`\x1b[36m📡 ${message}\x1b[0m`);
};

module.exports = {
  PORT,
  HTTP_PORT,
  SYMBOLS,
  VALID_SYMBOLS,
  RESOLUTION_MS,
  streamIntervals,
  isValidChannel,
  isValidSymbol,
  parseCandleResolution,
  randomPrice,
  formatPrice,
  log,
};
