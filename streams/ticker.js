const WebSocket = require("ws");
const { streamIntervals } = require("../config");
const { generateTicker } = require("../generators/ticker");

function startTickerLoop(wss) {
  const tick = () => {
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const symbols = socket.clientData?.subscriptions.get("v2/ticker");
      if (!symbols) continue;
      for (const sym of symbols) {
        socket.send(JSON.stringify(generateTicker(sym)));
      }
    }
    const { min, max } = streamIntervals["v2/ticker"];
    setTimeout(tick, Math.floor(Math.random() * (max - min)) + min);
  };
  tick();
}

module.exports = { startTickerLoop };
