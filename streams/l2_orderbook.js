const WebSocket = require("ws");
const { streamIntervals } = require("../config");
const { generateOrderbook } = require("../generators/l2_orderbook");

function startOrderbookLoop(wss) {
  const tick = () => {
    const msg = JSON.stringify(generateOrderbook());
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!socket.clientData?.subscriptions.has("l2_orderbook")) continue;
      socket.send(msg);
    }
    const { min, max } = streamIntervals.l2_orderbook;
    setTimeout(tick, Math.floor(Math.random() * (max - min)) + min);
  };
  tick();
}

module.exports = { startOrderbookLoop };
