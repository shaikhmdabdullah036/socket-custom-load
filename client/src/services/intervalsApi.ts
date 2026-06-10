// Talks to the mock server's runtime config API (see server README — POST /intervals)
const HTTP_BASE = 'http://localhost:3000';

export interface ChannelInterval {
  min: number;
  max: number;
}

export type StreamIntervals = Record<string, ChannelInterval>;

export async function getStreamIntervals(): Promise<StreamIntervals> {
  const res = await fetch(`${HTTP_BASE}/intervals`);
  if (!res.ok) throw new Error(`Failed to fetch intervals: ${res.status}`);
  return res.json();
}

export async function setStreamIntervals(updates: StreamIntervals): Promise<StreamIntervals> {
  const res = await fetch(`${HTTP_BASE}/intervals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update intervals: ${res.status}`);
  return res.json();
}
