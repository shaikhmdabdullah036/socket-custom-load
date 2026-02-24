const WebSocket = require("ws");
const { streamIntervals, parseCandleResolution } = require("../config");
const { generateCandle } = require("../generators/candlestick");

function startCandleLoop(wss) {
  const tick = () => {
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!socket.clientData) continue;
      for (const [channel, symbols] of socket.clientData.subscriptions) {
        const resolution = parseCandleResolution(channel);
        if (!resolution) continue;
        for (const sym of symbols) {
          const key = `${resolution}:${sym}`;
          const candleState = socket.clientData.candles.get(key);
          if (!candleState) continue;
          const candle = generateCandle(sym, candleState, resolution);
          socket.send(JSON.stringify(candle));
        }
      }
    }
    const { min, max } = streamIntervals.candlestick;
    setTimeout(tick, Math.floor(Math.random() * (max - min)) + min);
  };
  tick();
}

module.exports = { startCandleLoop };
