import { useState } from 'react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { DetailTicker } from './DetailTicker';
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
  const status = useConnectionStatus();
  const [isFav, setIsFav] = useState(() => getFavorites().includes(symbol));

  const handleToggleFav = () => {
    toggleFavorite(symbol);
    setIsFav((f) => !f);
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

      <DetailTicker symbol={symbol} />

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
