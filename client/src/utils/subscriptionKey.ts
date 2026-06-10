export function subscriptionKey(channel: string, symbol: string): string {
  return `${channel}:${symbol}`;
}

export function parseSubscriptionKey(key: string): { channel: string; symbol: string } {
  const sep = key.lastIndexOf(':');
  return {
    channel: key.slice(0, sep),
    symbol: key.slice(sep + 1),
  };
}
