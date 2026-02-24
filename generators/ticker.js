const { randomPrice, formatPrice } = require("../config");

function generateTicker(symbol) {
  const price = randomPrice(symbol);
  const markOffset = price * 0.0001; // 0.01% offset for mark price
  return {
    type: "v2/ticker",
    symbol,
    last_price: formatPrice(symbol, price),
    mark_price: formatPrice(symbol, price + (Math.random() * 2 - 1) * markOffset),
    volume_24h: Math.floor(Math.random() * 100000),
    turnover_24h: Math.floor(Math.random() * 5000000000),
    open_interest: Math.floor(Math.random() * 50000),
    funding_rate: (Math.random() * 0.001).toFixed(6),
    timestamp: Date.now() * 1000,
  };
}

module.exports = { generateTicker };
