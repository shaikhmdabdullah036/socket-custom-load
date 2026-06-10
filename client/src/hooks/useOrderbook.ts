import { useEffect, useState, useRef, useCallback } from 'react';
import { wsService } from '../services/WebSocketService';
import type { OrderbookData, OrderbookLevel } from '../types';

// Server sends bids/asks as [price_string, qty_string] tuples, 500 levels
interface RawOrderbook {
  symbol: string;
  bids: [string, string][];
  asks: [string, string][];
}

const DEPTH_LEVELS = 12;

function buildLevels(raw: [string, string][], limit: number): OrderbookLevel[] {
  let cumulative = 0;
  return raw.slice(0, limit).map(([p, q]) => {
    const qty = parseFloat(q);
    cumulative += qty;
    return { price: parseFloat(p), quantity: qty, total: cumulative };
  });
}

export function useOrderbook(symbol: string): OrderbookData | null {
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const pendingRef = useRef<OrderbookData | null>(null);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (pendingRef.current) {
      setOrderbook(pendingRef.current);
      pendingRef.current = null;
    }
    rafRef.current = null;
  }, []);

  useEffect(() => {
    const handler = (msg: unknown) => {
      const raw = msg as RawOrderbook;
      // Bids: descending price (best bid first), asks: ascending price (best ask first)
      const bids = buildLevels(raw.bids, DEPTH_LEVELS);
      const asks = buildLevels(raw.asks, DEPTH_LEVELS);
      pendingRef.current = { symbol: raw.symbol, bids, asks };

      // Throttle to animation frame — prevents jank at high frequency
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    wsService.subscribe('l2_orderbook', symbol, handler);
    return () => {
      wsService.unsubscribe('l2_orderbook', symbol, handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [symbol, flush]);

  return orderbook;
}
