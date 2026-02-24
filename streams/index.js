const { startTradeLoop } = require("./all_trades");
const { startCandleLoop } = require("./candlestick");
const { startOrderbookLoop } = require("./l2_orderbook");
const { startTickerLoop } = require("./ticker");

function startAllStreams(wss) {
  startTradeLoop(wss);
  startCandleLoop(wss);
  startOrderbookLoop(wss);
  startTickerLoop(wss);
}

module.exports = { startAllStreams };
