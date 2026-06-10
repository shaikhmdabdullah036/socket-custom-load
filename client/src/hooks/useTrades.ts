import { useEffect, useState, useRef, useCallback } from 'react';
import { wsService } from '../services/WebSocketService';
import type { Trade } from '../types';

interface RawTrade {
  symbol: string;
  price: string;
  size: number;
  buyer_role: 'maker' | 'taker';
  seller_role: 'maker' | 'taker';
  timestamp: number; // microseconds
}

const MAX_TRADES = 30;
let tradeCounter = 0;

export function useTrades(symbol: string): Trade[] {
  const [trades, setTrades] = useState<Trade[]>([]);
  const bufferRef = useRef<Trade[]>([]);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (bufferRef.current.length > 0) {
      // Buffer holds trades oldest→newest; newest goes to the front of the list
      const incoming = bufferRef.current.reverse();
      bufferRef.current = [];
      setTrades((prev) => [...incoming, ...prev].slice(0, MAX_TRADES));
    }
    rafRef.current = null;
  }, []);

  useEffect(() => {
    setTrades([]); // reset when symbol changes
    bufferRef.current = [];

    const handler = (msg: unknown) => {
      const raw = msg as RawTrade;
      const trade: Trade = {
        id: `${raw.timestamp}-${++tradeCounter}`,
        price: parseFloat(raw.price),
        size: raw.size,
        // taker buyer = aggressor buy; taker seller = aggressor sell
        side: raw.buyer_role === 'taker' ? 'buy' : 'sell',
        timestamp: Math.floor(raw.timestamp / 1000), // µs → ms
      };

      bufferRef.current.push(trade);
      // Throttle to animation frame — coalesces bursts under high-frequency streams
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    wsService.subscribe('all_trades', symbol, handler);
    return () => {
      wsService.unsubscribe('all_trades', symbol, handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      bufferRef.current = [];
    };
  }, [symbol, flush]);

  return trades;
}
