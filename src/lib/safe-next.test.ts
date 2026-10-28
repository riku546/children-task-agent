import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyNextPath, sanitizeNextPath } from "./safe-next.ts";

describe("sanitizeNextPath", () => {
  it("keeps the invite join path and token query", () => {
    assert.equal(
      sanitizeNextPath("/groups/join?token=invite_abc"),
      "/groups/join?token=invite_abc"
    );
  });

  it("falls back when the value is empty or off-site", () => {
    assert.equal(sanitizeNextPath(null), "/dashboard");
    assert.equal(sanitizeNextPath(""), "/dashboard");
    assert.equal(sanitizeNextPath("https://evil.example/phish"), "/dashboard");
    assert.equal(sanitizeNextPath("//evil.example"), "/dashboard");
    assert.equal(sanitizeNextPath("/\\evil.example"), "/dashboard");
  });
});

describe("applyNextPath", () => {
  it("sends a logged-in visit to /login back to the invite URL", () => {
    const current = new URL("http://localhost:3000/login?next=%2Fgroups%2Fjoin%3Ftoken%3Dabc");
    const target = applyNextPath(current, current.searchParams.get("next"));
    assert.equal(target.origin, "http://localhost:3000");
    assert.equal(target.pathname, "/groups/join");
    assert.equal(target.searchParams.get("token"), "abc");
    assert.equal(target.searchParams.get("next"), null);
  });
});
