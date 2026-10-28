import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_EXTRACTION_MODEL, selectExtractionModel } from "./extraction-model.ts";

describe("selectExtractionModel", () => {
  it("uses OPENROUTER_MODEL for every input", () => {
    const env = { OPENROUTER_MODEL: "openai/gpt-5.6-luna" };
    assert.equal(selectExtractionModel(env), "openai/gpt-5.6-luna");
  });

  it("falls back to gpt-5.6-luna when OPENROUTER_MODEL is unset", () => {
    assert.equal(DEFAULT_EXTRACTION_MODEL, "openai/gpt-5.6-luna");
    assert.equal(selectExtractionModel({}), "openai/gpt-5.6-luna");
    assert.equal(selectExtractionModel({ OPENROUTER_MODEL: "  " }), "openai/gpt-5.6-luna");
  });
});
