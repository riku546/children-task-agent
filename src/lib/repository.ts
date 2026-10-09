import { createId, memoryStore, nowIso, toMemoryTask } from "@/lib/memory-store";
import { prisma, tryDb } from "@/lib/prisma";
import type { ChildRecord, GroupRecord, Priority, TaskRecord, TaskStatus } from "@/lib/types";

type UserLike = {
  id: string;
  name: string;
  defaultGroupId: string | null;
};

export async function listGroups(user: UserLike): Promise<GroupRecord[]> {
  const dbGroups = await tryDb(() =>
    prisma.familyGroup.findMany({
      where: { members: { some: { userId: user.id } } },
      include: { members: true, children: true },
      orderBy: { createdAt: "asc" }
    })
  );

  if (dbGroups) return dbGroups.map(mapGroup);
  return memoryStore.groups.filter((group) =>
    group.members.some((member) => member.userId === user.id)
  );
}

export async function createGroup(user: UserLike, name: string): Promise<GroupRecord> {
  const dbGroup = await tryDb(() =>
    prisma.familyGroup.create({
      data: {
        name,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
            displayName: user.name
          }
        },
        children: { create: { name: "未設定" } }
      },
      include: { members: true, children: true }
    })
  );

  if (dbGroup) return mapGroup(dbGroup);

  const groupId = createId("group");
  const group: GroupRecord = {
    id: groupId,
    name,
    createdById: user.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    members: [
      {
        id: createId("member"),
        userId: user.id,
        groupId,
        role: "OWNER",
        displayName: user.name,
        createdAt: nowIso()
      }
    ],
    children: [
      {
        id: createId("child"),
        groupId,
        name: "未設定",
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    ]
  };
  memoryStore.groups.push(group);
  return group;
}

