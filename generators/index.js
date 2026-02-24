const { generateTrade } = require("./all_trades");
const { generateCandle } = require("./candlestick");
const { generateOrderbook } = require("./l2_orderbook");
const { generateTicker } = require("./ticker");

module.exports = {
  generateTrade,
  generateCandle,
  generateOrderbook,
  generateTicker,
};
