import { useState } from 'react';
import { ProductList } from './components/ProductList/ProductList';
import { ProductDetail } from './components/ProductDetail/ProductDetail';
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle';
import { StressControl } from './components/StressControl/StressControl';
import './App.css';

export default function App() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="app-shell">
      <ConnectionStatus />

      <div className="topbar">
        <span className="topbar-title">Crypto Tracker</span>
        <div className="topbar-controls">
          <StressControl />
          <ThemeToggle />
        </div>
      </div>

      {selected ? (
        <ProductDetail symbol={selected} onBack={() => setSelected(null)} />
      ) : (
        <ProductList onSelect={setSelected} />
      )}
    </div>
  );
}
