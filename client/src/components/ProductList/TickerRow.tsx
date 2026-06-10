import React from 'react';
import { useTicker } from '../../hooks/useTicker';
import type { Product } from '../../types';

interface Props {
  product: Product;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFav: (e: React.MouseEvent) => void;
}

function formatVolume(v?: number): string {
  if (v == null) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(2);
}

export const TickerRow = React.memo(function TickerRow({
  product,
  isFavorite,
  onSelect,
  onToggleFav,
}: Props) {
  const ticker = useTicker(product.symbol);
  const change = ticker?.change_24h ?? 0;
  const isPositive = change >= 0;

  return (
    <div className="ticker-row" onClick={onSelect}>
      <span
        className={`star ${isFavorite ? 'star-active' : ''}`}
        onClick={onToggleFav}
      >
        {isFavorite ? '★' : '☆'}
      </span>

      <span className="symbol-cell">
        <span className="symbol-bold">{product.symbol}</span>
        <span className="symbol-name">{product.name}</span>
      </span>

      <span className="col-right col-price">
        {ticker?.last_price != null
          ? `$${ticker.last_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
          : '—'}
      </span>

      <span className={`col-right col-change ${ticker ? (isPositive ? 'positive' : 'negative') : ''}`}>
        {ticker
          ? `${isPositive ? '+' : ''}${change.toFixed(2)}%`
          : '—'}
      </span>

      <span className="col-right col-volume">
        {formatVolume(ticker?.volume_24h)}
      </span>
    </div>
  );
});
