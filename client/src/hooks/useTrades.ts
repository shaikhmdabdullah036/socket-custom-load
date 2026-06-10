import { useEffect, useState, useRef, useCallback } from 'react';
import { wsService } from '../services/WebSocketService';
import { useThrottledFlush } from './useThrottledFlush';
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
const MAX_BUFFER = 50;

function formatTradeTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function useTrades(symbol: string): Trade[] {
  const [trades, setTrades] = useState<Trade[]>([]);
  const bufferRef = useRef<Trade[]>([]);
  const idRef = useRef(0);

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    const incoming = bufferRef.current;
    bufferRef.current = [];

    setTrades((prev) => {
      const merged = [...incoming.reverse(), ...prev];
      const seen = new Set<string>();
      const next: Trade[] = [];
      for (const trade of merged) {
        if (seen.has(trade.id)) continue;
        seen.add(trade.id);
        next.push(trade);
        if (next.length >= MAX_TRADES) break;
      }
      return next;
    });
  }, []);

  const { scheduleFlush, cancelScheduledFlush } = useThrottledFlush(flush, 100);

  useEffect(() => {
    setTrades([]);
    bufferRef.current = [];
    idRef.current = 0;

    const handler = (msg: unknown) => {
      const raw = msg as RawTrade;
      const timestampMs = Math.floor(raw.timestamp / 1000);
      const trade: Trade = {
        id: `${++idRef.current}`,
        price: parseFloat(raw.price),
        size: raw.size,
        side: raw.buyer_role === 'taker' ? 'buy' : 'sell',
        timestamp: timestampMs,
        timeLabel: formatTradeTime(timestampMs),
      };

      bufferRef.current.push(trade);
      if (bufferRef.current.length > MAX_BUFFER) {
        bufferRef.current = bufferRef.current.slice(-MAX_BUFFER);
      }
      scheduleFlush();
    };

    wsService.subscribe('all_trades', symbol, handler);
    return () => {
      wsService.unsubscribe('all_trades', symbol, handler);
      cancelScheduledFlush();
      bufferRef.current = [];
    };
  }, [symbol, scheduleFlush, cancelScheduledFlush]);

  return trades;
}
