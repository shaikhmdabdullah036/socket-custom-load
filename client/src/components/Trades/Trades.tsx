import React, { useEffect, useRef, useState } from 'react';
import { useTrades } from '../../hooks/useTrades';
import type { Trade } from '../../types';
import './Trades.css';

interface Props {
  symbol: string;
}

const TradeRow = React.memo(function TradeRow({
  trade,
  highlight,
}: {
  trade: Trade;
  highlight: boolean;
}) {
  return (
    <div className={`trade-row${highlight ? ' trade-new' : ''}`}>
      <span className={trade.side === 'buy' ? 'trade-price-buy' : 'trade-price-sell'}>
        {trade.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}
      </span>
      <span className="trade-size">{trade.size}</span>
      <span className="side-col">
        <span className={`side-pill side-${trade.side}`}>
          {trade.side === 'buy' ? 'BUY' : 'SELL'}
        </span>
      </span>
      <span className="trade-time">{trade.timeLabel}</span>
    </div>
  );
});

export const Trades = React.memo(function Trades({ symbol }: Props) {
  const trades = useTrades(symbol);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const prevFirstId = useRef<string | null>(null);

  const firstId = trades[0]?.id ?? null;

  useEffect(() => {
    if (!firstId || firstId === prevFirstId.current) return;
    prevFirstId.current = firstId;
    setHighlightId(firstId);
    const timer = window.setTimeout(() => setHighlightId(null), 700);
    return () => window.clearTimeout(timer);
  }, [firstId]);

  return (
    <div className="trades">
      <h3 className="trades-title">Recent Trades</h3>

      <div className="trades-header">
        <span>PRICE</span>
        <span className="right">SIZE</span>
        <span className="right">SIDE</span>
        <span className="right">TIME</span>
      </div>

      <div className="trades-body">
        {trades.map((trade) => (
          <TradeRow
            key={trade.id}
            trade={trade}
            highlight={trade.id === highlightId}
          />
        ))}

        {trades.length === 0 && (
          <div className="trades-empty">
            Waiting for trades…
          </div>
        )}
      </div>
    </div>
  );
});
