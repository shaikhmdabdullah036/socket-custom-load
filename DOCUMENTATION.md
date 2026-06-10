# Project Documentation — socket-custom-load

## What This Project Is

This is a **simulated real-time crypto market data platform**. It has two parts:

1. **Server** (root of the repo) — a WebSocket server written in Node.js/Bun that streams fake but realistically-shaped crypto market data (trades, orderbook, candlesticks, ticker) to any connected client.
2. **Client** (`/client`) — a React + TypeScript frontend that connects to that WebSocket and renders the live data as a crypto trading dashboard.

The core idea: instead of connecting to a real exchange (Binance, Delta, etc.) with API keys, rate limits, and live funds, you run this server locally and get an always-on firehose of realistic market data to develop and test against. It mimics the WebSocket protocol of real perpetual futures exchanges — the message shapes match what you'd see from something like Delta Exchange.

**Supported symbols:** BTCUSD, ETHUSD, SOLUSD, XRPUSD, DOGEUSD, PAXGUSD

**Supported data streams:** live trades, L2 orderbook (500 levels), candlesticks (8 resolutions), and full ticker.

---

## Repository Structure

```
socket-custom-load/
├── index.js              # Server entry point — starts WS + HTTP servers
├── config.js             # All shared constants: ports, symbols, intervals, helpers
├── handlers.js           # WebSocket message handler (subscribe / unsubscribe logic)
├── streams/              # One file per channel — the broadcast loops
│   ├── index.js          # Starts all four loops
│   ├── all_trades.js
│   ├── candlestick.js
│   ├── l2_orderbook.js
│   └── ticker.js
├── generators/           # Pure functions that produce one message per call
│   ├── index.js
│   ├── all_trades.js
│   ├── candlestick.js
│   ├── l2_orderbook.js
│   └── ticker.js
├── package.json          # Server package (only dependency: ws)
├── bun.lockb             # Bun lockfile
├── Dockerfile            # Docker image definition
├── docker-compose.yml    # Single-service compose file
├── .dockerignore
├── .gitignore
└── client/               # Frontend app
    ├── index.html                          # Inline script applies saved/preferred theme pre-paint
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── src/
        ├── main.tsx                        # React DOM mount
        ├── App.tsx                         # Root component — topbar + routing between list/detail
        ├── App.css                         # CSS custom properties (light + dark theme tokens)
        ├── types/index.ts                  # All shared TypeScript interfaces
        ├── services/
        │   ├── WebSocketService.ts         # Singleton WS client with auto-reconnect
        │   └── intervalsApi.ts             # GET/POST http://localhost:3000/intervals
        ├── store/favorites.ts              # localStorage favorites helper
        ├── hooks/
        │   ├── useConnectionStatus.ts
        │   ├── useTicker.ts                # throttled via useThrottledFlush
        │   ├── useOrderbook.ts             # throttled via useThrottledFlush
        │   ├── useTrades.ts                # throttled + deduped via useThrottledFlush
        │   ├── useThrottledFlush.ts        # shared setTimeout-based leading+trailing throttle
        │   └── useTheme.ts                 # light/dark theme, persisted to localStorage
        ├── utils/
        │   └── subscriptionKey.ts          # "channel:symbol" key helpers
        └── components/
            ├── ConnectionStatus/           # Banner shown when WS is down
            ├── ThemeToggle/                # Light/dark mode switch (topbar)
            ├── StressControl/              # Normal/Fast/Extreme update-speed presets (topbar)
            ├── ProductList/               # Markets list with search + tabs
            ├── ProductDetail/             # Full detail view (stats + orderbook + trades)
            │   └── DetailTicker.tsx        # Memoized hero price/stats, own useTicker(symbol, 200)
            ├── Orderbook/                 # L2 orderbook with depth bars
            └── Trades/                   # Recent trades feed
```

---

## Server — How It Works

### Entry Point (`index.js`)

Starts two servers:

- **WebSocket server** on port `8080` — clients connect here to receive market data.
- **HTTP server** on port `3000` — a small REST API for tuning stream speeds at runtime.

Each connected WebSocket client gets a `clientData` object attached to its socket:
- `subscriptions` — a `Map<channelName, Set<symbol>>` tracking what the client has subscribed to.
- `candles` — a `Map<"resolution:symbol", candleState>` storing the running candle for each subscribed candlestick channel.

### Config (`config.js`)

Single source of truth for everything shared:

