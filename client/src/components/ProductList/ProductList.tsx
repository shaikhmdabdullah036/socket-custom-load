import { useState } from 'react';
import { getFavorites, toggleFavorite } from '../../store/favorites';
import { TickerRow } from './TickerRow';
import type { Product } from '../../types';
import './ProductList.css';

const PRODUCTS: Product[] = [
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: 'ETHUSD', name: 'Ethereum' },
  { symbol: 'SOLUSD', name: 'Solana' },
  { symbol: 'XRPUSD', name: 'XRP' },
  { symbol: 'DOGEUSD', name: 'Dogecoin' },
  { symbol: 'PAXGUSD', name: 'PAX Gold' },
];

interface Props {
  onSelect: (symbol: string) => void;
}

export function ProductList({ onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>(getFavorites);

  const displayed = PRODUCTS.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    const matchTab = tab === 'all' || favorites.includes(p.symbol);
    return matchSearch && matchTab;
  });

  const handleToggleFav = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(toggleFavorite(symbol));
  };

  return (
    <div className="card">
      <h2 className="markets-title">Markets</h2>

      <div className="tab-row">
        <button className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All
        </button>
        <button
          className={`tab-btn ${tab === 'favorites' ? 'active' : ''}`}
          onClick={() => setTab('favorites')}
        >
          ★ Favorites
        </button>
      </div>

      <input
        className="search-input"
        placeholder="Search by name or symbol..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="table-header">
        <span>SYMBOL</span>
        <span className="right">LAST PRICE</span>
        <span className="right">24H CHANGE</span>
        <span className="right">VOLUME</span>
      </div>

      <div className="market-rows">
        {displayed.length === 0 ? (
          <div className="no-results">
            No symbols found
          </div>
        ) : (
          displayed.map((product) => (
            <TickerRow
              key={product.symbol}
              product={product}
              isFavorite={favorites.includes(product.symbol)}
              onSelect={() => onSelect(product.symbol)}
              onToggleFav={(e) => handleToggleFav(product.symbol, e)}
            />
          ))
        )}
      </div>

      <div className="table-footer">Live data · ws://localhost:8080</div>
    </div>
  );
}
