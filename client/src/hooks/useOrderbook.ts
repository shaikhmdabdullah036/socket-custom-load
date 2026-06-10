import { useEffect, useState, useRef, useCallback } from 'react';
import { wsService } from '../services/WebSocketService';
import { useThrottledFlush } from './useThrottledFlush';
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

  const flush = useCallback(() => {
    if (pendingRef.current) {
      setOrderbook(pendingRef.current);
      pendingRef.current = null;
    }
  }, []);

  const { scheduleFlush, cancelScheduledFlush } = useThrottledFlush(flush, 100);

  useEffect(() => {
    setOrderbook(null);
    pendingRef.current = null;

    const handler = (msg: unknown) => {
      const raw = msg as RawOrderbook;
      const bids = buildLevels(raw.bids, DEPTH_LEVELS);
      const asks = buildLevels(raw.asks, DEPTH_LEVELS);
      pendingRef.current = { symbol: raw.symbol, bids, asks };
      scheduleFlush();
    };

    wsService.subscribe('l2_orderbook', symbol, handler);
    return () => {
      wsService.unsubscribe('l2_orderbook', symbol, handler);
      cancelScheduledFlush();
      pendingRef.current = null;
    };
  }, [symbol, scheduleFlush, cancelScheduledFlush]);

  return orderbook;
}
