const TEXT_ONLY_INPUT_TYPES = new Set(["text", "voice"]);

/**
 * テキストだけの抽出に使う既定モデル。
 * 本番の `.env` も OpenRouter 経由の `openai/gpt-4.1-mini` なので、未設定時はそれに合わせる。
 */
export const DEFAULT_TEXT_EXTRACTION_MODEL = "openai/gpt-4.1-mini";

/**
 * 画像・PDFなどファイル付き抽出の既定モデル。
 * `gpt-4.1-mini` と同じ OpenAI 系（OpenRouter の `openai/`）で、画像入力と JSON 出力に対応する上位モデル。
 * mini より文書・画面写真の読み取りが強い。Gemini へ切り替えると既存の OpenAI モデル指定と ZDR の通し方が変わるため、既定はこちら。
 */
export const DEFAULT_VISION_EXTRACTION_MODEL = "openai/gpt-4.1";

export type ExtractionModelEnv = {
  OPENROUTER_TEXT_MODEL?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_VISION_MODEL?: string;
};

export function usesStrongerExtractionModel(input: {
  imageUrl?: string | null;
  inputType?: string | null;
}) {
  if (input.imageUrl?.trim()) return true;
  const type = input.inputType?.trim().toLowerCase() || "";
  if (!type || TEXT_ONLY_INPUT_TYPES.has(type)) return false;
  return true;
}

export function selectExtractionModel(
  input: { imageUrl?: string | null; inputType?: string | null },
  env: ExtractionModelEnv = {
    OPENROUTER_TEXT_MODEL: process.env.OPENROUTER_TEXT_MODEL,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_VISION_MODEL: process.env.OPENROUTER_VISION_MODEL
  }
) {
  const textModel =
    env.OPENROUTER_TEXT_MODEL || env.OPENROUTER_MODEL || DEFAULT_TEXT_EXTRACTION_MODEL;
  const visionModel = env.OPENROUTER_VISION_MODEL || DEFAULT_VISION_EXTRACTION_MODEL;
  return usesStrongerExtractionModel(input) ? visionModel : textModel;
}
