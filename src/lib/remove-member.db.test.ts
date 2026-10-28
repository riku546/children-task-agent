import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { MembershipError } from "./membership";
import { prisma } from "./prisma";
import { removeGroupMember } from "./repository";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("removeGroupMember database", {
  skip: hasDb ? false : "DATABASE_URL が無いためスキップ"
}, () => {
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  after(async () => {
    if (!hasDb) return;
    if (createdGroupIds.length > 0) {
      await prisma.task.deleteMany({ where: { groupId: { in: createdGroupIds } } });
      await prisma.familyMember.deleteMany({ where: { groupId: { in: createdGroupIds } } });
      await prisma.invite.deleteMany({ where: { groupId: { in: createdGroupIds } } });
      await prisma.child.deleteMany({ where: { groupId: { in: createdGroupIds } } });
      await prisma.familyGroup.deleteMany({ where: { id: { in: createdGroupIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  it("管理者はメンバーを外し、その人の担当タスクだけ未担当に戻す", async () => {
    const fixture = await createFamily();
    createdUserIds.push(fixture.owner.id, fixture.member.id);
    createdGroupIds.push(fixture.group.id);

    const assigned = await prisma.task.create({
      data: {
        groupId: fixture.group.id,
        title: "体操服",
        type: "持ち物",
        assigneeMemberId: fixture.memberMember.id
      }
    });
    const kept = await prisma.task.create({
      data: {
        groupId: fixture.group.id,
        title: "集金",
        type: "集金",
        assigneeMemberId: fixture.ownerMember.id
      }
    });

    const result = await removeGroupMember(
      { id: fixture.owner.id, name: "親A", defaultGroupId: fixture.group.id },
      fixture.group.id,
      fixture.memberMember.id
    );

    assert.equal(result.action, "removed");
    assert.equal(result.displayName, "親B");
    assert.equal(result.unassignedTaskCount, 1);
    assert.equal(result.promoteMemberId, null);

    const removed = await prisma.familyMember.findUnique({
      where: { id: fixture.memberMember.id }
    });
    assert.equal(removed, null);
    const assignedAfter = await prisma.task.findUnique({ where: { id: assigned.id } });
    const keptAfter = await prisma.task.findUnique({ where: { id: kept.id } });
    assert.equal(assignedAfter?.title, "体操服");
    assert.equal(assignedAfter?.assigneeMemberId, null);
    assert.equal(keptAfter?.assigneeMemberId, fixture.ownerMember.id);
    const ownerStill = await prisma.familyMember.findUnique({
      where: { id: fixture.ownerMember.id }
    });
    assert.equal(ownerStill?.role, "OWNER");
  });

  it("メンバーは他人を外せない", async () => {
    const fixture = await createFamily();
    createdUserIds.push(fixture.owner.id, fixture.member.id);
    createdGroupIds.push(fixture.group.id);

    await assert.rejects(
      () =>
        removeGroupMember(
          { id: fixture.member.id, name: "親B", defaultGroupId: fixture.group.id },
          fixture.group.id,
          fixture.ownerMember.id
        ),
      (error: unknown) => error instanceof MembershipError && error.status === 403
    );

    const ownerStill = await prisma.familyMember.findUnique({
      where: { id: fixture.ownerMember.id }
    });
    assert.ok(ownerStill);
  });

  it("最後の管理者が抜けると最も早いメンバーが管理者になる", async () => {
    const stamp = uniqueStamp();
    const owner = await prisma.user.create({
      data: { email: `owner_${stamp}@member-removal.test`, name: "親A" }
    });
    const early = await prisma.user.create({
      data: { email: `early_${stamp}@member-removal.test`, name: "早い人" }
    });
    const late = await prisma.user.create({
      data: { email: `late_${stamp}@member-removal.test`, name: "遅い人" }
    });
    createdUserIds.push(owner.id, early.id, late.id);

    const group = await prisma.familyGroup.create({
      data: {
        name: "退出テスト",
        createdById: owner.id,
        members: {
          create: [
            {
              userId: owner.id,
              role: "OWNER",
              displayName: "親A",
              createdAt: new Date("2026-01-03T00:00:00.000Z")
            },
            {
              userId: early.id,
              role: "MEMBER",
              displayName: "早い人",
              createdAt: new Date("2026-01-01T00:00:00.000Z")
            },
            {
              userId: late.id,
              role: "MEMBER",
              displayName: "遅い人",
              createdAt: new Date("2026-01-02T00:00:00.000Z")
            }
          ]
        }
      },
      include: { members: true }
    });
    createdGroupIds.push(group.id);
    const ownerMember = group.members.find((member) => member.userId === owner.id);
    const earlyMember = group.members.find((member) => member.userId === early.id);
    assert.ok(ownerMember && earlyMember);

    await prisma.task.create({
      data: {
        groupId: group.id,
        title: "お便り",
        type: "確認",
        assigneeMemberId: ownerMember.id
      }
    });

    const result = await removeGroupMember(
      { id: owner.id, name: "親A", defaultGroupId: group.id },
      group.id,
      ownerMember.id
    );

    assert.equal(result.action, "left");
    assert.equal(result.promoteMemberId, earlyMember.id);
    assert.equal(result.unassignedTaskCount, 1);
    const promoted = await prisma.familyMember.findUnique({ where: { id: earlyMember.id } });
    assert.equal(promoted?.role, "OWNER");
    const gone = await prisma.familyMember.findUnique({ where: { id: ownerMember.id } });
    assert.equal(gone, null);
    const task = await prisma.task.findFirst({ where: { groupId: group.id, title: "お便り" } });
    assert.equal(task?.assigneeMemberId, null);
    const groupStill = await prisma.familyGroup.findUnique({ where: { id: group.id } });
    assert.equal(groupStill?.createdById, owner.id);
  });
});

function uniqueStamp() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createFamily() {
  const stamp = uniqueStamp();
  const owner = await prisma.user.create({
    data: { email: `owner_${stamp}@member-removal.test`, name: "親A" }
  });
  const member = await prisma.user.create({
    data: { email: `member_${stamp}@member-removal.test`, name: "親B" }
  });
  const group = await prisma.familyGroup.create({
    data: {
      name: "削除テスト",
      createdById: owner.id,
      members: {
        create: [
          { userId: owner.id, role: "OWNER", displayName: "親A" },
          { userId: member.id, role: "MEMBER", displayName: "親B" }
        ]
      }
    },
    include: { members: true }
  });
  const ownerMember = group.members.find((item) => item.userId === owner.id);
  const memberMember = group.members.find((item) => item.userId === member.id);
  if (!ownerMember || !memberMember) {
    throw new Error("fixture members missing");
  }
  return { owner, member, group, ownerMember, memberMember };
}
