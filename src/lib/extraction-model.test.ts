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

  it("falls back to the legacy text env and the built-in defaults", () => {
    assert.equal(
      selectExtractionModel({ inputType: "text" }, { OPENROUTER_MODEL: "openai/gpt-4.1-mini" }),
      "openai/gpt-4.1-mini"
    );
    assert.equal(selectExtractionModel({ inputType: "text" }, {}), DEFAULT_TEXT_EXTRACTION_MODEL);
    assert.equal(
      selectExtractionModel({ inputType: "image" }, {}),
      DEFAULT_VISION_EXTRACTION_MODEL
    );
  });
});