| Export | What it is |
|--------|-----------|
| `PORT` | WebSocket port — `8080` |
| `HTTP_PORT` | HTTP API port — `3000` |
| `SYMBOLS` | Price range and decimal precision per symbol |
| `VALID_SYMBOLS` | Set of all valid symbol strings |
| `streamIntervals` | Mutable object holding `{ min, max }` ms for each channel's broadcast loop |
| `STATIC_CHANNELS` | `all_trades`, `l2_orderbook`, `v2/ticker` |
| `CANDLESTICK_REGEX` | Matches `candlestick_1m`, `candlestick_5m`, ... `candlestick_1w` |
| `RESOLUTION_MS` | Maps resolution strings to milliseconds |
| `isValidChannel(name)` | Validates channel name against statics + regex |
| `isValidSymbol(name)` | Checks against `VALID_SYMBOLS` |
| `parseCandleResolution(channel)` | Extracts `"1m"` from `"candlestick_1m"` |
| `randomPrice(symbol)` | Returns a random price within that symbol's configured range |
| `formatPrice(symbol, value)` | Rounds to the symbol's decimal precision |
| `log(message)` | Console log with cyan color + 📡 prefix |

### Message Handler (`handlers.js`)

Handles two incoming message types from clients:

**`subscribe`**
```json
{
  "type": "subscribe",
  "payload": {
    "channels": [{ "name": "all_trades", "symbols": ["BTCUSD", "ETHUSD"] }]
  }
}
```
- Adds symbols to the client's subscription map.
- For candlestick channels, initializes `candleState` (open/high/low/close/volume) at the midpoint of the symbol's price range.
- Sends back a `subscriptions` ack listing everything the client is now subscribed to.

**`unsubscribe`**
```json
{
  "type": "unsubscribe",
  "payload": {
    "channels": [{ "name": "all_trades", "symbols": ["BTCUSD"] }]
  }
}
```
- Removes specific symbols. If no symbols are passed, removes the entire channel.
- Cleans up candle state for any removed candlestick subscriptions.
- Sends back the updated `subscriptions` ack.

Invalid JSON, unknown channels, and unknown symbols are silently skipped.

### Streams (`streams/`)

Each stream is a self-scheduling loop using `setTimeout` (not `setInterval`). The delay between ticks is chosen randomly from the channel's `[min, max]` interval in `streamIntervals`. This gives a jittery, natural feel instead of a mechanical heartbeat.

On each tick, the loop walks every connected client, checks if they're subscribed to that channel and symbol, generates a message, and sends it. The four loops run completely independently.

| Stream | Channel name | Default interval | What it sends |
|--------|-------------|-----------------|---------------|
| Trades | `all_trades` | 5–20 ms | One trade per symbol per tick |
| Candles | `candlestick_<res>` | 5–20 ms | Running OHLCV update for each sub |
| Orderbook | `l2_orderbook` | 10–40 ms | Full snapshot — 500 bid + 500 ask levels |
| Ticker | `v2/ticker` | 10–50 ms | Full ticker object per symbol |

### Generators (`generators/`)

Pure functions — no side effects except for `generateCandle`, which mutates the `candleState` object passed in (updates high/low/close/volume in place, resets on period boundary).

**`generateTrade(symbol)`** — random price within range, random size ~101, random buyer/seller roles.

**`generateCandle(symbol, candleState, resolution)`** — moves the close price by ±0.5% of the symbol's range per tick, clamps within min/max, tracks high/low/volume, resets to a new candle when the resolution period elapses.

**`generateOrderbook(symbol)`** — generates 500 bid levels below mid and 500 ask levels above mid, spaced 0.02% of range apart with random jitter on each level.

**`generateTicker(symbol)`** — generates a full perpetual futures ticker with mark price, spot price, funding rate, OI, 24h stats, price band, quotes, etc. All values are randomized within realistic bounds.

### HTTP API

The HTTP server on port `3000` lets you change stream speeds without restarting.

**GET `/intervals`** — returns current intervals for all channels:
```json
{
  "all_trades":  { "min": 5,  "max": 20 },
  "candlestick": { "min": 5,  "max": 20 },
  "l2_orderbook":{ "min": 10, "max": 40 },
  "v2/ticker":   { "min": 10, "max": 50 }
}
```

**POST `/intervals`** — update one or more channels:
```bash
curl -X POST http://localhost:3000/intervals \
  -H "Content-Type: application/json" \
  -d '{"all_trades": {"min": 100, "max": 500}}'
```
Validation rules: `min >= 1`, `max >= min`, channel must exist. The change takes effect on the next tick.