export async function createInvite(groupId: string) {
  const token = createId("invite");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const dbInvite = await tryDb(() =>
    prisma.invite.create({
      data: { groupId, token, expiresAt }
    })
  );

  if (dbInvite) return { token: dbInvite.token, expiresAt: dbInvite.expiresAt.toISOString() };

  memoryStore.invites.push({
    id: createId("inviteRow"),
    groupId,
    token,
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: nowIso()
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function addChild(groupId: string, name: string): Promise<ChildRecord> {
  const dbChild = await tryDb(() =>
    prisma.child.create({
      data: { groupId, name }
    })
  );

  if (dbChild) {
    return {
      id: dbChild.id,
      groupId: dbChild.groupId,
      name: dbChild.name,
      createdAt: dbChild.createdAt.toISOString(),
      updatedAt: dbChild.updatedAt.toISOString()
    };
  }

  const child: ChildRecord = {
    id: createId("child"),
    groupId,
    name,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  const group = memoryStore.groups.find((item) => item.id === groupId);
  group?.children.push(child);
  return child;
}

export async function listTasks(user: UserLike): Promise<TaskRecord[]> {
  const dbTasks = await tryDb(() =>
    prisma.task.findMany({
      where: {
        group: {
          members: {
            some: { userId: user.id }
          }
        }
      },
      include: { child: true, assignee: true },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }]
    })
  );

  if (dbTasks) return dbTasks.map(mapTask);

  const groupIds = (await listGroups(user)).map((group) => group.id);
  return memoryStore.tasks
    .filter((task) => groupIds.includes(task.groupId))
    .sort((a, b) =>
      a.status === b.status
        ? (a.dueDate || "").localeCompare(b.dueDate || "")
        : a.status.localeCompare(b.status)
    );
}

export async function getTask(user: UserLike, taskId: string): Promise<TaskRecord | null> {
  const dbTask = await tryDb(() =>
    prisma.task.findFirst({
      where: {
        id: taskId,
        group: {
          members: {
            some: { userId: user.id }
          }
        }
      },
      include: { child: true, assignee: true }
    })
  );

  if (dbTask) return mapTask(dbTask);

  const groupIds = (await listGroups(user)).map((group) => group.id);
  return (
    memoryStore.tasks.find((task) => task.id === taskId && groupIds.includes(task.groupId)) ?? null
  );
}

export async function createTasks(
  user: UserLike,
  input: {
    groupId?: string | null;
    sourceText?: string | null;
    tasks: {
      title: string;
      description?: string | null;
      type?: string;
      dueDate?: string | null;
      childName?: string | null;
      assigneeName?: string | null;
      priority?: Priority;
    }[];
  }
): Promise<TaskRecord[]> {
  const groups = await listGroups(user);
  const group = groups.find((item) => item.id === input.groupId) || groups[0];
  if (!group) return [];

  const created: TaskRecord[] = [];
  for (const task of input.tasks) {
    const child = matchChild(group, task.childName);
    const assignee = matchMember(group, task.assigneeName);
    const dbTask = await tryDb(() =>
      prisma.task.create({
        data: {
          groupId: group.id,
          childId: child?.id,
          title: task.title,
          description: task.description || null,
          type: task.type || "確認",
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          assigneeMemberId: assignee?.id,
          priority: task.priority || "medium",
          sourceText: input.sourceText || null
        },
        include: { child: true, assignee: true }
      })
    );

    if (dbTask) {
      created.push(mapTask(dbTask));
    } else {
      const memoryTask = toMemoryTask({
        groupId: group.id,
        title: task.title,
        description: task.description,
        type: task.type,
        dueDate: task.dueDate,
        childId: child?.id,
        childName: child?.name || task.childName || null,
        assigneeMemberId: assignee?.id,
        assigneeName: assignee?.displayName || task.assigneeName || null,
        priority: task.priority,
        sourceText: input.sourceText || null
      });
      memoryStore.tasks.push(memoryTask);
      created.push(memoryTask);
    }
  }

  return created;
}

export async function updateTask(
  user: UserLike,
  taskId: string,
  input: Partial<{
    title: string;
    description: string | null;
    type: string;
    dueDate: string | null;
    assigneeMemberId: string | null;
    priority: Priority;
    status: TaskStatus;
    googleEventId: string | null;
  }>
) {
  const current = await getTask(user, taskId);
  if (!current) return null;

  const dbTask = await tryDb(() =>
    prisma.task.update({
      where: { id: taskId },
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        dueDate:
          input.dueDate === undefined ? undefined : input.dueDate ? new Date(input.dueDate) : null,
        assigneeMemberId: input.assigneeMemberId !== undefined ? input.assigneeMemberId : undefined,
        priority: input.priority,
        status: input.status,
        googleEventId: input.googleEventId
      },
      include: { child: true, assignee: true }
    })
  );

  if (dbTask) return mapTask(dbTask);

  const memoryTask = memoryStore.tasks.find((task) => task.id === taskId);
  if (!memoryTask) return null;
  let newAssigneeName = memoryTask.assigneeName;
  if (input.assigneeMemberId !== undefined) {
    if (input.assigneeMemberId === null) {
      newAssigneeName = null;
    } else {
      const group = memoryStore.groups.find((g) => g.id === memoryTask.groupId);
      const member = group?.members.find((m) => m.id === input.assigneeMemberId);
      newAssigneeName = member?.displayName ?? null;
    }
  }
  Object.assign(memoryTask, {
    ...input,
    assigneeName: newAssigneeName,
    dueDate: input.dueDate === undefined ? memoryTask.dueDate : input.dueDate,
    updatedAt: nowIso()
  });
  return memoryTask;
}

export async function saveExtraction(
  user: UserLike,
  input: { groupId?: string | null; inputType: string; confirmedText: string; rawJson: unknown }
) {
  const groups = await listGroups(user);
  const group = groups.find((item) => item.id === input.groupId) || groups[0];
  if (!group) return;

  const dbExtraction = await tryDb(() =>
    prisma.aiExtraction.create({
      data: {
        groupId: group.id,
        inputType: input.inputType,
        confirmedText: input.confirmedText,
        rawJson: input.rawJson as object,
        createdById: user.id
      }
    })
  );

  if (!dbExtraction) {
    memoryStore.extractions.push({
      id: createId("extraction"),
      groupId: group.id,
      inputType: input.inputType,
      confirmedText: input.confirmedText,
      rawJson: input.rawJson,
      createdById: user.id,
      createdAt: nowIso()
    });
  }
}

function mapGroup(group: any): GroupRecord {
  return {
    id: group.id,
    name: group.name,
    createdById: group.createdById,
    createdAt: toIso(group.createdAt),
    updatedAt: toIso(group.updatedAt),
    members: (group.members || []).map((member: any) => ({
      id: member.id,
      userId: member.userId,
      groupId: member.groupId,
      role: member.role,
      displayName: member.displayName,
      createdAt: toIso(member.createdAt)
    })),
    children: (group.children || []).map((child: any) => ({
      id: child.id,
      groupId: child.groupId,
      name: child.name,
      createdAt: toIso(child.createdAt),
      updatedAt: toIso(child.updatedAt)
    }))
  };
}

function mapTask(task: any): TaskRecord {
  return {
    id: task.id,
    groupId: task.groupId,
    childId: task.childId,
    childName: task.child?.name ?? null,
    title: task.title,
    description: task.description,
    type: task.type,
    dueDate: task.dueDate ? toIso(task.dueDate) : null,
    assigneeMemberId: task.assigneeMemberId,
    assigneeName: task.assignee?.displayName ?? null,
    priority: task.priority,
    status: task.status,
    sourceText: task.sourceText,
    googleEventId: task.googleEventId,
    createdAt: toIso(task.createdAt),
    updatedAt: toIso(task.updatedAt)
  };
}

function toIso(value: string | Date) {
  return typeof value === "string" ? value : value.toISOString();
}

function matchChild(group: GroupRecord, childName?: string | null) {
  if (!childName || childName === "未設定") return group.children[0] ?? null;
  return group.children.find((child) => child.name === childName) ?? group.children[0] ?? null;
}

function matchMember(group: GroupRecord, assigneeName?: string | null) {
  if (!assigneeName) return group.members[0] ?? null;
  return (
    group.members.find(
      (member) =>
        member.displayName.includes(assigneeName) || assigneeName.includes(member.displayName)
    ) ??
    group.members[0] ??
    null
  );
}
