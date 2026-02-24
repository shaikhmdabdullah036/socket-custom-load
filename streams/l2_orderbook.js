const WebSocket = require("ws");
const { streamIntervals } = require("../config");
const { generateOrderbook } = require("../generators/l2_orderbook");

function startOrderbookLoop(wss) {
  const tick = () => {
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const symbols = socket.clientData?.subscriptions.get("l2_orderbook");
      if (!symbols) continue;
      for (const sym of symbols) {
        socket.send(JSON.stringify(generateOrderbook(sym)));
      }
    }
    const { min, max } = streamIntervals.l2_orderbook;
    setTimeout(tick, Math.floor(Math.random() * (max - min)) + min);
  };
  tick();
}

module.exports = { startOrderbookLoop };
