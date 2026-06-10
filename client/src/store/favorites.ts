const KEY = 'crypto_favorites';

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function toggleFavorite(symbol: string): string[] {
  const current = getFavorites();
  const updated = current.includes(symbol)
    ? current.filter((s) => s !== symbol)
    : [...current, symbol];
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}
