import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daysFromToday, isOverdue, isSameDate, toDateInputValue } from "./date.ts";

describe("toDateInputValue", () => {
  it("keeps the local calendar day instead of the UTC date", () => {
    const localMidnight = new Date(2026, 9, 28, 0, 0, 0, 0);
    assert.equal(toDateInputValue(localMidnight), "2026-10-28");
  });

  it("keeps a date-only string as written", () => {
    assert.equal(toDateInputValue("2026-10-28"), "2026-10-28");
  });
});

describe("daysFromToday / isSameDate / isOverdue with fixed now", () => {
  // YYYY-MM-DD をローカル日付として解釈し、UTC 解釈による前日ずれが起きないことを確認する
  const now = new Date(2026, 10, 24, 15, 0, 0);

  it("daysFromToday", () => {
    assert.equal(daysFromToday("2026-11-23", now), -1);
    assert.equal(daysFromToday("2026-11-24", now), 0);
    assert.equal(daysFromToday("2026-11-25", now), 1);
    assert.equal(daysFromToday(null, now), null);
    assert.equal(daysFromToday("not-a-date", now), null);
  });

  it("isSameDate", () => {
    assert.equal(isSameDate("2026-11-24", 0, now), true);
    assert.equal(isSameDate("2026-11-25", 1, now), true);
    assert.equal(isSameDate(null, 0, now), false);
  });

  it("isOverdue", () => {
    assert.equal(isOverdue("2026-11-23", now), true);
    assert.equal(isOverdue("2026-11-24", now), false);
    assert.equal(isOverdue("2026-11-25", now), false);
    assert.equal(isOverdue(null, now), false);
  });
});
