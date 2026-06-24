import type { ChildRecord, GroupRecord, MemberRecord, Priority, TaskRecord, TaskStatus } from "@/lib/types";

type UserRecord = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type MemoryStore = {
  users: UserRecord[];
  groups: GroupRecord[];
  tasks: TaskRecord[];
  invites: { id: string; groupId: string; token: string; expiresAt: string; usedAt: string | null; createdAt: string }[];
  extractions: { id: string; groupId: string; inputType: string; confirmedText: string; rawJson: unknown; createdById: string; createdAt: string }[];
};

const globalForStore = globalThis as unknown as { childcareTaskAgentStore?: MemoryStore };

export const memoryStore: MemoryStore =
  globalForStore.childcareTaskAgentStore ??
  (globalForStore.childcareTaskAgentStore = {
    users: [],
    groups: [],
    tasks: [],
    invites: [],
    extractions: []
  });

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function upsertMemoryUser(email: string, name?: string) {
  const current = memoryStore.users.find((user) => user.email === email);
  if (current) {
    current.name = name || current.name;
    current.updatedAt = nowIso();
    return current;
  }

  const user: UserRecord = {
    id: createId("user"),
    email,
    name: name || email.split("@")[0] || "デモユーザー",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  memoryStore.users.push(user);
  return user;
}

export function ensureMemoryGroup(userId: string, displayName: string) {
  const existing = memoryStore.groups.find((group) => group.createdById === userId);
  if (existing) return existing;

  const groupId = createId("group");
  const member: MemberRecord = {
    id: createId("member"),
    userId,
    groupId,
    role: "OWNER",
    displayName,
    createdAt: nowIso()
  };
  const children: ChildRecord[] = [
    {
      id: createId("child"),
      groupId,
      name: "未設定",
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  ];
  const group: GroupRecord = {
    id: groupId,
    name: "わが家",
    createdById: userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    members: [member],
    children
  };
  memoryStore.groups.push(group);
  return group;
}

export function toMemoryTask(input: {
  groupId: string;
  title: string;
  description?: string | null;
  type?: string;
  dueDate?: string | null;
  childId?: string | null;
  childName?: string | null;
  assigneeMemberId?: string | null;
  assigneeName?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  sourceText?: string | null;
}): TaskRecord {
  return {
    id: createId("task"),
    groupId: input.groupId,
    childId: input.childId ?? null,
    childName: input.childName ?? null,
    title: input.title,
    description: input.description ?? null,
    type: input.type || "確認",
    dueDate: input.dueDate ?? null,
    assigneeMemberId: input.assigneeMemberId ?? null,
    assigneeName: input.assigneeName ?? null,
    priority: input.priority || "medium",
    status: input.status || "TODO",
    sourceText: input.sourceText ?? null,
    googleEventId: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}
