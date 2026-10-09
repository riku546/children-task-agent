"use client";

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// メモリ内キャッシュ（同一ブラウザセッション・タブ内で共有）
const cache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

// デフォルトのTTL（60秒間はサーバーへ通信せず即時返却）
const DEFAULT_TTL_MS = 60 * 1000;

/**
 * キャッシュからデータを同期的に取得。有効期限内なら返し、なければ null
 */
export function getCachedData<T>(url: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const cached = cache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttlMs) return null;
  return cached.data as T;
}

/**
 * キャッシュ付きでJSONデータをフェッチする
 * - 有効期限内のキャッシュがあればネットワーク通信をスキップして即時返却
 * - 同一URLへの同時リクエストは1本に統合（重複リクエストの防止）
 * - force: true で強制再取得し、キャッシュを最新化
 */
export async function fetchJsonWithCache<T>(
  url: string,
  options?: {
    ttlMs?: number;
    force?: boolean;
    init?: RequestInit;
  }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const force = options?.force ?? false;
  const now = Date.now();

  const cached = cache.get(url);
  if (!force && cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  // 既に同一URLがフェッチ中の場合はそのPromiseを再利用
  if (!force && inFlightRequests.has(url)) {
    return inFlightRequests.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url, options?.init);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch ${url}`);
      }
      const data = await res.json();
      cache.set(url, { data, timestamp: Date.now() });
      return data as T;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
}

/**
 * キャッシュを手動でセット（楽観的更新などに利用）
 */
export function setCachedData<T>(url: string, data: T) {
  cache.set(url, { data, timestamp: Date.now() });
}

/**
 * 指定したプレフィックスに一致するキャッシュを破棄
 * 例: invalidateCache('/api/tasks') で /api/tasks および /api/tasks/... をクリア
 */
export function invalidateCache(urlPrefix?: string) {
  if (!urlPrefix) {
    cache.clear();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(urlPrefix)) {
      cache.delete(key);
    }
  }
}
