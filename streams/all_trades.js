const WebSocket = require("ws");
const { generateTrade } = require("../generators/all_trades");

function startTradeLoop(wss) {
  const tick = () => {
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!socket.clientData?.subscriptions.has("all_trades")) continue;
      const trade = generateTrade(socket.clientData.lastTradePrice);
      socket.clientData.lastTradePrice = parseFloat(trade.price);
      socket.send(JSON.stringify(trade));
    }
    setTimeout(tick, Math.floor(Math.random() * 30) + 10);
  };
  tick();
}

module.exports = { startTradeLoop };
