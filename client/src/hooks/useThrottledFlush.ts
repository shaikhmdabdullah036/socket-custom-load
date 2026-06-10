import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_MIN_INTERVAL_MS = 100;

/**
 * Coalesces high-frequency stream updates to at most one flush per minimum interval.
 */
export function useThrottledFlush(
  flush: () => void,
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
) {
  const flushRef = useRef(flush);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const lastFlushRef = useRef(0);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const scheduleFlush = useCallback(() => {
    pendingRef.current = true;
    if (timerRef.current) return;

    const run = () => {
      timerRef.current = null;
      if (!pendingRef.current) return;
      pendingRef.current = false;
      lastFlushRef.current = performance.now();
      flushRef.current();
    };

    const elapsed = performance.now() - lastFlushRef.current;
    const delay = Math.max(0, minIntervalMs - elapsed);
    timerRef.current = setTimeout(run, delay);
  }, [minIntervalMs]);

  const cancelScheduledFlush = useCallback(() => {
    pendingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { scheduleFlush, cancelScheduledFlush };
}
