import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { needsOnboarding, shouldEnforceOnboarding } from "./onboarding.ts";
import { isTaskTakenByMe } from "./task-claim.ts";

describe("needsOnboarding", () => {
  it("shows the guide on first login when only the placeholder child exists", () => {
    assert.equal(
      needsOnboarding({
        completed: false,
        groups: [{ children: [{ name: "未設定" }] }]
      }),
      true
    );
  });

  it("shows the guide when there is no group yet", () => {
    assert.equal(needsOnboarding({ completed: false, groups: [] }), true);
  });

  it("hides the guide after skip or when named children already exist", () => {
    assert.equal(
      needsOnboarding({
        completed: true,
        groups: [{ children: [{ name: "未設定" }] }]
      }),
      false
    );
    assert.equal(
      needsOnboarding({
        completed: false,
        groups: [{ children: [{ name: "はな" }] }]
      }),
      false
    );
  });
});

describe("shouldEnforceOnboarding", () => {
  it("allows the onboarding flow and its import step", () => {
    assert.equal(shouldEnforceOnboarding("/onboarding", null), false);
    assert.equal(shouldEnforceOnboarding("/tasks/new", "onboarding"), false);
    assert.equal(shouldEnforceOnboarding("/dashboard", null), true);
    assert.equal(shouldEnforceOnboarding("/tasks/new", null), true);
    assert.equal(shouldEnforceOnboarding("/login", null), false);
  });
});

describe("isTaskTakenByMe", () => {
  it("matches the family member id, not only the user id", () => {
    assert.equal(isTaskTakenByMe("member_1", ["member_1"], "user_1"), true);
    assert.equal(isTaskTakenByMe("member_2", ["member_1"], "user_1"), false);
    assert.equal(isTaskTakenByMe("user_1", [], "user_1"), true);
    assert.equal(isTaskTakenByMe(null, ["member_1"], "user_1"), false);
  });
});
