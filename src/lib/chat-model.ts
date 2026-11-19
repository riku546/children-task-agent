/** チャット操作係用。TODO抽出の OPENROUTER_MODEL とは別。 */
export const DEFAULT_CHAT_MODEL = "openai/gpt-5.6-luna";

export function selectChatModel(env?: { OPENROUTER_CHAT_MODEL?: string }) {
  const configured = env ? env.OPENROUTER_CHAT_MODEL : process.env.OPENROUTER_CHAT_MODEL;
  return configured?.trim() || DEFAULT_CHAT_MODEL;
}
