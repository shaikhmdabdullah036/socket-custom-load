const { BASE_PRICE } = require("../config");

function generateOrderbook() {
  const mid = BASE_PRICE + Math.random() * 100 - 50;
  const bids = Array.from({ length: 10 }, (_, i) => [
    (mid - i * 0.5 - Math.random() * 0.5).toFixed(1),
    (Math.random() * 5 + 0.1).toFixed(4),
  ]);
  const asks = Array.from({ length: 10 }, (_, i) => [
    (mid + i * 0.5 + Math.random() * 0.5).toFixed(1),
    (Math.random() * 5 + 0.1).toFixed(4),
  ]);
  return {
    type: "l2_orderbook",
    symbol: "BTCUSD",
    bids,
    asks,
    timestamp: Date.now() * 1000,
  };
}

module.exports = { generateOrderbook };
