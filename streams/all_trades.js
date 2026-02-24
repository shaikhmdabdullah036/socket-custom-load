const WebSocket = require("ws");
const { streamIntervals } = require("../config");
const { generateTrade } = require("../generators/all_trades");

function startTradeLoop(wss) {
  const tick = () => {
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const symbols = socket.clientData?.subscriptions.get("all_trades");
      if (!symbols) continue;
      for (const sym of symbols) {
        const trade = generateTrade(sym);
        socket.send(JSON.stringify(trade));
      }
    }
    const { min, max } = streamIntervals.all_trades;
    setTimeout(tick, Math.floor(Math.random() * (max - min)) + min);
  };
  tick();
}

module.exports = { startTradeLoop };
