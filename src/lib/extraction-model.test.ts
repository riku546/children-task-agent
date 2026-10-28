import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_TEXT_EXTRACTION_MODEL,
  DEFAULT_VISION_EXTRACTION_MODEL,
  selectExtractionModel
} from "./extraction-model.ts";

const env = {
  OPENROUTER_TEXT_MODEL: "openai/gpt-4.1-mini",
  OPENROUTER_VISION_MODEL: "openai/gpt-4.1"
};

describe("selectExtractionModel", () => {
  it("keeps text and voice on the mini model", () => {
    assert.equal(selectExtractionModel({ inputType: "text" }, env), "openai/gpt-4.1-mini");
    assert.equal(selectExtractionModel({ inputType: "voice" }, env), "openai/gpt-4.1-mini");
    assert.equal(selectExtractionModel({}, env), "openai/gpt-4.1-mini");
  });

  it("uses the stronger model when an image or file is attached", () => {
    assert.equal(
      selectExtractionModel({ inputType: "image", imageUrl: "data:image/jpeg;base64,abc" }, env),
      "openai/gpt-4.1"
    );
    assert.equal(selectExtractionModel({ inputType: "pdf" }, env), "openai/gpt-4.1");
    assert.equal(selectExtractionModel({ inputType: "file" }, env), "openai/gpt-4.1");
    assert.equal(
      selectExtractionModel({ inputType: "text", imageUrl: "https://example.com/a.png" }, env),
      "openai/gpt-4.1"
    );
  });

  it("uses gpt-5.6-luna for text and images when the env vars are unset", () => {
    assert.equal(DEFAULT_TEXT_EXTRACTION_MODEL, "openai/gpt-5.6-luna");
    assert.equal(DEFAULT_VISION_EXTRACTION_MODEL, "openai/gpt-5.6-luna");
    assert.equal(
      selectExtractionModel({ inputType: "text" }, { OPENROUTER_MODEL: "openai/gpt-4.1-mini" }),
      "openai/gpt-5.6-luna"
    );
    assert.equal(selectExtractionModel({ inputType: "voice" }, {}), "openai/gpt-5.6-luna");
    assert.equal(selectExtractionModel({ inputType: "image" }, {}), "openai/gpt-5.6-luna");
    assert.equal(selectExtractionModel({ inputType: "pdf" }, {}), "openai/gpt-5.6-luna");
  });
});
