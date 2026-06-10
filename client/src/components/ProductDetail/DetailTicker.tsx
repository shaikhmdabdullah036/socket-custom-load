import React from 'react';
import { useTicker } from '../../hooks/useTicker';

interface Props {
  symbol: string;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export const DetailTicker = React.memo(function DetailTicker({ symbol }: Props) {
  const ticker = useTicker(symbol, 200);

  const change = ticker?.change_24h ?? 0;
  const isPositive = change >= 0;

  const fmt = (v?: number) =>
    v != null
      ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      : '—';

  const fmtVolume = (v?: number) => {
    if (v == null) return '—';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(2);
  };

  return (
    <>
      <div className="hero-price">
        <span className="hero-last">
          {ticker?.last_price != null ? `$${fmt(ticker.last_price)}` : '—'}
        </span>
        {ticker && (
          <span className={`hero-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>

      <div className="stats-row">
        <StatItem label="MARK PRICE" value={`$${fmt(ticker?.mark_price)}`} />
        <StatItem label="24H HIGH" value={`$${fmt(ticker?.high_24h)}`} />
        <StatItem label="24H LOW" value={`$${fmt(ticker?.low_24h)}`} />
        <StatItem label="24H VOLUME" value={fmtVolume(ticker?.volume_24h)} />
        <StatItem
          label="FUNDING RATE"
          value={ticker?.funding_rate != null ? `${ticker.funding_rate.toFixed(4)}%` : '—'}
        />
      </div>
    </>
  );
});
