# Socket Stress Test Server

A WebSocket server for stress testing crypto trading frontends. Streams realistic market data at configurable high frequencies.

## Setup

```bash
bun install
bun start
```

Or with Docker:

```bash
docker compose up
```

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 8080 | WebSocket | Market data streams |
| 3000 | HTTP | Runtime config API |

## Supported Channels

| Channel | Description | Default Interval |
|---------|-------------|-----------------|
| `all_trades` | Trade executions | 5-20ms |
| `candlestick_<res>` | OHLCV candles (`1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`) | 5-20ms |
| `l2_orderbook` | 500-level bid/ask orderbook | 10-40ms |
| `v2/ticker` | Price ticker with mark, volume, funding | 10-50ms |

## Supported Symbols

| Symbol | Price Range | Precision |
|--------|------------|-----------|
| BTCUSD | 60000.0 - 65000.0 | 1 dp |
| ETHUSD | 1500.00 - 2000.00 | 2 dp |
| XRPUSD | 1.0000 - 2.0000 | 4 dp |
| SOLUSD | 70.0000 - 80.0000 | 4 dp |
| PAXGUSD | 5000.00 - 5500.00 | 2 dp |
| DOGEUSD | 0.000000 - 0.100000 | 6 dp |

## Subscribe / Unsubscribe

Connect to `ws://localhost:8080` and send JSON messages. No data streams until you subscribe.

### Subscribe

```json
{
  "type": "subscribe",
  "payload": {
    "channels": [
      { "name": "all_trades", "symbols": ["BTCUSD", "ETHUSD"] },
      { "name": "candlestick_1m", "symbols": ["BTCUSD"] },
      { "name": "l2_orderbook", "symbols": ["BTCUSD"] },
      { "name": "v2/ticker", "symbols": ["SOLUSD", "DOGEUSD"] }
    ]
  }
}
```

### Unsubscribe specific symbols

```json
{
  "type": "unsubscribe",
  "payload": {
    "channels": [
      { "name": "all_trades", "symbols": ["ETHUSD"] }
    ]
  }
}
```

### Unsubscribe entire channel (omit symbols)

```json
{
  "type": "unsubscribe",
  "payload": {
    "channels": [
      { "name": "l2_orderbook" }
    ]
  }
}
```

### Ack response

After every subscribe/unsubscribe, the server responds with the current state:

```json
{
  "type": "subscriptions",
  "payload": {
    "channels": [
      { "name": "all_trades", "symbols": ["BTCUSD"] },
      { "name": "v2/ticker", "symbols": ["SOLUSD", "DOGEUSD"] }
    ]
  }
}
```

## Runtime Config API

Modify streaming intervals without restarting the server.

### Get current intervals

```bash
curl http://localhost:3000/intervals
```

### Update intervals

```bash
# Crank up trades to max stress
curl -X POST http://localhost:3000/intervals \
  -H "Content-Type: application/json" \
  -d '{"all_trades": {"min": 1, "max": 5}}'

# Update multiple channels
curl -X POST http://localhost:3000/intervals \
  -H "Content-Type: application/json" \
  -d '{"all_trades": {"min": 1, "max": 5}, "l2_orderbook": {"min": 10, "max": 20}}'
```

## Project Structure

```
socket-test/
├── index.js              Server setup, connection handler, HTTP API
├── config.js             Symbols, channels, intervals, validation helpers
├── handlers.js           Subscribe/unsubscribe message handler
├── generators/
│   ├── index.js          Barrel export
│   ├── all_trades.js     Trade data generator
│   ├── candlestick.js    OHLCV candle generator
│   ├── l2_orderbook.js   Orderbook generator
│   └── ticker.js         Ticker generator
├── streams/
│   ├── index.js          Barrel export + startAllStreams()
│   ├── all_trades.js     Trade stream loop
│   ├── candlestick.js    Candle stream loop
│   ├── l2_orderbook.js   Orderbook stream loop
│   └── ticker.js         Ticker stream loop
├── Dockerfile
└── docker-compose.yml
```
