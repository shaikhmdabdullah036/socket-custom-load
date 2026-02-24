const { BASE_PRICE } = require("../config");

function generateTrade(symbol, lastPrice) {
  const price = ((lastPrice || BASE_PRICE) + Math.random() * 200 - 100).toFixed(1);
  const size = Math.floor(101 + Math.random() * 10 - 5);
  return {
    buyer_role: Math.random() > 0.5 ? "maker" : "taker",
    price,
    product_id: 27,
    seller_role: Math.random() > 0.5 ? "maker" : "taker",
    size,
    symbol,
    timestamp: Date.now() * 1000,
    type: "all_trades",
  };
}

module.exports = { generateTrade };
