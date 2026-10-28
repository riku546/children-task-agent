/**
 * グループからの退出と、他メンバーの除外。
 *
 * 権限は FamilyRole に合わせる。
 * - 他人を外せるのは OWNER だけ。MEMBER は自分の退出だけできる。
 * - 最後の1人は抜けられない（グループが無人になる。グループ自体の削除はしない）。
 * - 最後の OWNER が抜けて他のメンバーが残るときは、参加が最も早い人を OWNER にする。
 *   役割の譲渡画面は無いので、createdAt で一意に決める。
 */

export type MemberSnapshot = {
  id: string;
  userId: string;
  role: "OWNER" | "MEMBER";
  displayName: string;
  createdAt: string;
};

export type MemberRemovalPlan = {
  action: "removed" | "left";
  memberId: string;
  displayName: string;
  promoteMemberId: string | null;
};

export type MemberRemovalResult = MemberRemovalPlan & {
  unassignedTaskCount: number;
};

export class MembershipError extends Error {
  readonly status: 403 | 404 | 409;

  constructor(status: 403 | 404 | 409, message: string) {
    super(message);
    this.name = "MembershipError";
    this.status = status;
  }
}

export function planMemberRemoval(input: {
  actorUserId: string;
  members: MemberSnapshot[];
  memberId: string;
}): MemberRemovalPlan {
  const actor = input.members.find((member) => member.userId === input.actorUserId);
  if (!actor) {
    throw new MembershipError(403, "このグループのメンバーではありません");
  }

  const target = input.members.find((member) => member.id === input.memberId);
  if (!target) {
    throw new MembershipError(404, "メンバーが見つかりません");
  }

  const isSelf = target.userId === actor.userId;
  if (!isSelf && actor.role !== "OWNER") {
    throw new MembershipError(403, "他のメンバーを外せるのは管理者だけです");
  }

  const remaining = input.members.filter((member) => member.id !== target.id);
  if (remaining.length === 0) {
    throw new MembershipError(
      409,
      isSelf ? "最後のメンバーはグループを抜けられません" : "最後のメンバーは外せません"
    );
  }

  let promoteMemberId: string | null = null;
  if (target.role === "OWNER") {
    const remainingOwners = remaining.filter((member) => member.role === "OWNER");
    if (remainingOwners.length === 0) {
      if (!isSelf) {
        throw new MembershipError(409, "最後の管理者は外せません");
      }
      const successor = [...remaining].sort(compareMembers)[0];
      promoteMemberId = successor.id;
    }
  }

  return {
    action: isSelf ? "left" : "removed",
    memberId: target.id,
    displayName: target.displayName,
    promoteMemberId
  };
}

function compareMembers(a: MemberSnapshot, b: MemberSnapshot) {
  const byDate = a.createdAt.localeCompare(b.createdAt);
  if (byDate !== 0) return byDate;
  return a.id.localeCompare(b.id);
}
