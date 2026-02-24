const WebSocket = require("ws");
const { streamIntervals } = require("../config");
const { generateCandle } = require("../generators/candlestick");

function startCandleLoop(wss) {
  const tick = () => {
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!socket.clientData) continue;
      for (const [resolution, candleState] of socket.clientData.candles) {
        if (!socket.clientData.subscriptions.has(`candlestick_${resolution}`))
          continue;
        const candle = generateCandle(candleState, resolution);
        socket.send(JSON.stringify(candle));
      }
    }
    const { min, max } = streamIntervals.candlestick;
    setTimeout(tick, Math.floor(Math.random() * (max - min)) + min);
  };
  tick();
}

module.exports = { startCandleLoop };
