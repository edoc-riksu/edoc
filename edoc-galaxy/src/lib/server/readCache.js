// Plan Day 39: caching for encounter reads. The module and encounter index
// only changes when someone re-runs the seed, yet every map, module and
// approach screen reads it. This keeps each answer in memory for a short
// time, per server instance, so most requests skip the database.
//
// Only shared index data goes in here, never anything about one player
// (lock state, progress): those are read fresh every time.

/**
 * A small time-limited cache. `get(key, load)` returns the cached value if it
 * is younger than `ttlMs`, otherwise calls `load()` once and caches the result.
 * Callers asking for the same key while a load is running share it, so a burst
 * of requests after expiry makes one database call, not one each. A failed
 * load is never cached.
 */
export function createTtlCache({ ttlMs, maxEntries = 500, now = () => Date.now() }) {
  const entries = new Map();
  const loading = new Map();

  return {
    async get(key, load) {
      const hit = entries.get(key);
      if (hit && now() < hit.expiresAt) return hit.value;
      if (loading.has(key)) return loading.get(key);

      const pending = (async () => {
        try {
          const value = await load();
          if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
          entries.set(key, { value, expiresAt: now() + ttlMs });
          return value;
        } finally {
          loading.delete(key);
        }
      })();
      loading.set(key, pending);
      return pending;
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    }
  };
}

// How long a re-seed can take to show up: at most this long per instance.
export const INDEX_TTL_MS = 60 * 1000;

export const indexCache = createTtlCache({ ttlMs: INDEX_TTL_MS });

// For routes whose answer is the same for every visitor: lets Vercel's CDN
// serve repeats for a minute and refresh in the background after that.
export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
};
