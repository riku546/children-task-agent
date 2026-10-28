import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type MemberSnapshot, MembershipError, planMemberRemoval } from "./membership";
import { memoryStore, nowIso } from "./memory-store";
import { removeGroupMember } from "./repository";

function member(
  partial: Pick<MemberSnapshot, "id" | "userId" | "role"> & Partial<MemberSnapshot>
): MemberSnapshot {
  return {
    displayName: partial.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial
  };
}

function expectMembershipError(run: () => void, status: number, pattern: RegExp) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof MembershipError);
    assert.equal(error.status, status);
    assert.match(error.message, pattern);
    return true;
  });
}

describe("planMemberRemoval", () => {
  const owner = member({
    id: "owner",
    userId: "user_owner",
    role: "OWNER",
    displayName: "親A",
    createdAt: "2026-01-01T00:00:00.000Z"
  });
  const otherOwner = member({
    id: "owner_2",
    userId: "user_owner_2",
    role: "OWNER",
    displayName: "親B",
    createdAt: "2026-01-02T00:00:00.000Z"
  });
  const earlyMember = member({
    id: "member_early",
    userId: "user_early",
    role: "MEMBER",
    displayName: "早い人",
    createdAt: "2026-01-02T00:00:00.000Z"
  });
  const lateMember = member({
    id: "member_late",
    userId: "user_late",
    role: "MEMBER",
    displayName: "遅い人",
    createdAt: "2026-01-03T00:00:00.000Z"
  });

  it("管理者は他のメンバーを外せる", () => {
    const plan = planMemberRemoval({
      actorUserId: owner.userId,
      memberId: earlyMember.id,
      members: [owner, earlyMember]
    });
    assert.deepEqual(plan, {
      action: "removed",
      memberId: earlyMember.id,
      displayName: "早い人",
      promoteMemberId: null
    });
  });

  it("メンバーは他人を外せない", () => {
    expectMembershipError(
      () =>
        planMemberRemoval({
          actorUserId: earlyMember.userId,
          memberId: lateMember.id,
          members: [owner, earlyMember, lateMember]
        }),
      403,
      /管理者/
    );
  });

  it("メンバーは自分でグループを抜けられる", () => {
    const plan = planMemberRemoval({
      actorUserId: earlyMember.userId,
      memberId: earlyMember.id,
      members: [owner, earlyMember]
    });
    assert.equal(plan.action, "left");
    assert.equal(plan.promoteMemberId, null);
  });

  it("最後の1人は抜けられない", () => {
    expectMembershipError(
      () =>
        planMemberRemoval({
          actorUserId: owner.userId,
          memberId: owner.id,
          members: [owner]
        }),
      409,
      /最後のメンバー/
    );
  });

  it("最後の管理者が抜けると、参加が最も早いメンバーが管理者になる", () => {
    const plan = planMemberRemoval({
      actorUserId: owner.userId,
      memberId: owner.id,
      members: [owner, lateMember, earlyMember]
    });
    assert.equal(plan.action, "left");
    assert.equal(plan.promoteMemberId, earlyMember.id);
  });

  it("参加日時が同じときは id の順で後任を決める", () => {
    const first = member({
      id: "m_a",
      userId: "user_a",
      role: "MEMBER",
      createdAt: "2026-02-01T00:00:00.000Z"
    });
    const second = member({
      id: "m_b",
      userId: "user_b",
      role: "MEMBER",
      createdAt: "2026-02-01T00:00:00.000Z"
    });
    const plan = planMemberRemoval({
      actorUserId: owner.userId,
      memberId: owner.id,
      members: [owner, second, first]
    });
    assert.equal(plan.promoteMemberId, first.id);
  });

  it("管理者がもう一人いるときは昇格しない", () => {
    const plan = planMemberRemoval({
      actorUserId: owner.userId,
      memberId: otherOwner.id,
      members: [owner, otherOwner, earlyMember]
    });
    assert.equal(plan.action, "removed");
    assert.equal(plan.promoteMemberId, null);
  });

  it("自分を外す操作は退出になる", () => {
    const plan = planMemberRemoval({
      actorUserId: owner.userId,
      memberId: owner.id,
      members: [owner, otherOwner]
    });
    assert.equal(plan.action, "left");
    assert.equal(plan.promoteMemberId, null);
  });

  it("いないメンバーは 404", () => {
    expectMembershipError(
      () =>
        planMemberRemoval({
          actorUserId: owner.userId,
          memberId: "missing",
          members: [owner, earlyMember]
        }),
      404,
      /見つかりません/
    );
  });

  it("グループ外のユーザーは操作できない", () => {
    expectMembershipError(
      () =>
        planMemberRemoval({
          actorUserId: "stranger",
          memberId: earlyMember.id,
          members: [owner, earlyMember]
        }),
      403,
      /メンバーではありません/
    );
  });
});

