import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_CHAT_MODEL, selectChatModel } from "./chat-model.ts";

describe("selectChatModel", () => {
  it("uses OPENROUTER_CHAT_MODEL when set", () => {
    const env = { OPENROUTER_CHAT_MODEL: "openai/gpt-5.6-luna" };
    assert.equal(selectChatModel(env), "openai/gpt-5.6-luna");
  });

  it("falls back to gpt-5.6-luna when OPENROUTER_CHAT_MODEL is unset", () => {
    assert.equal(DEFAULT_CHAT_MODEL, "openai/gpt-5.6-luna");
    assert.equal(selectChatModel({}), "openai/gpt-5.6-luna");
    assert.equal(selectChatModel({ OPENROUTER_CHAT_MODEL: "  " }), "openai/gpt-5.6-luna");
  });
});
