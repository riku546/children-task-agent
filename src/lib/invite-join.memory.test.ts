import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { acceptInviteInMemory, previewInviteInMemory } from "./invite-join.ts";
import { createId, memoryStore, nowIso } from "./memory-store.ts";

const createdGroupIds: string[] = [];

function seedGroup(ownerId: string) {
  const groupId = createId("group");
  const token = createId("invite");
  memoryStore.groups.push({
    id: groupId,
    name: "招待テスト家",
    createdById: ownerId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    members: [
      {
        id: createId("member"),
        userId: ownerId,
        groupId,
        role: "OWNER",
        displayName: "保護者",
        createdAt: nowIso()
      }
    ],
    children: []
  });
  memoryStore.invites.push({
    id: createId("inviteRow"),
    groupId,
    token,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    usedAt: null,
    createdAt: nowIso()
  });
  createdGroupIds.push(groupId);
  return { groupId, token };
}

afterEach(() => {
  memoryStore.groups = memoryStore.groups.filter((group) => !createdGroupIds.includes(group.id));
  memoryStore.invites = memoryStore.invites.filter(
    (invite) => !createdGroupIds.includes(invite.groupId)
  );
  createdGroupIds.length = 0;
});

describe("acceptInviteInMemory", () => {
  it("adds multiple visitors with the same token until expiry", () => {
    const { groupId, token } = seedGroup("owner_1");
    const preview = previewInviteInMemory("guest_1", token);
    assert.equal(preview.alreadyMember, false);
    assert.equal(preview.groupName, "招待テスト家");

    const joined = acceptInviteInMemory({ id: "guest_1", name: "ゲスト" }, token);
    assert.equal(joined.alreadyMember, false);
    const group = memoryStore.groups.find((item) => item.id === groupId);
    const member = group?.members.find((item) => item.userId === "guest_1");
    assert.equal(member?.role, "MEMBER");
    assert.equal(member?.displayName, "ゲスト");
    assert.equal(memoryStore.invites.find((item) => item.token === token)?.usedAt, null);

    const guest2 = acceptInviteInMemory({ id: "guest_2", name: "次の人" }, token);
    assert.equal(guest2.alreadyMember, false);
    assert.equal(group?.members.filter((item) => item.userId === "guest_2").length, 1);
    assert.equal(group?.members.length, 3);

    const again = acceptInviteInMemory({ id: "guest_1", name: "ゲスト" }, token);
    assert.equal(again.alreadyMember, true);
    assert.equal(group?.members.filter((item) => item.userId === "guest_1").length, 1);
  });

  it("keeps idempotent when the owner opens their own link", () => {
    const { token } = seedGroup("owner_2");
    const view = acceptInviteInMemory({ id: "owner_2", name: "保護者" }, token);
    assert.equal(view.alreadyMember, true);
    assert.equal(memoryStore.invites.find((item) => item.token === token)?.usedAt, null);
  });
});
