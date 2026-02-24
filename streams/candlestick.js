const WebSocket = require("ws");
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
    setTimeout(tick, Math.floor(Math.random() * 30) + 10);
  };
  tick();
}

module.exports = { startCandleLoop };
