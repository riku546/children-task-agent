/** #17 のQRが符号化する参加URL。形式は変えない。 */
export const INVITE_JOIN_PATH = "/groups/join";

export function buildInviteJoinUrl(origin: string, token: string) {
  const url = new URL(INVITE_JOIN_PATH, origin);
  url.searchParams.set("token", token);
  return url.toString();
}

export type InviteSnapshot = {
  id: string;
  groupId: string;
  groupName: string;
  expiresAt: Date;
  usedAt: Date | null;
};

type AcceptedInvite = {
  inviteId: string;
  groupId: string;
  groupName: string;
  expiresAt: string;
};

export type InviteDecision =
  | { action: "reject"; status: 400 | 404 | 410; message: string }
  | ({ action: "already-member" } & AcceptedInvite)
  | ({ action: "join" } & AcceptedInvite);

export function normalizeInviteToken(token: string) {
  return token.trim();
}

/**
 * 招待トークンを消費するかどうかの判定。
 * すでにメンバーなら期限切れ・使用済みでも参加済みとして扱う（リンクは消費しない）。
 */
export function decideInviteJoin(input: {
  token: string;
  invite: InviteSnapshot | null;
  alreadyMember: boolean;
  now: Date;
}): InviteDecision {
  if (!normalizeInviteToken(input.token)) {
    return { action: "reject", status: 400, message: "招待リンクが正しくありません" };
  }
  const invite = input.invite;
  if (!invite?.groupName) {
    return { action: "reject", status: 404, message: "招待リンクが見つかりません" };
  }

  const base = {
    inviteId: invite.id,
    groupId: invite.groupId,
    groupName: invite.groupName,
    expiresAt: invite.expiresAt.toISOString()
  };

  if (input.alreadyMember) {
    return { action: "already-member", ...base };
  }
  if (invite.usedAt) {
    return {
      action: "reject",
      status: 410,
      message: "この招待リンクはすでに使われています"
    };
  }
  if (invite.expiresAt.getTime() <= input.now.getTime()) {
    return {
      action: "reject",
      status: 410,
      message: "招待リンクの有効期限が切れています"
    };
  }
  return { action: "join", ...base };
}