**CORS**: every response includes `Access-Control-Allow-Origin: *` (plus `Methods`/`Headers`), and `OPTIONS` preflight requests get a `204`. This lets the client (running on `http://localhost:5173`) call `/intervals` directly from the browser — used by the in-app stress test control.

---

## Server — Dependencies

The server has **exactly one runtime dependency**:

| Package | Version | Why |
|---------|---------|-----|
| `ws` | `^8.18.0` | WebSocket server implementation for Node.js. The native `http` module handles the REST API — no Express needed. |

Everything else (`http`, `setTimeout`, `JSON`, `Map`, `Set`) is built into Node.js / Bun.

---

## Client — How It Works

### Tech Stack

| Tool | Version | Role |
|------|---------|------|
| React | `^18.2.0` | UI framework |
| React DOM | `^18.2.0` | DOM renderer |
| TypeScript | `^5.2.0` | Type safety |
| Vite | `^5.0.0` | Dev server + bundler |
| `@vitejs/plugin-react` | `^4.2.0` | Babel-based Fast Refresh for Vite |

**No UI component library. No state management library. No charting library.** The entire UI is built with plain React hooks and hand-written CSS. This is intentional — the client is a minimal demonstration UI for the WebSocket server, not a production app.

### Why Vite?

Vite is used because it's the standard modern bundler for React projects in 2024+. It uses native ES modules in development (no bundle step → near-instant HMR) and Rollup under the hood for production builds. The config (`vite.config.ts`) is minimal: just the React plugin and a fixed dev port of `5173`.

The build process is: `tsc` (type-check only, `noEmit: true`) → `vite build` (Rollup bundles everything into `dist/`). The compiled output lands in `client/dist/`.

### WebSocketService (`src/services/WebSocketService.ts`)

A singleton class that manages the single WebSocket connection to `ws://localhost:8080`. Key design decisions:

- **Subscription deduplication**: Handlers are tracked in a `Map<"channel:symbol", Set<handler>>`. A subscribe message is only sent to the server when the first handler for a key registers. An unsubscribe is sent when the last handler unregisters.
- **Auto-reconnect with exponential backoff**: On close, schedules a reconnect starting at 1 second, doubling each attempt up to 30 seconds.
- **Re-subscribe on reconnect**: When the connection re-opens, all currently registered handlers are re-subscribed automatically.
- **Status notifications**: Components can listen to connection status changes (`connected` / `disconnected` / `reconnecting`) via `onStatusChange`.

The singleton is created and connected at module load time:
```ts
export const wsService = new WebSocketService('ws://localhost:8080');
wsService.connect();
```

### Hooks

Each hook encapsulates one subscription lifecycle:

**`useTicker(symbol, minIntervalMs?)`** — subscribes to `v2/ticker` for the symbol. Normalizes the raw server message into a clean `TickerData` object (e.g., converts `ltp_change_24h` ratio to a `change_24h` percentage). The latest message is buffered in a ref and flushed via `useThrottledFlush` (default 150ms ≈ 6.7/sec; `DetailTicker` passes 200ms ≈ 5/sec), so high-frequency ticks (down to 1 ms under the Extreme stress preset) don't each trigger a separate re-render.

**`useOrderbook(symbol)`** — subscribes to `l2_orderbook`, builds a 12-level book with cumulative totals from the 500-level snapshot, and flushes via `useThrottledFlush` at 100ms (≈10/sec) regardless of how fast the server streams.

**`useTrades(symbol)`** — subscribes to `all_trades`. Determines buy/sell side from `buyer_role === 'taker'`. Incoming trades are pushed into a buffer (capped at 50, deduped by trade id) and flushed via `useThrottledFlush` at 100ms as a single batched state update, then sliced to the displayed 30.

**`useThrottledFlush(flush, minIntervalMs?)`** — shared `setTimeout`-based leading+trailing throttle used by the three hooks above. Runs `flush` immediately if idle, otherwise schedules a single trailing call so updates can't pile up regardless of message rate.

**`useConnectionStatus()`** — listens to `wsService.onStatusChange` and returns the current status string.

**`useTheme()`** — reads the saved theme from `localStorage['crypto_theme']` (falling back to the OS `prefers-color-scheme`), applies it as `data-theme` on `<html>`, and returns `{ theme, toggleTheme }`.

