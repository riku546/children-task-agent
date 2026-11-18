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
 * 招待リンクで参加できるかどうかの判定。
 * 有効期限内なら usedAt の有無に関わらず、未参加者は参加できる（同一リンクで複数人可）。
 * すでにメンバーなら期限切れでも参加済みとして扱う。
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
  if (invite.expiresAt.getTime() <= input.now.getTime()) {
    return {
      action: "reject",
      status: 410,
      message: "招待リンクの有効期限が切れています"
    };
  }
  return { action: "join", ...base };
}
