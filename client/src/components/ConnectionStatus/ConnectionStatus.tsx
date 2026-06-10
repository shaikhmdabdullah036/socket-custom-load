import { useConnectionStatus } from '../../hooks/useConnectionStatus';

export function ConnectionStatus() {
  const status = useConnectionStatus();
  if (status === 'connected') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: status === 'reconnecting' ? '#f59e0b' : '#dc2626',
        color: '#fff',
        textAlign: 'center',
        padding: '6px',
        zIndex: 9999,
        fontSize: 13,
      }}
    >
      {status === 'reconnecting' ? 'Reconnecting…' : 'Disconnected — server may be offline'}
    </div>
  );
}
