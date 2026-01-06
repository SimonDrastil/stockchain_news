type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function withCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>) {
  const cached = getCache<T>(key);
  if (cached) return Promise.resolve(cached);
  return fetcher().then((value) => {
    setCache(key, value, ttlMs);
    return value;
  });
}
