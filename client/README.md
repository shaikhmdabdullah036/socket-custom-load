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
| `useTicker(symbol, minIntervalMs?)` | `v2/ticker` | Normalises raw server shape → `TickerData`; flushed via `useThrottledFlush` (default 150ms ≈ 6.7/sec; `DetailTicker` passes 200ms ≈ 5/sec) |
| `useOrderbook(symbol)` | `l2_orderbook` | Builds a 12-level book with cumulative totals; flushed via `useThrottledFlush` at 100ms (≈10/sec) regardless of server rate |
| `useTrades(symbol)` | `all_trades` | Buffers incoming trades, dedupes by id, caps the internal buffer at 50 and the displayed list at 30; flushed via `useThrottledFlush` at 100ms |
| `useThrottledFlush(flush, minIntervalMs?)` | — | Shared `setTimeout`-based leading+trailing throttle used by the three hooks above — runs `flush` immediately if idle, otherwise schedules a single trailing call so updates can't pile up |
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
    ├── DetailTicker     React.memo — hero price + stats, own useTicker(symbol, 200)
    ├── Orderbook        React.memo, useThrottledFlush, stable index-based row keys
    └── Trades           React.memo TradeRow rows + highlight animation on new trade
```

### Performance decisions

| Problem | Solution |
|---------|----------|
| Orderbook/ticker/trades fire every 1–50ms under stress, far faster than the UI needs to redraw | Each stream hook (`useTicker`, `useOrderbook`, `useTrades`) buffers the latest payload in a ref and flushes via the shared `useThrottledFlush` hook — a `setTimeout`-based leading+trailing throttle (100ms for orderbook/trades ≈ 10/sec, 150–200ms for ticker ≈ 5–6.7/sec) — so `setState` runs at a bounded rate regardless of server rate |
| Trades list growing unbounded under high-frequency streams | `useTrades` caps its internal buffer at 50 and dedupes by trade id (`Set`) before slicing to the displayed 30, so duplicate/late messages from a throttled batch don't double-count |
| Orderbook rows remounting on every throttle tick under Extreme mode dragged the scroll position via browser scroll-anchoring (price-based row keys changed every tick since the mock generator returns fresh random levels) | `OrderRow` keys are stable index-based slots (`ask-${i}`/`bid-${i}` — the i-th best ask/bid) so React reconciles in place; `.ob-body` also sets `overflow-anchor: none` as a backstop |
| Orderbook depth-bar width animating on every update fought the throttle, causing visible jank | Removed the `.ob-depth` width transition — bars snap to the new value each flush |
| High-frequency lists (`Orderbook`, `Trades`) leaking layout/paint cost into the rest of the page | `contain: strict` on `.ob-body` / `.trades-body` isolates their layout, paint, and size from the rest of the tree |
| `ProductDetail`'s hero ticker re-rendering the whole detail view (orderbook + trades) on every tick | Extracted `DetailTicker` as its own `React.memo` component with its own `useTicker(symbol, 200)` subscription |
| All TickerRows on list view | `React.memo` on `TickerRow` — only changed symbol re-renders |
| WS reconnection storms | Exponential backoff capped at 30s |
| Multiple components on same symbol re-subscribing | Service deduplicates: one WS sub per channel:symbol |
| Stale/duplicate WebSocket connections after Vite HMR reloads in dev | `WebSocketService.disconnect()` runs from `import.meta.hot.dispose`, closing the old socket before the reloaded module reconnects |
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
- The app remains smooth at the Extreme preset because of the throttling, capping/dedupe, and CSS containment described above — verified low CPU, bounded DOM node count, and stable JS heap with all three streams (ticker, trades, orderbook) open simultaneously.

## What I'd improve with more time

- Virtual list for orderbook rows under extreme stress mode
- Zustand for shared ticker state so multiple components on same symbol share one subscription
- Unit tests for `useOrderbook`/`useTicker`/`useTrades` throttling and WS service subscribe/unsubscribe lifecycle
- Sparkline chart per symbol on list view (bonus — `GET /v2/history/candles`)
- Read live intervals from `GET /intervals` on mount so the active stress preset reflects actual server state
