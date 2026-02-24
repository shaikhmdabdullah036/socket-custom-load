const WebSocket = require("ws");
const { streamIntervals } = require("../config");
const { generateTicker } = require("../generators/ticker");

function startTickerLoop(wss) {
  const tick = () => {
    const msg = JSON.stringify(generateTicker());
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!socket.clientData?.subscriptions.has("v2/ticker")) continue;
      socket.send(msg);
    }
    const { min, max } = streamIntervals["v2/ticker"];
    setTimeout(tick, Math.floor(Math.random() * (max - min)) + min);
  };
  tick();
}

module.exports = { startTickerLoop };
