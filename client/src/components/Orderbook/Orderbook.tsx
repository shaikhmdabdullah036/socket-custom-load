import React from 'react';
import { useOrderbook } from '../../hooks/useOrderbook';
import type { OrderbookLevel } from '../../types';
import './Orderbook.css';

interface Props {
  symbol: string;
}

export const Orderbook = React.memo(function Orderbook({ symbol }: Props) {
  const book = useOrderbook(symbol);

  const maxTotal = book
    ? Math.max(...book.bids.map((b) => b.total), ...book.asks.map((a) => a.total))
    : 1;

  const bestAsk = book?.asks[0]?.price;
  const bestBid = book?.bids[0]?.price;
  const spread =
    bestAsk != null && bestBid != null ? (bestAsk - bestBid).toFixed(2) : null;
  const spreadPct =
    bestAsk != null && bestBid != null
      ? (((bestAsk - bestBid) / bestAsk) * 100).toFixed(3)
      : null;

  return (
    <div className="orderbook">
      <h3 className="ob-title">Orderbook</h3>

      <div className="ob-header">
        <span>PRICE</span>
        <span className="right">SIZE</span>
        <span className="right">TOTAL</span>
      </div>

      <div className="ob-body">
        {/* Asks: reversed so highest ask is at top, best ask nearest spread */}
        {book?.asks
          .slice()
          .reverse()
          .map((level, i) => (
            <OrderRow key={`ask-${i}`} level={level} side="ask" maxTotal={maxTotal} />
          ))}

        {spread && (
          <div className="spread-row">
            Spread: ${spread} ({spreadPct}%)
          </div>
        )}

        {/* Bids: descending (best bid first, nearest spread) */}
        {book?.bids.map((level, i) => (
          <OrderRow key={`bid-${i}`} level={level} side="bid" maxTotal={maxTotal} />
        ))}
      </div>
    </div>
  );
});

const OrderRow = React.memo(function OrderRow({
  level,
  side,
  maxTotal,
}: {
  level: OrderbookLevel;
  side: 'bid' | 'ask';
  maxTotal: number;
}) {
  const pct = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;

  return (
    <div className={`ob-row`}>
      <div className={`ob-depth ob-depth-${side}`} style={{ width: `${pct}%` }} />
      <span className={`ob-price ob-price-${side}`}>{level.price.toFixed(2)}</span>
      <span className="ob-qty">{level.quantity.toFixed(4)}</span>
      <span className="ob-total">{level.total.toFixed(4)}</span>
    </div>
  );
});
