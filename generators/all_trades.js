const { SYMBOLS, randomPrice, formatPrice } = require("../config");

function generateTrade(symbol) {
  const price = randomPrice(symbol);
  const size = Math.floor(101 + Math.random() * 10 - 5);
  return {
    buyer_role: Math.random() > 0.5 ? "maker" : "taker",
    price: formatPrice(symbol, price),
    product_id: 27,
    seller_role: Math.random() > 0.5 ? "maker" : "taker",
    size,
    symbol,
    timestamp: Date.now() * 1000,
    type: "all_trades",
  };
}

module.exports = { generateTrade };
