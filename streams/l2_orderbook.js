const WebSocket = require("ws");
const { generateOrderbook } = require("../generators/l2_orderbook");

function startOrderbookLoop(wss) {
  const tick = () => {
    const msg = JSON.stringify(generateOrderbook());
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!socket.clientData?.subscriptions.has("l2_orderbook")) continue;
      socket.send(msg);
    }
    setTimeout(tick, Math.floor(Math.random() * 50) + 50);
  };
  tick();
}

module.exports = { startOrderbookLoop };
