/** テキストでも画像・ファイルでも、未設定時はこのモデルを使う。 */
export const DEFAULT_EXTRACTION_MODEL = "openai/gpt-5.6-luna";

export function selectExtractionModel(env?: { OPENROUTER_MODEL?: string }) {
  const configured = env ? env.OPENROUTER_MODEL : process.env.OPENROUTER_MODEL;
  return configured?.trim() || DEFAULT_EXTRACTION_MODEL;
}
