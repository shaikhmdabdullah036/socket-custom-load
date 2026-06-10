import { useState } from 'react';
import { useTicker } from '../../hooks/useTicker';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { Orderbook } from '../Orderbook/Orderbook';
import { Trades } from '../Trades/Trades';
import { getFavorites, toggleFavorite } from '../../store/favorites';
import './ProductDetail.css';

const NAMES: Record<string, string> = {
  BTCUSD: 'Bitcoin Perpetual',
  ETHUSD: 'Ethereum Perpetual',
  SOLUSD: 'Solana Perpetual',
  XRPUSD: 'XRP Perpetual',
  DOGEUSD: 'Dogecoin Perpetual',
  PAXGUSD: 'PAX Gold Perpetual',
};

interface Props {
  symbol: string;
  onBack: () => void;
}

export function ProductDetail({ symbol, onBack }: Props) {
  const ticker = useTicker(symbol);
  const status = useConnectionStatus();
  const [isFav, setIsFav] = useState(() => getFavorites().includes(symbol));

  const change = ticker?.change_24h ?? 0;
  const isPositive = change >= 0;

  const handleToggleFav = () => {
    toggleFavorite(symbol);
    setIsFav((f) => !f);
  };

  const fmt = (v?: number, opts?: Intl.NumberFormatOptions) =>
    v != null
      ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4, ...opts })
      : '—';

  const fmtVolume = (v?: number) => {
    if (v == null) return '—';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(2);
  };

  return (
    <div className="detail-card">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="detail-header-meta">
          <div className="detail-symbol">{symbol}</div>
          <div className="detail-name">{NAMES[symbol] ?? symbol}</div>
        </div>
        <span className={`detail-star ${isFav ? 'active' : ''}`} onClick={handleToggleFav}>
          {isFav ? '★' : '☆'}
        </span>
      </div>

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
        <StatItem label="MARK PRICE"   value={`$${fmt(ticker?.mark_price)}`} />
        <StatItem label="24H HIGH"     value={`$${fmt(ticker?.high_24h)}`} />
        <StatItem label="24H LOW"      value={`$${fmt(ticker?.low_24h)}`} />
        <StatItem label="24H VOLUME"   value={fmtVolume(ticker?.volume_24h)} />
        <StatItem label="FUNDING RATE" value={ticker?.funding_rate != null ? `${ticker.funding_rate.toFixed(4)}%` : '—'} />
      </div>

      <div className="detail-grid">
        <Orderbook symbol={symbol} />
        <Trades symbol={symbol} />
      </div>

      <div className="ws-status">
        <span className={`ws-dot ws-dot-${status}`} />
        {status === 'connected'
          ? 'WebSocket connected · Live updates active'
          : status === 'reconnecting'
          ? 'Reconnecting…'
          : 'Disconnected'}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
