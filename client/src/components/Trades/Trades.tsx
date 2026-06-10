import React, { useRef } from 'react';
import { useTrades } from '../../hooks/useTrades';
import './Trades.css';

interface Props {
  symbol: string;
}

export const Trades = React.memo(function Trades({ symbol }: Props) {
  const trades = useTrades(symbol);
  const prevFirstId = useRef<string | null>(null);

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
        {trades.map((trade, i) => {
          const isNew = i === 0 && trade.id !== prevFirstId.current;
          if (i === 0) prevFirstId.current = trade.id;

          return (
            <div key={trade.id} className={`trade-row${isNew ? ' trade-new' : ''}`}>
              <span className={trade.side === 'buy' ? 'trade-price-buy' : 'trade-price-sell'}>
                {trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span className="trade-size">{trade.size}</span>
              <span className="side-col">
                <span className={`side-pill side-${trade.side}`}>
                  {trade.side === 'buy' ? 'BUY' : 'SELL'}
                </span>
              </span>
              <span className="trade-time">
                {new Date(trade.timestamp).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          );
        })}

        {trades.length === 0 && (
          <div className="trades-empty">
            Waiting for trades…
          </div>
        )}
      </div>
    </div>
  );
});