### Components

**`App.tsx`** — manages one piece of state: `selected` (the currently viewed symbol or null). Renders a `topbar` (with `StressControl` and `ThemeToggle`) plus either `ProductList` or `ProductDetail` based on `selected`.

**`ConnectionStatus`** — renders a fixed banner at the top of the page only when disconnected or reconnecting. Returns `null` when connected (invisible).

**`ThemeToggle`** — a single button that calls `useTheme().toggleTheme`. Shows 🌙 in light mode and ☀️ in dark mode.

**`StressControl`** — three preset buttons (Normal / Fast / Extreme). Clicking one POSTs the corresponding `streamIntervals` payload to `http://localhost:3000/intervals` via `intervalsApi.ts`, highlighting the active preset and showing an inline error if the server's HTTP API isn't reachable.

**`ProductList`** — the markets table. Has a search input (matches symbol and name), two tabs (All / Favorites), and renders a `TickerRow` per product. Favorites are persisted to `localStorage`.

**`TickerRow`** — wrapped in `React.memo`. Each row independently calls `useTicker` for its own symbol — so 6 rows = 6 independent WebSocket subscriptions. Updates to one row don't re-render others.

**`ProductDetail`** — the detail view. Renders `DetailTicker` for the hero stats, then `Orderbook` and `Trades` side by side.

**`DetailTicker`** — wrapped in `React.memo`, with its own `useTicker(symbol, 200)` subscription. Extracted from `ProductDetail` so ticker updates re-render only the hero stats, not the orderbook/trades panels.

**`Orderbook`** — wrapped in `React.memo`. Displays asks (reversed, best ask nearest the spread) and bids with a colored depth visualization bar. Computes and displays the spread in absolute and percentage terms. `OrderRow` keys are stable index-based slots (`ask-${i}`/`bid-${i}`, the i-th best ask/bid) rather than price-based, and `.ob-body` sets `contain: strict` + `overflow-anchor: none`, so high-frequency snapshot updates don't cause remount churn or scroll drift.

**`Trades`** — wrapped in `React.memo`, rendering memoized `TradeRow` items. Shows the 30 most recent trades with a flash animation on the newest entry, applied via `useEffect` and a 700ms timeout.

### Types (`src/types/index.ts`)

```ts
TickerData       // Normalized ticker: last_price, mark_price, change_24h, volume_24h, etc.
OrderbookLevel   // { price, quantity, total (cumulative) }
OrderbookData    // { symbol, bids: OrderbookLevel[], asks: OrderbookLevel[] }
Trade            // { id, price, size, side: 'buy'|'sell', timestamp }
Product          // { symbol, name }
ConnectionStatus // 'connected' | 'disconnected' | 'reconnecting'
```

### Favorites Store (`src/store/favorites.ts`)

Two plain functions (no React, no library) that read/write a `string[]` to `localStorage` under the key `crypto_favorites`. Called directly from components.

---

## Docker

Docker is included so the **server** can be deployed or shared without requiring Bun or Node to be installed on the target machine.

### Dockerfile

```dockerfile
FROM oven/bun:1-alpine        # Official Bun image, Alpine-based (small)

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production   # Install only runtime deps (ws)

COPY . .

EXPOSE 8080 3000              # WS + HTTP ports

CMD ["bun", "index.js"]
```

