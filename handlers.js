const { SYMBOLS, isValidChannel, isValidSymbol, parseCandleResolution, formatPrice, log } = require("./config");

function handleMessage(socket, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  const { type, payload } = msg;
  if (!payload || !Array.isArray(payload.channels)) return;

  if (type === "subscribe") {
    for (const ch of payload.channels) {
      const { name, symbols } = ch;
      if (!name || !isValidChannel(name) || !Array.isArray(symbols)) continue;

      if (!socket.clientData.subscriptions.has(name)) {
        socket.clientData.subscriptions.set(name, new Set());
      }
      const symbolSet = socket.clientData.subscriptions.get(name);
      for (const sym of symbols) {
        if (!isValidSymbol(sym)) continue;
        symbolSet.add(sym);
      }

      // Initialize candle state for new candlestick subscriptions
      const resolution = parseCandleResolution(name);
      if (resolution) {
        for (const sym of symbols) {
          if (!isValidSymbol(sym)) continue;
          const key = `${resolution}:${sym}`;
          if (!socket.clientData.candles.has(key)) {
            const s = SYMBOLS[sym];
            const midPrice = formatPrice(sym, (s.min + s.max) / 2);
            socket.clientData.candles.set(key, {
              startTime: Date.now() * 1000,
              open: midPrice,
              high: midPrice,
              low: midPrice,
              close: midPrice,
              volume: 0,
            });
          }
        }
      }
    }
  } else if (type === "unsubscribe") {
    for (const ch of payload.channels) {
      const { name, symbols } = ch;
      if (!name) continue;

      if (!symbols || symbols.length === 0) {
        // No symbols passed — unsubscribe entire channel
        socket.clientData.subscriptions.delete(name);
        const resolution = parseCandleResolution(name);
        if (resolution) {
          for (const key of socket.clientData.candles.keys()) {
            if (key.startsWith(`${resolution}:`)) {
              socket.clientData.candles.delete(key);
            }
          }
        }
      } else {
        // Remove specific symbols
        const symbolSet = socket.clientData.subscriptions.get(name);
        if (symbolSet) {
          for (const sym of symbols) {
            symbolSet.delete(sym);
            const resolution = parseCandleResolution(name);
            if (resolution) {
              socket.clientData.candles.delete(`${resolution}:${sym}`);
            }
          }
          // If no symbols left, remove the channel entirely
          if (symbolSet.size === 0) {
            socket.clientData.subscriptions.delete(name);
          }
        }
      }
    }
  } else {
    return;
  }

  // Build ack in the same format
  const ackChannels = [];
  for (const [name, symbols] of socket.clientData.subscriptions) {
    ackChannels.push({ name, symbols: [...symbols] });
  }

  socket.send(
    JSON.stringify({
      type: "subscriptions",
      payload: { channels: ackChannels },
    })
  );

  log(`Client subscriptions: ${JSON.stringify(ackChannels)}`);
}

module.exports = { handleMessage };
