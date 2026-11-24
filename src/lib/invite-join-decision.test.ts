import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteJoinUrl,
  decideInviteJoin,
  type InviteSnapshot
} from "./invite-join-decision.ts";

const now = new Date("2026-10-28T00:00:00.000Z");

function invite(patch: Partial<InviteSnapshot> = {}): InviteSnapshot {
  return {
    id: "invite_row",
    groupId: "group_1",
    groupName: "山田家",
    expiresAt: new Date("2026-11-04T00:00:00.000Z"),
    usedAt: null,
    ...patch
  };
}

describe("buildInviteJoinUrl", () => {
  it("keeps the /groups/join?token= form used by invite QR", () => {
    assert.equal(
      buildInviteJoinUrl("http://localhost:3000", "invite_abc_123"),
      "http://localhost:3000/groups/join?token=invite_abc_123"
    );
    assert.equal(
      buildInviteJoinUrl("https://example.com/", "invite_abc_123"),
      "https://example.com/groups/join?token=invite_abc_123"
    );
  });
});

describe("decideInviteJoin", () => {
  it("rejects a missing token or unknown invite", () => {
    assert.deepEqual(
      decideInviteJoin({ token: "  ", invite: invite(), alreadyMember: false, now }),
      {
        action: "reject",
        status: 400,
        message: "招待リンクが正しくありません"
      }
    );
    assert.equal(
      decideInviteJoin({ token: "missing", invite: null, alreadyMember: false, now }).action,
      "reject"
    );
  });

  it("joins once when the invite is still open", () => {
    const decision = decideInviteJoin({
      token: "invite_abc",
      invite: invite(),
      alreadyMember: false,
      now
    });
    assert.equal(decision.action, "join");
    if (decision.action === "join") {
      assert.equal(decision.groupName, "山田家");
    }
  });

  it("treats an already-member as joined even when the link was used or expired", () => {
    const used = decideInviteJoin({
      token: "invite_abc",
      invite: invite({ usedAt: new Date("2026-10-01T00:00:00.000Z") }),
      alreadyMember: true,
      now
    });
    assert.equal(used.action, "already-member");

    const expired = decideInviteJoin({
      token: "invite_abc",
      invite: invite({ expiresAt: new Date("2026-10-01T00:00:00.000Z") }),
      alreadyMember: true,
      now
    });
    assert.equal(expired.action, "already-member");
  });

  it("allows join when usedAt is set but the invite is still within expiry", () => {
    const used = decideInviteJoin({
      token: "invite_abc",
      invite: invite({ usedAt: now }),
      alreadyMember: false,
      now
    });
    assert.equal(used.action, "join");

    const expired = decideInviteJoin({
      token: "invite_abc",
      invite: invite({ expiresAt: now }),
      alreadyMember: false,
      now
    });
    assert.equal(expired.action, "reject");
    if (expired.action === "reject") assert.equal(expired.status, 410);
  });
});
