const { SYMBOLS, RESOLUTION_MS, formatPrice } = require("../config");

function generateCandle(symbol, candleState, resolution) {
  const s = SYMBOLS[symbol];
  const now = Date.now() * 1000;
  const resetInterval = RESOLUTION_MS[resolution] * 1000; // in microseconds

  if (now - candleState.startTime >= resetInterval) {
    candleState.startTime = now;
    candleState.open = candleState.close;
    candleState.high = candleState.close;
    candleState.low = candleState.close;
    candleState.volume = 0;
  }

  // Small tick relative to the symbol's range
  const range = s.max - s.min;
  const tick = range * 0.005; // 0.5% of range per tick
  const current = parseFloat(candleState.close);
  let newPrice = current + (Math.random() * 2 - 1) * tick;
  // Clamp within range
  newPrice = Math.max(s.min, Math.min(s.max, newPrice));

  const size = Math.floor(101 + Math.random() * 10 - 5);
  candleState.high = formatPrice(symbol, Math.max(parseFloat(candleState.high), newPrice));
  candleState.low = formatPrice(symbol, Math.min(parseFloat(candleState.low), newPrice));
  candleState.close = formatPrice(symbol, newPrice);
  candleState.volume += size;

  return {
    candle_start_time: candleState.startTime,
    close: candleState.close,
    high: candleState.high,
    low: candleState.low,
    open: candleState.open,
    resolution,
    sUID: `${symbol}_#_${symbol}_#_1`,
    symbol,
    timestamp: now,
    type: `candlestick_${resolution}`,
    volume: candleState.volume,
  };
}

module.exports = { generateCandle };
