const { SYMBOLS, randomPrice, formatPrice } = require("../config");

function generateOrderbook(symbol) {
  const s = SYMBOLS[symbol];
  const mid = randomPrice(symbol);
  const range = s.max - s.min;
  const step = range * 0.0002; // 0.02% of range per level

  const bids = Array.from({ length: 500 }, (_, i) => [
    formatPrice(symbol, mid - (i + 1) * step - Math.random() * step),
    (Math.random() * 5 + 0.1).toFixed(4),
  ]);
  const asks = Array.from({ length: 500 }, (_, i) => [
    formatPrice(symbol, mid + (i + 1) * step + Math.random() * step),
    (Math.random() * 5 + 0.1).toFixed(4),
  ]);
  return {
    type: "l2_orderbook",
    symbol,
    bids,
    asks,
    timestamp: Date.now() * 1000,
  };
}

module.exports = { generateOrderbook };
