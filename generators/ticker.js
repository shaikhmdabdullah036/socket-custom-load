const { BASE_PRICE } = require("../config");

function generateTicker() {
  const price = (BASE_PRICE + Math.random() * 200 - 100).toFixed(1);
  return {
    type: "v2/ticker",
    symbol: "BTCUSD",
    last_price: price,
    mark_price: (parseFloat(price) + Math.random() * 2 - 1).toFixed(1),
    volume_24h: Math.floor(Math.random() * 100000),
    turnover_24h: Math.floor(Math.random() * 5000000000),
    open_interest: Math.floor(Math.random() * 50000),
    funding_rate: (Math.random() * 0.001).toFixed(6),
    timestamp: Date.now() * 1000,
  };
}

module.exports = { generateTicker };
