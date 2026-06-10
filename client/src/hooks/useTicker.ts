import { useEffect, useState, useRef, useCallback } from 'react';
import { wsService } from '../services/WebSocketService';
import { useThrottledFlush } from './useThrottledFlush';
import type { TickerData } from '../types';

// Server sends v2/ticker messages with this shape
interface RawTicker {
  type: string;
  symbol: string;
  close: number;
  mark_price: string;
  high: number;
  low: number;
  volume: number;
  funding_rate: string;
  ltp_change_24h: string; // ratio: 1.02 = +2%
}

function normalize(raw: RawTicker): TickerData {
  return {
    symbol: raw.symbol,
    last_price: raw.close,
    mark_price: parseFloat(raw.mark_price),
    change_24h: (parseFloat(raw.ltp_change_24h) - 1) * 100,
    volume_24h: raw.volume,
    high_24h: raw.high,
    low_24h: raw.low,
    funding_rate: parseFloat(raw.funding_rate) * 100,
  };
}

export function useTicker(symbol: string, minIntervalMs = 150): TickerData | null {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const pendingRef = useRef<TickerData | null>(null);

  const flush = useCallback(() => {
    if (pendingRef.current) {
      setTicker(pendingRef.current);
      pendingRef.current = null;
    }
  }, []);

  const { scheduleFlush, cancelScheduledFlush } = useThrottledFlush(flush, minIntervalMs);

  useEffect(() => {
    setTicker(null);
    pendingRef.current = null;

    const handler = (msg: unknown) => {
      pendingRef.current = normalize(msg as RawTicker);
      scheduleFlush();
    };

    wsService.subscribe('v2/ticker', symbol, handler);
    return () => {
      wsService.unsubscribe('v2/ticker', symbol, handler);
      cancelScheduledFlush();
      pendingRef.current = null;
    };
  }, [symbol, scheduleFlush, cancelScheduledFlush]);

  return ticker;
}
