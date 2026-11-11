import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodedDataUrlByteLength,
  IMAGE_SIZE_LIMIT_MESSAGE,
  IMAGE_UNREADABLE_MESSAGE,
  imageDataUrlSizeError,
  imageFileSizeError,
  imageUrlSizeError,
  MAX_IMAGE_BYTES
} from "./image-size.ts";

function dataUrlWithBytes(byteLength: number) {
  return `data:image/jpeg;base64,${Buffer.alloc(byteLength, 0x61).toString("base64")}`;
}

describe("MAX_IMAGE_BYTES", () => {
  it("is 3.2 MiB, shared as the original file size", () => {
    assert.equal(MAX_IMAGE_BYTES, 3.2 * 1024 * 1024);
    assert.equal(IMAGE_SIZE_LIMIT_MESSAGE, "画像サイズは3.2MBまでです");
  });
});

describe("imageFileSizeError", () => {
  it("accepts a file at the largest whole byte under the limit", () => {
    assert.equal(imageFileSizeError(Math.floor(MAX_IMAGE_BYTES)), null);
    assert.equal(imageFileSizeError(0), null);
  });

  it("rejects one byte over the limit", () => {
    assert.equal(imageFileSizeError(Math.floor(MAX_IMAGE_BYTES) + 1), IMAGE_SIZE_LIMIT_MESSAGE);
  });

  it("rejects a size that cannot be measured", () => {
    assert.equal(imageFileSizeError(Number.NaN), IMAGE_UNREADABLE_MESSAGE);
    assert.equal(imageFileSizeError(-1), IMAGE_UNREADABLE_MESSAGE);
  });
});

describe("decodedDataUrlByteLength", () => {
  it("matches Buffer for canonical base64, including padding and whitespace", () => {
    const samples = ["", "YQ==", "YWI=", "YWJj", "YWJjZA==", "ab+/", "YQ==\n", "Y W Jj"];
    for (const payload of samples) {
      const expected = Buffer.from(payload.replace(/[\r\n\t ]/g, ""), "base64").length;
      assert.equal(decodedDataUrlByteLength(`data:image/png;base64,${payload}`), expected, payload);
    }
  });

  it("accepts a case-insensitive base64 token", () => {
    assert.equal(decodedDataUrlByteLength("data:image/jpeg;BASE64,YQ=="), 1);
  });

  it("counts percent-encoded data URLs in bytes", () => {
    assert.equal(decodedDataUrlByteLength("data:image/jpeg,hello%20world"), 11);
    assert.equal(decodedDataUrlByteLength("data:image/jpeg,%FF"), 1);
  });

  it("returns null for values that are not a measurable data URL", () => {
    assert.equal(decodedDataUrlByteLength("https://example.com/a.jpg"), null);
    assert.equal(decodedDataUrlByteLength("data:image/jpeg;base64,@@@@"), null);
    assert.equal(decodedDataUrlByteLength("data:image/jpeg;base64,YQ"), null);
  });
});

describe("imageUrlSizeError", () => {
  it("allows a data URL whose decoded size is the limit", () => {
    const byteLength = Math.floor(MAX_IMAGE_BYTES);
    const dataUrl = dataUrlWithBytes(byteLength);
    assert.equal(decodedDataUrlByteLength(dataUrl), byteLength);
    assert.equal(imageUrlSizeError(dataUrl), null);
    assert.equal(imageDataUrlSizeError(dataUrl), null);
  });

  it("returns 413 when the decoded image is over 3.2MB", () => {
    const dataUrl = dataUrlWithBytes(Math.floor(MAX_IMAGE_BYTES) + 1);
    assert.deepEqual(imageUrlSizeError(dataUrl), {
      status: 413,
      error: IMAGE_SIZE_LIMIT_MESSAGE
    });
    assert.equal(imageDataUrlSizeError(dataUrl), IMAGE_SIZE_LIMIT_MESSAGE);
  });

  it("returns 400 when a data URL cannot be measured", () => {
    assert.deepEqual(imageUrlSizeError("data:image/jpeg;base64,@@@@"), {
      status: 400,
      error: IMAGE_UNREADABLE_MESSAGE
    });
  });

  it("ignores an empty value and a remote URL", () => {
    assert.equal(imageUrlSizeError(undefined), null);
    assert.equal(imageUrlSizeError(null), null);
    assert.equal(imageUrlSizeError(""), null);
    assert.equal(imageUrlSizeError(`https://example.com/${"a".repeat(200)}`), null);
  });
});
