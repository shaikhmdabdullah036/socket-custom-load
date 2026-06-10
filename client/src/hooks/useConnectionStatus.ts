import { useEffect, useState } from 'react';
import { wsService } from '../services/WebSocketService';

export function useConnectionStatus() {
  const [status, setStatus] = useState<string>('connected');

  useEffect(() => {
    return wsService.onStatusChange(setStatus);
  }, []);

  return status;
}
