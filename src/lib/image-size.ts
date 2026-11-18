/**
 * 元画像のバイト数の上限。取込画面と POST /api/ai/extract でこの値だけを使う。
 * 画像は data URL の base64 として JSON に載るので、転送サイズは約 4/3 倍になる。
 * 3.2MB ならその JSON が Vercel Functions のリクエスト上限 4.5MB に収まる。
 */
export const MAX_IMAGE_BYTES = 3.2 * 1024 * 1024;

export const IMAGE_SIZE_LIMIT_MESSAGE = "画像サイズは3.2MBまでです";

export const IMAGE_UNREADABLE_MESSAGE = "画像データを読み取れませんでした";

export type ImageUrlSizeError = {
  status: 400 | 413;
  error: string;
};

export function imageFileSizeError(byteLength: number): string | null {
  if (!Number.isFinite(byteLength) || byteLength < 0) return IMAGE_UNREADABLE_MESSAGE;
  if (byteLength > MAX_IMAGE_BYTES) return IMAGE_SIZE_LIMIT_MESSAGE;
  return null;
}

function isBase64DataUrl(meta: string) {
  return meta.split(";").some((part) => part.trim().toLowerCase() === "base64");
}

/** 標準 base64（空白は除去）のデコード後バイト数。不正なら null。 */
function base64DecodedByteLength(payload: string): number | null {
  const cleaned = payload.replace(/[\r\n\t ]/g, "");
  if (cleaned.length === 0) return 0;
  if (cleaned.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) return null;
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return (cleaned.length / 4) * 3 - padding;
}

/** data URL の非 base64 ペイロード。%HH は 1 バイトとして数える。 */
function percentDecodedByteLength(payload: string): number | null {
  let bytes = 0;
  for (let index = 0; index < payload.length; index += 1) {
    const char = payload[index];
    if (char === "%") {
      const hex = payload.slice(index + 1, index + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return null;
      bytes += 1;
      index += 2;
      continue;
    }
    if (char === undefined || char.charCodeAt(0) > 0x7f) return null;
    bytes += 1;
  }
  return bytes;
}

/**
 * `data:` URL のデコード後バイト数。data URL でない、または計測できないときは null。
 */
export function decodedDataUrlByteLength(value: string): number | null {
  if (!/^data:/i.test(value)) return null;
  const comma = value.indexOf(",");
  if (comma < 0) return null;
  const meta = value.slice(5, comma);
  const payload = value.slice(comma + 1);
  if (isBase64DataUrl(meta)) return base64DecodedByteLength(payload);
  return percentDecodedByteLength(payload);
}

/** 取込画面に出す文言。問題がなければ null。 */
export function imageDataUrlSizeError(dataUrl: string): string | null {
  const bytes = decodedDataUrlByteLength(dataUrl);
  if (bytes === null) return IMAGE_UNREADABLE_MESSAGE;
  return imageFileSizeError(bytes);
}

/**
 * POST /api/ai/extract の imageUrl。
 * base64 data URL のデコード後サイズが上限を超えたら 413。計測できない data URL は 400。
 * data URL でなければ画像本体が乗っていないので null。
 */
export function imageUrlSizeError(imageUrl: string | null | undefined): ImageUrlSizeError | null {
  if (!imageUrl) return null;
  if (!/^data:/i.test(imageUrl)) return null;
  const bytes = decodedDataUrlByteLength(imageUrl);
  if (bytes === null) return { status: 400, error: IMAGE_UNREADABLE_MESSAGE };
  if (bytes > MAX_IMAGE_BYTES) return { status: 413, error: IMAGE_SIZE_LIMIT_MESSAGE };
  return null;
}
