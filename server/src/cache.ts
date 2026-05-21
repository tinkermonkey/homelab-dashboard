interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedData<T>(
  key: string,
  ttl: number,
  generator: () => Promise<T>,
  onError?: (message: string) => void
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && now - entry.timestamp < entry.ttl * 1000) {
    return Promise.resolve(entry.data as T);
  }

  return generator()
    .then((data) => {
      cache.set(key, { data, timestamp: now, ttl });
      return data;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (onError) {
        onError(`Cache generator error for key "${key}": ${message}`);
      }
      throw error;
    });
}

export function peekCache<T>(key: string): T | null {
  const entry = cache.get(key);
  return entry ? (entry.data as T) : null;
}

export function clearCache(): void {
  cache.clear();
}
