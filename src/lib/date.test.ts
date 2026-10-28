import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toDateInputValue } from "./date.ts";

describe("toDateInputValue", () => {
  it("keeps the local calendar day instead of the UTC date", () => {
    const localMidnight = new Date(2026, 9, 28, 0, 0, 0, 0);
    assert.equal(toDateInputValue(localMidnight), "2026-10-28");
  });

  it("keeps a date-only string as written", () => {
    assert.equal(toDateInputValue("2026-10-28"), "2026-10-28");
  });
});
