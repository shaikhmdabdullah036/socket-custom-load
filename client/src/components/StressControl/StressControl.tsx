import { useState } from 'react';
import { setStreamIntervals, type StreamIntervals } from '../../services/intervalsApi';
import './StressControl.css';

type Preset = 'normal' | 'fast' | 'extreme';

// Sent as-is to POST /intervals (see server config.js for the streamIntervals shape)
const PRESETS: Record<Preset, StreamIntervals> = {
  normal: {
    all_trades: { min: 300, max: 500 },
    candlestick: { min: 300, max: 500 },
    l2_orderbook: { min: 300, max: 500 },
    'v2/ticker': { min: 300, max: 500 },
  },
  fast: {
    all_trades: { min: 50, max: 90 },
    candlestick: { min: 50, max: 90 },
    l2_orderbook: { min: 50, max: 90 },
    'v2/ticker': { min: 50, max: 90 },
  },
  extreme: {
    all_trades: { min: 1, max: 2 },
    candlestick: { min: 1, max: 2 },
    l2_orderbook: { min: 1, max: 5 },
    'v2/ticker': { min: 1, max: 5 },
  },
};

const LABELS: Record<Preset, string> = {
  normal: 'Normal',
  fast: 'Fast',
  extreme: 'Extreme',
};

export function StressControl() {
  const [active, setActive] = useState<Preset>('normal');
  const [pending, setPending] = useState<Preset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = async (preset: Preset) => {
    setPending(preset);
    setError(null);
    try {
      await setStreamIntervals(PRESETS[preset]);
      setActive(preset);
    } catch {
      setError('Server unreachable on :3000');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="stress-control">
      <span className="stress-label">Update speed</span>
      <div className="stress-buttons">
        {(Object.keys(PRESETS) as Preset[]).map((preset) => (
          <button
            key={preset}
            className={`stress-btn stress-btn-${preset} ${active === preset ? 'active' : ''}`}
            onClick={() => apply(preset)}
            disabled={pending !== null}
          >
            {pending === preset ? '…' : LABELS[preset]}
          </button>
        ))}
      </div>
      {error && <span className="stress-error">{error}</span>}
    </div>
  );
}