The `--production` flag skips dev dependencies (there are none here, but it's good practice). `--frozen-lockfile` ensures the exact versions from `bun.lockb` are installed.

### docker-compose.yml

```yaml
services:
  socket-server:
    build: .
    ports:
      - "8080:8080"   # WebSocket
      - "3000:3000"   # HTTP API
    restart: unless-stopped
```

`restart: unless-stopped` means Docker will restart the server if it crashes, but not if you manually stop it.

**The client is NOT dockerized.** It's a pure frontend — in production you'd build it with `npm run build` and serve the `dist/` folder from any static host (Nginx, Vercel, S3, etc.). During development you just run the Vite dev server.

---

## Running Locally

### Prerequisites

You need one of:
- **Bun** — recommended (the `package.json` start script uses `bun index.js`)
- **Node.js** ≥ 16 — works fine, just run `node index.js` instead

For the client you need Node.js + npm (comes with Node).

### Option 1 — Run Directly (Recommended for Development)

You'll run the server and the client at the same time, in **two separate terminals** (both are long-running processes).

#### Terminal 1 — Server (repo root)

**Step 1: Install server dependencies**

Run from the repo root (`socket-custom-load/`):

```bash
npm install
# or with bun:
bun install
```

**Step 2: Start the server**

Still from the repo root:

```bash
node index.js
# or with bun:
bun index.js
```

You should see:
```
📡 Server started on ws://localhost:8080
📡 HTTP API on http://localhost:3000/intervals
📡 Channels: all_trades, candlestick_<res>, l2_orderbook, v2/ticker
📡 Send: {"type":"subscribe","payload":{"channels":[{"name":"all_trades","symbols":["BTCUSD"]}]}}
```

Leave this terminal running.

#### Terminal 2 — Client (`client/` subdirectory)

**Step 3: Install client dependencies**

From the repo root, move into `client/` first — all remaining commands run from inside `client/`:

```bash
cd client
npm install
```

**Step 4: Start the client dev server**

Still inside `client/`:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. The UI connects to `ws://localhost:8080` automatically.

### Option 2 — Docker (Server Only)

```bash
# Build and start
docker compose up --build

# Run in background
docker compose up -d --build

# Stop
docker compose down
```

Then run the client separately as in Step 3–4 above.

### Option 3 — Docker (without Compose)

```bash
docker build -t socket-server .
docker run -p 8080:8080 -p 3000:3000 socket-server
```

---

## Testing the WebSocket Manually

You can connect with any WebSocket client. Using `wscat`:

```bash
npx wscat -c ws://localhost:8080
```

Then send:

```json
{"type":"subscribe","payload":{"channels":[{"name":"all_trades","symbols":["BTCUSD"]},{"name":"v2/ticker","symbols":["ETHUSD"]},{"name":"l2_orderbook","symbols":["SOLUSD"]},{"name":"candlestick_1m","symbols":["BTCUSD"]}]}}
```

Unsubscribe from a specific symbol:

```json
{"type":"unsubscribe","payload":{"channels":[{"name":"all_trades","symbols":["BTCUSD"]}]}}
```

Unsubscribe entire channel:

```json
{"type":"unsubscribe","payload":{"channels":[{"name":"all_trades"}]}}
```

---

## WebSocket Message Shapes

All messages go from server → client after subscribing.

### `all_trades`

```json
{
  "type": "all_trades",
  "symbol": "BTCUSD",
  "price": "62341.5",
  "size": 104,
  "buyer_role": "taker",
  "seller_role": "maker",
  "product_id": 27,
  "timestamp": 1718000000000000
}
```

Timestamps are in **microseconds**. `buyer_role === "taker"` means the buy side was the aggressor (market buy).

### `l2_orderbook`

```json
{
  "type": "l2_orderbook",
  "symbol": "BTCUSD",
  "bids": [["62300.0", "1.2345"], ["62299.5", "0.8123"], ...],
  "asks": [["62302.0", "2.0000"], ["62302.5", "1.1234"], ...],
  "timestamp": 1718000000000000
}
```

Each entry is `[price_string, quantity_string]`. 500 levels each side. Bids descending, asks ascending.

### `candlestick_<resolution>`

```json
{
  "type": "candlestick_1m",
  "symbol": "BTCUSD",
  "resolution": "1m",
  "candle_start_time": 1718000000000000,
  "open": "62000.0",
  "high": "62400.0",
  "low": "61900.0",
  "close": "62341.5",
  "volume": 3241,
  "timestamp": 1718000000000000,
  "sUID": "BTCUSD_#_BTCUSD_#_1"
}
```

Valid resolutions: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`. Each candle resets when its period elapses.

### `v2/ticker`

Large object. Key fields used by the client:

```json
{
  "type": "v2/ticker",
  "symbol": "BTCUSD",
  "close": 62341.5,
  "mark_price": "62342.1",
  "high": 63000.0,
  "low": 61500.0,
  "volume": 12345.678901,
  "funding_rate": "0.000100000000000000000",
  "ltp_change_24h": "1.0215",
  "open": 61000.0,
  "spot_price": "62340.9",
  "contract_type": "perpetual_futures",
  "product_trading_status": "operational",
  ...
}
```

`ltp_change_24h` is a ratio: `1.0215` means +2.15% change. The client converts it: `(ratio - 1) * 100`.

### `subscriptions` (ack, client → server direction is subscribe/unsubscribe)

Server sends this after every subscribe/unsubscribe:

```json
{
  "type": "subscriptions",
  "payload": {
    "channels": [
      { "name": "all_trades", "symbols": ["BTCUSD"] },
      { "name": "v2/ticker", "symbols": ["ETHUSD", "BTCUSD"] }
    ]
  }
}
```

The client's `WebSocketService` silently drops this message type.

---

## Building the Client for Production

```bash
cd client
npm run build
```

This runs `tsc` (type-check) then `vite build`. Output goes to `client/dist/`. The dist folder contains:
- `index.html`
- `assets/index-<hash>.js` — all JS bundled and minified
- `assets/index-<hash>.css` — all CSS bundled and minified

Serve `client/dist/` from any static file server. Make sure `ws://localhost:8080` is accessible from where users will load the page (or update the URL in `WebSocketService.ts` before building).

---

## Key Design Decisions

**No framework on the server** — The server uses zero-dependency vanilla Node.js (plus `ws`). There's no Express, no Fastify, no NestJS. The HTTP API is two routes and doesn't need a framework.

**Bun as runtime** — Bun is faster than Node for startup and has a built-in package manager. The code itself is plain CommonJS (`require`/`module.exports`) so it runs on Node too — just swap `bun index.js` for `node index.js`.

**Package manager mismatch** — `package.json` specifies `"packageManager": "yarn@4.6.0"` but the start script uses `bun` and a `bun.lockb` lockfile exists. In practice: use `bun install` and `bun index.js`. The yarn field can be ignored.

**Randomized intervals, not fixed** — Each stream tick schedules the next tick with a random delay within `[min, max]`. This produces a realistic, uneven data flow instead of a mechanical fixed-rate clock.

**Per-client subscription state** — Each WebSocket connection tracks its own subscriptions independently. If client A subscribes to BTCUSD and client B subscribes to ETHUSD, they each only receive data for what they asked for.

**Timer-based throttling across all live-data hooks** — `useOrderbook`, `useTicker`, and `useTrades` all funnel incoming WebSocket messages into a ref and flush via the shared `useThrottledFlush` hook, a `setTimeout`-based leading+trailing throttle (100ms for orderbook/trades ≈ 10/sec, 150–200ms for ticker ≈ 5–6.7/sec). `useTrades` additionally caps its buffer at 50 and dedupes by trade id before flushing. Without this, each message would trigger its own React re-render — at the Extreme stress preset (1–5 ms per message) that's hundreds of re-renders per second per symbol. An earlier `requestAnimationFrame`-based version (~60fps cap) still left enough headroom under Extreme to drive CPU to ~93%, DOM nodes past 65k, and JS heap to ~93MB; the lower, tunable throttle interval brought these down to roughly ~10% CPU, ~2k DOM nodes, and ~31MB heap.

**Stable list keys + scroll/layout containment for the orderbook** — `OrderRow` keys are index-based (`ask-${i}`/`bid-${i}`, the i-th best ask/bid) rather than price-based, so React reconciles rows in place instead of remounting the whole list every throttle tick (the mock generator returns fresh random price levels on every snapshot). `.ob-body` and `.trades-body` set `contain: strict` and `.ob-body` also sets `overflow-anchor: none`, isolating their layout/paint from the rest of the page and preventing scroll-position drift under high-frequency updates.

**HMR-safe WebSocket singleton** — `WebSocketService.disconnect()` runs from `import.meta.hot.dispose`, so a Vite hot-reload in dev closes the old socket before the reloaded module reconnects, preventing duplicate connections/subscriptions from accumulating across edits.

**React.memo on hot components** — `TickerRow`, `DetailTicker`, `Orderbook`, `OrderRow`, `Trades`, and `TradeRow` are all wrapped in `React.memo`. Since ticker data arrives continuously, without memoization every ticker update would re-render the entire component tree.

**CSS custom properties for theming** — All colors live as CSS variables on `:root` (light) and are overridden under `[data-theme='dark']` in `App.css`. Component stylesheets reference `var(--bg-card)`, `var(--text-primary)`, etc. instead of hardcoded hex values, so adding/adjusting a theme is a one-file change. `useTheme` persists the choice to `localStorage` and a pre-paint inline script in `index.html` prevents a flash of the wrong theme on reload.

**Stress test control reuses the existing `/intervals` API** — Rather than adding new server endpoints, `StressControl` posts `streamIntervals`-shaped payloads (Normal/Fast/Extreme presets) to the existing `POST /intervals` route. The only server change needed was enabling CORS so the browser could call a different-origin port (`:3000`) from the Vite dev server (`:5173`).
