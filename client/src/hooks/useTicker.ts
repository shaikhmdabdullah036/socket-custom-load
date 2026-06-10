import { useEffect, useState, useRef, useCallback } from 'react';
import { wsService } from '../services/WebSocketService';
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

export function useTicker(symbol: string): TickerData | null {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const pendingRef = useRef<TickerData | null>(null);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (pendingRef.current) {
      setTicker(pendingRef.current);
      pendingRef.current = null;
    }
    rafRef.current = null;
  }, []);

  useEffect(() => {
    const handler = (msg: unknown) => {
      pendingRef.current = normalize(msg as RawTicker);

      // Throttle to animation frame — coalesces bursts under high-frequency streams
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };
    wsService.subscribe('v2/ticker', symbol, handler);
    return () => {
      wsService.unsubscribe('v2/ticker', symbol, handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      pendingRef.current = null;
    };
  }, [symbol, flush]);

  return ticker;
}
