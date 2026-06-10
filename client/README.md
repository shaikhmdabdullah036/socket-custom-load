# Crypto Price Tracker

A live crypto price tracker built with React + TypeScript, consuming the provided mock WebSocket server.

## Setup

```bash
# 1. Start the mock server (from repo root)
bun install && bun start

# 2. Start the client (in a separate terminal)
cd client
npm install
npm run dev
```

Client runs at http://localhost:5173. Server must be running at ws://localhost:8080.

## Tech Stack

| Tool | Role |
|------|------|
| React 18 + TypeScript | UI framework, type safety |
| **Vite** | Dev server (`npm run dev`, port `5173`) + production bundler (`npm run build` → Rollup) |
| `@vitejs/plugin-react` | Babel-based Fast Refresh / HMR |

No UI library, no state manager, no charting library — plain hooks + hand-written CSS. `npm run build` runs `tsc` (type-check only) then `vite build`, output to `client/dist/`.

## Features

- **Product List View** — all 6 symbols with live last price, 24h change %, and volume via `v2/ticker`
- **Search** — filter by symbol or name
- **Favorites** — star/unstar symbols, persisted to localStorage, filterable with the Favorites tab
- **Product Detail View** — click any row to open:
  - Hero last price + 24h change
  - Mark price, 24h high/low, volume, funding rate
  - Live orderbook (12 levels) with depth bars via `l2_orderbook`
  - Recent trades (last 30) with BUY/SELL pills and highlight animation via `all_trades`
- **Connection status** — fixed banner on disconnect/reconnect; dot indicator in detail view
- **Exponential backoff reconnection** — automatically reconnects on server drop
- **Dark mode** — toggle in the top bar, persisted to localStorage, respects `prefers-color-scheme` on first visit, no flash-of-wrong-theme on reload
- **Stress test control** (bonus) — Normal / Fast / Extreme buttons in the top bar call `POST http://localhost:3000/intervals` to crank up server stream rates live

## Architecture

### Layer 1 — WebSocket Service (`src/services/WebSocketService.ts`)

A singleton that owns the single WebSocket connection for the app's lifetime.

- Handlers are keyed by `"channel:symbol"` (e.g. `"v2/ticker:BTCUSD"`)
- `subscribe(channel, symbol, handler)` — adds handler, sends subscribe to server only when first handler registers for that key
- `unsubscribe(channel, symbol, handler)` — removes handler, sends unsubscribe when last handler deregisters
- On reconnect, replays all active subscriptions automatically
- Exponential backoff: starts at 1s, doubles on each failure, caps at 30s

### Layer 2 — Custom Hooks (`src/hooks/`)

| Hook | Channel | Notes |
|------|---------|-------|
| `useTicker(symbol)` | `v2/ticker` | Normalises raw server shape → `TickerData`; rAF-throttled (coalesces bursts to ≤60fps) |
| `useOrderbook(symbol)` | `l2_orderbook` | rAF throttle — max 60fps render regardless of server rate |
| `useTrades(symbol)` | `all_trades` | Buffers incoming trades and flushes via rAF, prepends batch, caps at 30 |
| `useConnectionStatus()` | — | Subscribes to service status notifications |
| `useTheme()` | — | Reads/writes `data-theme` on `<html>`, persists to localStorage |

### Layer 3 — Store (`src/store/favorites.ts`)

Direct localStorage reads/writes. No global state manager — simple and sufficient.

### Layer 4 — Components

```
App
├── ConnectionStatus     fixed banner on disconnect/reconnect
├── topbar
│   ├── StressControl    Normal/Fast/Extreme → POST /intervals
│   └── ThemeToggle       light/dark switch
├── ProductList
│   └── TickerRow × 6   React.memo — only re-renders on own ticker update
└── ProductDetail
    ├── Orderbook        React.memo + rAF throttle
    └── Trades           React.memo + highlight animation on new trade
```

### Performance decisions

| Problem | Solution |
|---------|----------|
| Orderbook fires 10–40ms at default, faster under stress | `pendingRef` + `requestAnimationFrame` — renders at 60fps max |
| Ticker fires 10–50ms at default, faster under stress | Same rAF coalescing pattern in `useTicker` — only the latest tick per frame is rendered |
| Trades fire 5–20ms at default, much faster under stress | `useTrades` buffers all trades arriving within a frame and flushes them as one state update via rAF, instead of one `setState` per message |
| All TickerRows on list view | `React.memo` on `TickerRow` — only changed symbol re-renders |
| Trades list growing unbounded | Hard cap at 30 items with `.slice(0, 30)` |
| WS reconnection storms | Exponential backoff capped at 30s |
| Multiple components on same symbol re-subscribing | Service deduplicates: one WS sub per channel:symbol |
| Theme flash on page load | Inline script in `index.html` sets `data-theme` before first paint |

### Dark mode

- `useTheme()` (`src/hooks/useTheme.ts`) reads `localStorage['crypto_theme']`, falling back to `prefers-color-scheme`, and toggles `data-theme="light"|"dark"` on `<html>`.
- `App.css` defines all colors as CSS custom properties on `:root` (light) and `[data-theme='dark']` (dark overrides) — every component CSS file consumes `var(--bg-card)`, `var(--text-primary)`, etc. instead of hardcoded hex values.
- A small inline script in `index.html` applies the saved/preferred theme attribute before React mounts, avoiding a flash of the wrong theme on reload.
- Toggle lives in the `topbar` (`ThemeToggle` component) and is available everywhere — list view and detail view.

### Stress test mode (bonus)

- `StressControl` (`src/components/StressControl`) renders three preset buttons — **Normal / Fast / Extreme** — in the top bar.
- Each preset is a full `streamIntervals`-shaped payload sent via `POST http://localhost:3000/intervals` (`src/services/intervalsApi.ts`). Note these presets override the server's own defaults (`config.js`: 5–50ms) — Normal here is intentionally slower/more readable, while Extreme pushes down to the server's `min: 1` floor.
- | Preset | all_trades / candlestick | l2_orderbook | v2/ticker |
  |--------|---------------------------|--------------|-----------|
  | Normal | 300–500ms | 300–500ms | 300–500ms |
  | Fast | 50–90ms | 50–90ms | 50–90ms |
  | Extreme | 1–2ms | 1–5ms | 1–5ms |
- The server's HTTP API didn't send CORS headers, so a browser fetch from `http://localhost:5173` to `http://localhost:3000` was blocked. Added `Access-Control-Allow-Origin`/`Methods`/`Headers` plus an `OPTIONS` preflight handler in the root `index.js`.
- The app remains smooth at the Extreme preset because of the rAF throttling/batching described above — verified no dropped frames or runaway memory with all three streams (ticker, trades, orderbook) open simultaneously.

## What I'd improve with more time

- Virtual list for orderbook rows under extreme stress mode
- Zustand for shared ticker state so multiple components on same symbol share one subscription
- Unit tests for `useOrderbook`/`useTicker`/`useTrades` throttling and WS service subscribe/unsubscribe lifecycle
- Sparkline chart per symbol on list view (bonus — `GET /v2/history/candles`)
- Read live intervals from `GET /intervals` on mount so the active stress preset reflects actual server state
