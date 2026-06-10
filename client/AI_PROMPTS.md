# AI Prompts Used

This document lists the prompts I used when working with AI tools on this assignment, along with what decision each prompt informed.

---

## Prompt 1 — Architectural review

> "I'm building a crypto price tracker with React + TypeScript. It connects to a mock WebSocket server with three channels: `v2/ticker`, `l2_orderbook`, and `all_trades`. Multiple components on the same page may need the same symbol's data simultaneously. Review my plan of a singleton WebSocket service with a `Map<channel:symbol, Set<handler>>` pattern. Are there any memory leak or lifecycle risks I should handle?"

**Used for:** Confirming the singleton subscribe/unsubscribe design and the resubscribe-on-reconnect pattern. The AI flagged that cleanup on WS close must not clear the handler map (so reconnect can replay subscriptions) — only the socket itself should be replaced.

---

## Prompt 2 — Orderbook throttle strategy

> "My orderbook hook sets React state on every WebSocket message. At 10–40ms default intervals (and faster under stress), this causes visible render jank. What's the right throttle approach — requestAnimationFrame, debounce, or setTimeout at a fixed interval? I want the UI to feel smooth without dropping data."

**Used for:** Choosing `requestAnimationFrame` over debounce. The AI explained that rAF naturally syncs to the display's refresh rate (60fps) and avoids the off-thread scheduling issues with setTimeout, while still processing every message (stored in a ref between frames).

---

## Prompt 3 — Correct server message shapes

> "Here are the actual generator files from the server. The ticker message has fields `close`, `ltp_change_24h` (a ratio like 1.02), `mark_price` (string). The orderbook sends bids/asks as `[price_string, qty_string]` tuples. The trade has `buyer_role`/`seller_role` instead of a direct side field. Write TypeScript interfaces and normalisation functions for each."

**Used for:** Getting the correct raw → domain type mappings. Key conversions: `close` → `last_price`, `(ltp_change_24h - 1) * 100` → `change_24h`, `buyer_role === 'taker'` → `side: 'buy'`, tuple arrays → `OrderbookLevel[]` with cumulative totals.

---

## Prompt 4 — React.memo boundary placement

> "In my list view, I have 6 `TickerRow` components each subscribed to their own ticker. When BTCUSD gets an update, do all 6 rows re-render? How do I ensure only the updated row re-renders?"

**Used for:** Confirming `React.memo` on `TickerRow` is sufficient because each row's props only change when its own `ticker` state changes. The AI also noted to keep the `onToggleFav` callback stable with `useCallback` in the parent (though I passed an inline arrow since the list is small enough that it doesn't matter in practice).

---

## What I decided without AI

- **Vite over CRA**: faster dev server, no ejecting needed, output size irrelevant for a take-home
- **No state manager**: localStorage for favorites, hook-local state for live data — no need for Zustand/Redux at this scale
- **Symbols list hardcoded**: the server README lists exactly 6 symbols; no dynamic discovery endpoint exists
- **Trade side heuristic**: `buyer_role === 'taker'` as aggressor buy is standard in exchange APIs; this is my own domain knowledge, not AI-suggested
