const { isValidChannel, parseCandleResolution, log } = require("./config");

function handleMessage(socket, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  const { type, channels } = msg;
  if (!Array.isArray(channels)) return;

  if (type === "subscribe") {
    for (const ch of channels) {
      if (isValidChannel(ch)) {
        socket.clientData.subscriptions.add(ch);

        const resolution = parseCandleResolution(ch);
        if (resolution && !socket.clientData.candles.has(resolution)) {
          socket.clientData.candles.set(resolution, {
            startTime: Date.now() * 1000,
            open: socket.clientData.lastTradePrice,
            high: socket.clientData.lastTradePrice,
            low: socket.clientData.lastTradePrice,
            close: socket.clientData.lastTradePrice,
            volume: 0,
          });
        }
      }
    }
  } else if (type === "unsubscribe") {
    for (const ch of channels) {
      socket.clientData.subscriptions.delete(ch);
      const resolution = parseCandleResolution(ch);
      if (resolution) {
        socket.clientData.candles.delete(resolution);
      }
    }
  } else {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "subscriptions",
      channels: [...socket.clientData.subscriptions],
    })
  );

  log(
    `Client subscriptions: [${[...socket.clientData.subscriptions].join(", ")}]`
  );
}

module.exports = { handleMessage };
