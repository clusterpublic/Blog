const store = new Map();
const PREFIX = 'blog:';

export function blogCacheKey(suffix) {
  return `${PREFIX}${suffix}`;
}

export function getBlogCache(key) {
  if (!store.has(key)) return undefined;
  return store.get(key);
}

export function setBlogCache(key, value) {
  store.set(key, value);
}

export function invalidateBlogCache() {
  for (const key of store.keys()) {
    if (key.startsWith(PREFIX)) store.delete(key);
  }
}

// Temporarily disabled — always fetch fresh from DB.
export async function getOrSetBlogCache(_key, fetchFresh) {
  const data = await fetchFresh();
  return { data, hit: false };
}

export function setBlogCacheHeaders(res, hit) {
  res.set('X-Blog-Cache', hit ? 'HIT' : 'MISS');
  // Never tell browsers/CDNs to cache — in-memory cache is server-side only.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
}
