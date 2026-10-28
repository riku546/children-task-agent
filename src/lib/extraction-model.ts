const TEXT_ONLY_INPUT_TYPES = new Set(["text", "voice"]);

/**
 * テキストも画像・ファイルも、未設定時は同じモデルを使う。
 */
export const DEFAULT_TEXT_EXTRACTION_MODEL = "openai/gpt-5.6-luna";
export const DEFAULT_VISION_EXTRACTION_MODEL = "openai/gpt-5.6-luna";

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
  const textModel = env.OPENROUTER_TEXT_MODEL || DEFAULT_TEXT_EXTRACTION_MODEL;
  const visionModel = env.OPENROUTER_VISION_MODEL || DEFAULT_VISION_EXTRACTION_MODEL;
  return usesStrongerExtractionModel(input) ? visionModel : textModel;
}
