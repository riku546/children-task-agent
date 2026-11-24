import { Prisma } from "@prisma/client";
import {
  decideInviteJoin,
  type InviteDecision,
  type InviteSnapshot,
  normalizeInviteToken
} from "@/lib/invite-join-decision";
import { createId, memoryStore, nowIso } from "@/lib/memory-store";
import { prisma } from "@/lib/prisma";

export class InviteJoinError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "InviteJoinError";
    this.status = status;
  }
}

export type JoinUser = {
  id: string;
  name: string;
};

export type GroupInviteView = {
  groupId: string;
  groupName: string;
  alreadyMember: boolean;
  expiresAt: string;
};

type LoadedInvite = {
  invite: InviteSnapshot | null;
  alreadyMember: boolean;
};

function viewFromDecision(decision: InviteDecision): GroupInviteView {
  if (decision.action === "reject") {
    throw new InviteJoinError(decision.status, decision.message);
  }
  return {
    groupId: decision.groupId,
    groupName: decision.groupName,
    alreadyMember: decision.action === "already-member",
    expiresAt: decision.expiresAt
  };
}

function loadMemoryInvite(token: string, userId: string): LoadedInvite {
  const row = memoryStore.invites.find((item) => item.token === token);
  if (!row) return { invite: null, alreadyMember: false };
  const group = memoryStore.groups.find((item) => item.id === row.groupId);
  if (!group) return { invite: null, alreadyMember: false };
  return {
    invite: {
      id: row.id,
      groupId: row.groupId,
      groupName: group.name,
      expiresAt: new Date(row.expiresAt),
      usedAt: row.usedAt ? new Date(row.usedAt) : null
    },
    alreadyMember: group.members.some((member) => member.userId === userId)
  };
}

export function acceptInviteInMemory(
  user: JoinUser,
  rawToken: string,
  now = new Date()
): GroupInviteView {
  const token = normalizeInviteToken(rawToken);
  const loaded = loadMemoryInvite(token, user.id);
  const decision = decideInviteJoin({
    token,
    invite: loaded.invite,
    alreadyMember: loaded.alreadyMember,
    now
  });
  const view = viewFromDecision(decision);
  if (decision.action !== "join") return view;

  const group = memoryStore.groups.find((item) => item.id === decision.groupId);
  if (!group) {
    throw new InviteJoinError(404, "招待リンクが見つかりません");
  }
  if (group.members.some((member) => member.userId === user.id)) {
    return { ...view, alreadyMember: true };
  }

  group.members.push({
    id: createId("member"),
    userId: user.id,
    groupId: group.id,
    role: "MEMBER",
    displayName: user.name.trim() || "メンバー",
    createdAt: nowIso()
  });
  group.updatedAt = nowIso();
  return view;
}

export function previewInviteInMemory(
  userId: string,
  rawToken: string,
  now = new Date()
): GroupInviteView {
  const token = normalizeInviteToken(rawToken);
  const loaded = loadMemoryInvite(token, userId);
  return viewFromDecision(
    decideInviteJoin({
      token,
      invite: loaded.invite,
      alreadyMember: loaded.alreadyMember,
      now
    })
  );
}

async function loadDatabaseInvite(token: string, userId: string): Promise<LoadedInvite | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const row = await prisma.invite.findUnique({
      where: { token },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            members: {
              where: { userId },
              select: { id: true },
              take: 1
            }
          }
        }
      }
    });
    if (!row) return { invite: null, alreadyMember: false };
    return {
      invite: {
        id: row.id,
        groupId: row.groupId,
        groupName: row.group.name,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt
      },
      alreadyMember: row.group.members.length > 0
    };
  } catch (error) {
    console.warn("Database invite lookup fell back to demo memory store:", error);
    return null;
  }
}

async function consumeDatabaseInvite(
  user: JoinUser,
  decision: Extract<InviteDecision, { action: "join" }>
): Promise<"joined" | "already"> {
  try {
    return await prisma.$transaction(async (tx) => {
      const inviteRow = await tx.invite.findUnique({
        where: { id: decision.inviteId },
        select: { expiresAt: true }
      });
      if (!inviteRow || inviteRow.expiresAt.getTime() <= Date.now()) {
        throw new InviteJoinError(410, "招待リンクの有効期限が切れています");
      }
      const existing = await tx.familyMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: decision.groupId } },
        select: { id: true }
      });
      if (existing) return "already" as const;
      await tx.familyMember.create({
        data: {
          userId: user.id,
          groupId: decision.groupId,
          role: "MEMBER",
          displayName: user.name.trim() || "メンバー"
        }
      });
      return "joined" as const;
    });
  } catch (error) {
    if (error instanceof InviteJoinError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "already";
    }
    throw error;
  }
}

export async function previewGroupInvite(
  user: JoinUser,
  rawToken: string
): Promise<GroupInviteView> {
  const token = normalizeInviteToken(rawToken);
  const loaded = await loadDatabaseInvite(token, user.id);
  if (!loaded) return previewInviteInMemory(user.id, token);
  return viewFromDecision(
    decideInviteJoin({
      token,
      invite: loaded.invite,
      alreadyMember: loaded.alreadyMember,
      now: new Date()
    })
  );
}

export async function acceptGroupInvite(
  user: JoinUser,
  rawToken: string
): Promise<GroupInviteView> {
  const token = normalizeInviteToken(rawToken);
  const loaded = await loadDatabaseInvite(token, user.id);
  if (!loaded) return acceptInviteInMemory(user, token);

  const decision = decideInviteJoin({
    token,
    invite: loaded.invite,
    alreadyMember: loaded.alreadyMember,
    now: new Date()
  });
  const view = viewFromDecision(decision);
  if (decision.action !== "join") return view;

  const outcome = await consumeDatabaseInvite(user, decision);
  if (outcome === "already") return { ...view, alreadyMember: true };
  return view;
}
