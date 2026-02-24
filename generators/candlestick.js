const { RESOLUTION_MS } = require("../config");

function generateCandle(candleState, resolution) {
  const price = candleState.close;
  const now = Date.now() * 1000;
  const resetInterval = RESOLUTION_MS[resolution] * 1000; // in microseconds

  if (now - candleState.startTime >= resetInterval) {
    candleState.startTime = now;
    candleState.open = price;
    candleState.high = price;
    candleState.low = price;
    candleState.volume = 0;
  }

  const newPrice = (parseFloat(price) + Math.random() * 20 - 10).toFixed(1);
  const size = Math.floor(101 + Math.random() * 10 - 5);
  candleState.high = Math.max(candleState.high, parseFloat(newPrice)).toFixed(1);
  candleState.low = Math.min(candleState.low, parseFloat(newPrice)).toFixed(1);
  candleState.close = newPrice;
  candleState.volume += size;

  return {
    candle_start_time: candleState.startTime,
    close: newPrice,
    high: candleState.high,
    low: candleState.low,
    open: candleState.open,
    resolution,
    sUID: `BTCUSD_#_BTCUSD_#_1`,
    symbol: "BTCUSD",
    timestamp: now,
    type: `candlestick_${resolution}`,
    volume: candleState.volume,
  };
}

module.exports = { generateCandle };
