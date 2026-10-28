import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { acceptGroupInvite, InviteJoinError, previewGroupInvite } from "./invite-join.ts";

const databaseUrl = process.env.DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient() : null;
const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `invite-owner-${suffix}@example.com`;
const guestEmail = `invite-guest-${suffix}@example.com`;
const otherEmail = `invite-other-${suffix}@example.com`;

async function createUser(email: string, name: string) {
  if (!prisma) throw new Error("database unavailable");
  return prisma.user.create({ data: { email, name } });
}

describe("acceptGroupInvite database", {
  skip: databaseUrl ? false : "DATABASE_URL is not set"
}, () => {
  it("consumes a token once and keeps an existing member idempotent", async () => {
    if (!prisma) return;
    const owner = await createUser(ownerEmail, "オーナー");
    const guest = await createUser(guestEmail, "ゲスト");
    const other = await createUser(otherEmail, "別の人");
    const group = await prisma.familyGroup.create({
      data: {
        name: "DB招待家",
        createdById: owner.id,
        members: {
          create: { userId: owner.id, role: "OWNER", displayName: "オーナー" }
        }
      }
    });
    const invite = await prisma.invite.create({
      data: {
        groupId: group.id,
        token: `invite_${suffix}`,
        expiresAt: new Date(Date.now() + 86_400_000)
      }
    });

    const preview = await previewGroupInvite(
      { id: guest.id, name: guest.name || "ゲスト" },
      invite.token
    );
    assert.equal(preview.groupName, "DB招待家");
    assert.equal(preview.alreadyMember, false);

    const joined = await acceptGroupInvite({ id: guest.id, name: "ゲスト" }, invite.token);
    assert.equal(joined.alreadyMember, false);

    const member = await prisma.familyMember.findUnique({
      where: { userId_groupId: { userId: guest.id, groupId: group.id } }
    });
    assert.equal(member?.role, "MEMBER");
    assert.equal(member?.displayName, "ゲスト");
    const consumed = await prisma.invite.findUnique({ where: { id: invite.id } });
    assert.ok(consumed?.usedAt);

    const again = await acceptGroupInvite({ id: guest.id, name: "ゲスト" }, invite.token);
    assert.equal(again.alreadyMember, true);

    const ownerView = await acceptGroupInvite({ id: owner.id, name: "オーナー" }, invite.token);
    assert.equal(ownerView.alreadyMember, true);

    await assert.rejects(
      () => acceptGroupInvite({ id: other.id, name: "別の人" }, invite.token),
      (error: unknown) => error instanceof InviteJoinError && error.status === 410
    );
  });

  after(async () => {
    if (!prisma) return;
    const users = await prisma.user.findMany({
      where: { email: { in: [ownerEmail, guestEmail, otherEmail] } },
      select: { id: true }
    });
    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) {
      await prisma.$disconnect();
      return;
    }
    const groups = await prisma.familyGroup.findMany({
      where: { createdById: { in: userIds } },
      select: { id: true }
    });
    const groupIds = groups.map((group) => group.id);
    if (groupIds.length > 0) {
      await prisma.familyMember.deleteMany({ where: { groupId: { in: groupIds } } });
      await prisma.invite.deleteMany({ where: { groupId: { in: groupIds } } });
      await prisma.familyGroup.deleteMany({ where: { id: { in: groupIds } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
});
