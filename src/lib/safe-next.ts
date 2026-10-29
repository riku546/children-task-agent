const FALLBACK_PATH = "/dashboard";

/**
 * ログイン後の戻り先。オープンリダイレクトにならない相対パスだけを返す。
 * クエリ（招待トークンなど）は残す。
 */
export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value) return FALLBACK_PATH;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return FALLBACK_PATH;
  }
  if (value.includes("\\") || value.includes("://")) return FALLBACK_PATH;

  try {
    const url = new URL(value, "http://local.test");
    if (url.origin !== "http://local.test") return FALLBACK_PATH;
    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return FALLBACK_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK_PATH;
  }
}

/** ログイン画面の next を、オリジンを保った遷移先URLにする。 */
export function applyNextPath(current: URL, next: string | null | undefined): URL {
  const parsed = new URL(sanitizeNextPath(next), current.origin);
  const target = new URL(current.origin);
  target.pathname = parsed.pathname;
  target.search = parsed.search;
  target.hash = parsed.hash;
  return target;
}