describe("removeGroupMember memory store", () => {
  it("除外すると担当タスクだけ未担当に戻り、タスク自体は残る", async () => {
    const groups = memoryStore.groups.splice(0, memoryStore.groups.length);
    const tasks = memoryStore.tasks.splice(0, memoryStore.tasks.length);
    const invites = memoryStore.invites.splice(0, memoryStore.invites.length);

    try {
      const groupId = "group_remove_test";
      memoryStore.groups.push({
        id: groupId,
        name: "テスト家",
        createdById: "user_owner",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        members: [
          {
            id: "member_owner",
            userId: "user_owner",
            groupId,
            role: "OWNER",
            displayName: "親A",
            createdAt: "2026-01-01T00:00:00.000Z"
          },
          {
            id: "member_other",
            userId: "user_other",
            groupId,
            role: "MEMBER",
            displayName: "親B",
            createdAt: "2026-01-02T00:00:00.000Z"
          }
        ],
        children: []
      });
      memoryStore.tasks.push(
        {
          id: "task_assigned",
          groupId,
          childId: null,
          childName: null,
          title: "提出物",
          description: null,
          type: "提出",
          dueDate: null,
          assigneeMemberId: "member_other",
          assigneeName: "親B",
          priority: "medium",
          status: "TODO",
          sourceText: null,
          googleEventId: null,
          createdAt: nowIso(),
          updatedAt: nowIso()
        },
        {
          id: "task_kept",
          groupId,
          childId: null,
          childName: null,
          title: "自分の用事",
          description: null,
          type: "確認",
          dueDate: null,
          assigneeMemberId: "member_owner",
          assigneeName: "親A",
          priority: "low",
          status: "TODO",
          sourceText: null,
          googleEventId: null,
          createdAt: nowIso(),
          updatedAt: nowIso()
        },
        {
          id: "task_other_group",
          groupId: "group_other",
          childId: null,
          childName: null,
          title: "別グループ",
          description: null,
          type: "確認",
          dueDate: null,
          assigneeMemberId: "member_other",
          assigneeName: "親B",
          priority: "low",
          status: "TODO",
          sourceText: null,
          googleEventId: null,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      );

      const result = await removeGroupMember(
        { id: "user_owner", name: "親A", defaultGroupId: groupId },
        groupId,
        "member_other"
      );

      assert.equal(result.action, "removed");
      assert.equal(result.unassignedTaskCount, 1);
      const group = memoryStore.groups.find((item) => item.id === groupId);
      assert.deepEqual(
        group?.members.map((item) => item.id),
        ["member_owner"]
      );
      const unassigned = memoryStore.tasks.find((task) => task.id === "task_assigned");
      assert.equal(unassigned?.title, "提出物");
      assert.equal(unassigned?.assigneeMemberId, null);
      assert.equal(unassigned?.assigneeName, null);
      assert.equal(
        memoryStore.tasks.find((task) => task.id === "task_kept")?.assigneeMemberId,
        "member_owner"
      );
      assert.equal(
        memoryStore.tasks.find((task) => task.id === "task_other_group")?.assigneeMemberId,
        "member_other"
      );
    } finally {
      memoryStore.groups.splice(0, memoryStore.groups.length, ...groups);
      memoryStore.tasks.splice(0, memoryStore.tasks.length, ...tasks);
      memoryStore.invites.splice(0, memoryStore.invites.length, ...invites);
    }
  });

  it("最後の管理者が抜けると後任が管理者になり、元の担当は外れる", async () => {
    const groups = memoryStore.groups.splice(0, memoryStore.groups.length);
    const tasks = memoryStore.tasks.splice(0, memoryStore.tasks.length);

    try {
      const groupId = "group_leave_test";
      memoryStore.groups.push({
        id: groupId,
        name: "テスト家",
        createdById: "user_owner",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        members: [
          {
            id: "member_owner",
            userId: "user_owner",
            groupId,
            role: "OWNER",
            displayName: "親A",
            createdAt: "2026-01-03T00:00:00.000Z"
          },
          {
            id: "member_early",
            userId: "user_early",
            groupId,
            role: "MEMBER",
            displayName: "早い人",
            createdAt: "2026-01-01T00:00:00.000Z"
          },
          {
            id: "member_late",
            userId: "user_late",
            groupId,
            role: "MEMBER",
            displayName: "遅い人",
            createdAt: "2026-01-02T00:00:00.000Z"
          }
        ],
        children: []
      });
      memoryStore.tasks.push({
        id: "task_owner",
        groupId,
        childId: null,
        childName: null,
        title: "集金",
        description: null,
        type: "集金",
        dueDate: null,
        assigneeMemberId: "member_owner",
        assigneeName: "親A",
        priority: "high",
        status: "TODO",
        sourceText: null,
        googleEventId: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      });

      const result = await removeGroupMember(
        { id: "user_owner", name: "親A", defaultGroupId: groupId },
        groupId,
        "member_owner"
      );

      assert.equal(result.action, "left");
      assert.equal(result.promoteMemberId, "member_early");
      assert.equal(result.unassignedTaskCount, 1);
      const group = memoryStore.groups.find((item) => item.id === groupId);
      assert.equal(group?.members.find((item) => item.id === "member_early")?.role, "OWNER");
      assert.equal(
        group?.members.some((item) => item.id === "member_owner"),
        false
      );
      assert.equal(
        memoryStore.tasks.find((task) => task.id === "task_owner")?.assigneeMemberId,
        null
      );
    } finally {
      memoryStore.groups.splice(0, memoryStore.groups.length, ...groups);
      memoryStore.tasks.splice(0, memoryStore.tasks.length, ...tasks);
    }
  });

  it("最後のメンバーの退出は拒否し、データを残す", async () => {
    const groups = memoryStore.groups.splice(0, memoryStore.groups.length);

    try {
      const groupId = "group_solo_test";
      memoryStore.groups.push({
        id: groupId,
        name: "ひとり",
        createdById: "user_owner",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        members: [
          {
            id: "member_owner",
            userId: "user_owner",
            groupId,
            role: "OWNER",
            displayName: "親A",
            createdAt: "2026-01-01T00:00:00.000Z"
          }
        ],
        children: []
      });

      await assert.rejects(
        () =>
          removeGroupMember(
            { id: "user_owner", name: "親A", defaultGroupId: groupId },
            groupId,
            "member_owner"
          ),
        (error: unknown) => {
          assert.ok(error instanceof MembershipError);
          assert.equal(error.status, 409);
          return true;
        }
      );
      assert.equal(memoryStore.groups.find((item) => item.id === groupId)?.members.length, 1);
    } finally {
      memoryStore.groups.splice(0, memoryStore.groups.length, ...groups);
    }
  });

  it("参加していないグループは 404", async () => {
    await assert.rejects(
      () =>
        removeGroupMember(
          { id: "stranger", name: "他人", defaultGroupId: null },
          "missing_group",
          "missing_member"
        ),
      (error: unknown) => {
        assert.ok(error instanceof MembershipError);
        assert.equal(error.status, 404);
        return true;
      }
    );
  });
});
