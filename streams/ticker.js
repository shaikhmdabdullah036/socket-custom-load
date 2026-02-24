const WebSocket = require("ws");
const { generateTicker } = require("../generators/ticker");

function startTickerLoop(wss) {
  const tick = () => {
    const msg = JSON.stringify(generateTicker());
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!socket.clientData?.subscriptions.has("v2/ticker")) continue;
      socket.send(msg);
    }
    setTimeout(tick, Math.floor(Math.random() * 300) + 200);
  };
  tick();
}

module.exports = { startTickerLoop };
