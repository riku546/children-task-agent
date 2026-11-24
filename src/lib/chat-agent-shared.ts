import { z } from "zod";
import { selectChatModel } from "./chat-model.ts";
import { buildInviteJoinUrl, normalizeInviteToken } from "./invite-join-decision.ts";
import { MembershipError } from "./membership.ts";
import type {
  ChildRecord,
  GroupRecord,
  MemberRecord,
  Priority,
  TaskRecord,
  TaskStatus
} from "./types.ts";
import { getAppOrigin } from "./url.ts";

export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type PendingRemoval = {
  groupId: string;
  memberId: string;
} | null;

export type ChatActionSummary = {
  summary: string;
};

export type AgentUser = {
  id: string;
  name: string;
  email?: string;
  defaultGroupId: string | null;
};

export type TaskListItem = {
  id: string;
  title: string;
  dueDate: string | null;
  status: TaskStatus;
  priority: Priority;
  childName: string | null;
  assigneeName: string | null;
  type: string;
};

type NameMatch<T> =
  | { kind: "one"; value: T }
  | { kind: "none" }
  | { kind: "many"; names: string[] };

export function projectTaskForList(task: TaskRecord): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority,
    childName: task.childName,
    assigneeName: task.assigneeName,
    type: task.type
  };
}

export function matchByDisplayName<T>(
  items: T[],
  getName: (item: T) => string,
  query: string
): NameMatch<T> {
  const q = query.trim();
  if (!q) return { kind: "none" };

  const exact = items.filter((item) => getName(item) === q);
  if (exact.length === 1) return { kind: "one", value: exact[0] };
  if (exact.length > 1) {
    return { kind: "many", names: exact.map(getName) };
  }

  const partial = items.filter((item) => getName(item).includes(q) || q.includes(getName(item)));
  if (partial.length === 1) return { kind: "one", value: partial[0] };
  if (partial.length > 1) {
    return { kind: "many", names: partial.map(getName) };
  }

  return { kind: "none" };
}

function pickGroup(
  groups: GroupRecord[],
  groupId?: string,
  groupName?: string | null
): GroupRecord | null {
  if (groupId) {
    return groups.find((group) => group.id === groupId) ?? null;
  }
  const match = resolveGroup(groups, groupName);
  return match.kind === "one" ? match.value : null;
}

export function resolveGroup(
  groups: GroupRecord[],
  groupName?: string | null
): NameMatch<GroupRecord> {
  if (!groupName?.trim()) {
    if (groups.length === 1) return { kind: "one", value: groups[0] };
    if (groups.length === 0) return { kind: "none" };
    return { kind: "many", names: groups.map((g) => g.name) };
  }
  return matchByDisplayName(groups, (g) => g.name, groupName);
}

const REMOVAL_CONSENT_WORDS = ["はい", "お願い", "外して", "抜けて", "ok", "yes"] as const;

export function normalizeRemovalConsentMessage(text: string): string {
  return text
    .trim()
    .replace(/[!！\s]+$/u, "")
    .toLowerCase();
}

export function isRemovalConsent(text: string): boolean {
  const normalized = normalizeRemovalConsentMessage(text);
  return (REMOVAL_CONSENT_WORDS as readonly string[]).includes(normalized);
}

export function shouldExecuteRemoval(
  pendingFromTool: PendingRemoval,
  requestPending: PendingRemoval,
  latestUserMessage: string
): boolean {
  if (!pendingFromTool || !requestPending) return false;
  if (
    pendingFromTool.groupId !== requestPending.groupId ||
    pendingFromTool.memberId !== requestPending.memberId
  ) {
    return false;
  }
  return isRemovalConsent(latestUserMessage);
}

function todayInTokyo(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date());
}

function buildRoster(groups: GroupRecord[]): string {
  return groups
    .map((group) => {
      const children = group.children.map((c) => c.name).join("、") || "（なし）";
      const members = group.members.map((m) => m.displayName).join("、") || "（なし）";
      return `■${group.name}\n  子ども: ${children}\n  メンバー: ${members}`;
    })
    .join("\n");
}

const PLACEHOLDER_TASK_TITLES = new Set([
  "タスク",
  "新しいタスク",
  "新規タスク",
  "タスクを作って",
  "タスクを作成",
  "タスクを作成する",
  "task",
  "todo",
  "やること"
]);

export function normalizeTaskTitleForCompare(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, "")
    .replace(/[a-zA-Z0-9]/g, (ch) => ch.toLowerCase());
}

export function isPlaceholderTaskTitle(title: string): boolean {
  return PLACEHOLDER_TASK_TITLES.has(normalizeTaskTitleForCompare(title));
}

export function buildSystemPrompt(user: AgentUser, groups: GroupRecord[], extra?: string): string {
  const lines = [
    "あなたは育児タスクアプリの操作係です。画面と同じデータをツールでのみ変更します。",
    `今日: ${todayInTokyo()}（Asia/Tokyo）`,
    `利用者の表示名: ${user.name}`,
    "家族名簿（userIdは含めない）:",
    buildRoster(groups) || "（参加グループなし）",
    "できないこと: create_task は内容が具体的なときだけ呼ぶ。無いときはツールを呼ばず聞き返す。タイトルを「タスク」「新しいタスク」にしない。タスク削除・グループ削除・子どもの削除・グループ名変更は画面にもなくできない。できない操作は成功したように言わず、実在する画面だけ [名前](/path) で案内する。外部URLやjavascriptはリンクにしない。招待QRは画像で出せない。招待URLは文章で示し、[グループ設定](/groups/{groupId}/settings) を付ける。ログアウトは [プロフィール](/profile)。タスクの画面操作は [タスク](/tasks/{taskId})。idが無いときは [ホーム](/dashboard)。ありがとうは [ホーム](/dashboard)。候補を直してから保存は [お便りから作成](/tasks/new)。",
    "Googleカレンダー連携は calendar_link ツールのURLを返すだけ。登録完了とは言わない。",
    "仕事の予定は create_task の type を WORK にする。",
    "名前が一意でない・見つからないときは書き込まず聞き返す。"
  ];
  if (extra) lines.push(extra);
  return lines.join("\n");
}

const listTasksArgs = z.object({
  status: z.enum(["TODO", "DONE"]).optional(),
  childName: z.string().optional(),
  assigneeName: z.string().optional(),
  query: z.string().optional(),
  dueBefore: z.string().optional()
});

const createTaskArgs = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  childName: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  groupName: z.string().optional()
});

const updateTaskArgs = z.object({
  taskId: z.string().optional(),
  searchTitle: z.string().optional(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  type: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["TODO", "DONE"]).optional()
});

const createGroupArgs = z.object({
  name: z.string().min(1)
});

const addChildArgs = z.object({
  groupName: z.string().optional(),
  groupId: z.string().optional(),
  childName: z.string().min(1)
});

const createInviteArgs = z.object({
  groupName: z.string().optional(),
  groupId: z.string().optional()
});

const joinGroupArgs = z.object({
  token: z.string().min(1)
});

const removeMemberArgs = z.object({
  groupName: z.string().optional(),
  groupId: z.string().optional(),
  memberName: z.string().optional(),
  memberId: z.string().optional(),
  confirmed: z.boolean().optional()
});

const updateMyNameArgs = z.object({
  name: z.string().min(1)
});

const calendarLinkArgs = z.object({
  taskId: z.string().optional(),
  title: z.string().optional()
});

export const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "所属グループのタスクを一覧する（最大20件）",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["TODO", "DONE"] },
          childName: { type: "string" },
          assigneeName: { type: "string" },
          query: { type: "string", description: "タイトル部分一致" },
          dueBefore: { type: "string", description: "YYYY-MM-DD" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "タスクを作成する。内容が具体的でないときは呼ばない。タイトルを「タスク」にしない",
      parameters: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string" },
          dueDate: { type: "string" },
          childName: { type: "string" },
          assigneeName: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          groupName: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "タスクを更新する",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          searchTitle: { type: "string", description: "検索用の既存タイトル" },
          title: { type: "string", description: "新しいタイトル" },
          description: { type: "string" },
          type: { type: "string" },
          dueDate: { type: "string" },
          assigneeName: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["TODO", "DONE"] }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_group",
      description: "家族グループを作成する",
      parameters: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_child",
      description: "子どもをグループに追加する",
      parameters: {
        type: "object",
        required: ["childName"],
        properties: {
          groupName: { type: "string" },
          groupId: { type: "string" },
          childName: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_invite",
      description:
        "グループ招待URLを発行する。QRは返さない。url を示し、settingsPath をグループ設定への Markdown リンクとして案内する",
      parameters: {
        type: "object",
        properties: {
          groupName: { type: "string" },
          groupId: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "join_group",
      description: "招待トークンでグループに参加する",
      parameters: {
        type: "object",
        required: ["token"],
        properties: { token: { type: "string" } }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_member",
      description: "グループからメンバーを外す（確認が必要）",
      parameters: {
        type: "object",
        properties: {
          groupName: { type: "string" },
          groupId: { type: "string" },
          memberName: { type: "string" },
          memberId: { type: "string" },
          confirmed: { type: "boolean" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_my_name",
      description: "自分の表示名を変更する",
      parameters: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_link",
      description: "タスクのGoogleカレンダー連携開始URLを返す",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          title: { type: "string" }
        }
      }
    }
  }
] as const;

export type ToolCallResult = {
  content: string;
  summary?: string;
  pendingRemoval?: PendingRemoval;
};

export type TaskUpdatePatch = Partial<{
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  assigneeMemberId: string | null;
  priority: Priority;
  status: TaskStatus;
}>;

export type ToolRuntimeHooks = {
  createTasks: (
    user: AgentUser,
    input: {
      groupId?: string | null;
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
  ) => Promise<TaskRecord[]>;
  updateTask: (
    user: AgentUser,
    taskId: string,
    input: TaskUpdatePatch
  ) => Promise<TaskRecord | null>;
  removeGroupMember: (user: AgentUser, groupId: string, memberId: string) => Promise<unknown>;
  getTask: (user: AgentUser, taskId: string) => Promise<TaskRecord | null>;
  createGroup: (user: AgentUser, name: string) => Promise<GroupRecord>;
  addChild: (groupId: string, name: string) => Promise<ChildRecord>;
  createInvite: (groupId: string) => Promise<{ token: string; expiresAt: string }>;
  acceptGroupInvite: (
    user: { id: string; name: string },
    token: string
  ) => Promise<{ groupId: string; groupName: string; alreadyMember?: boolean }>;
  userCanManageGroup: (user: AgentUser, groupId: string) => Promise<boolean>;
  updateDisplayName: (user: { id: string }, name: string) => Promise<string>;
};

export type ToolRuntime = {
  user: AgentUser;
  groups: GroupRecord[];
  tasks: TaskRecord[];
  request?: Request;
  requestPendingRemoval: PendingRemoval;
  latestUserMessage: string;
  hooks: ToolRuntimeHooks;
};

function extractInviteToken(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(trimmed, "https://app.local");
    const fromQuery = url.searchParams.get("token");
    if (fromQuery) return normalizeInviteToken(fromQuery);
  } catch {
    // fall through
  }
  return normalizeInviteToken(trimmed);
}

function filterTasks(tasks: TaskRecord[], args: z.infer<typeof listTasksArgs>): TaskRecord[] {
  let filtered = [...tasks];
  if (args.status) filtered = filtered.filter((t) => t.status === args.status);
  if (args.childName?.trim()) {
    const m = args.childName.trim();
    filtered = filtered.filter((t) => t.childName === m);
  }
  if (args.assigneeName?.trim()) {
    const m = args.assigneeName.trim();
    filtered = filtered.filter((t) => t.assigneeName === m);
  }
  if (args.query?.trim()) {
    const q = args.query.trim();
    filtered = filtered.filter((t) => t.title.includes(q));
  }
  if (args.dueBefore?.trim()) {
    const before = args.dueBefore.trim().slice(0, 10);
    filtered = filtered.filter((t) => {
      const due = t.dueDate?.slice(0, 10);
      return due && due <= before;
    });
  }
  return filtered.slice(0, 20);
}

async function resolveTaskByIdOrTitle(
  runtime: ToolRuntime,
  taskId?: string,
  title?: string
): Promise<NameMatch<TaskRecord>> {
  if (taskId?.trim()) {
    const task = await runtime.hooks.getTask(runtime.user, taskId.trim());
    return task ? { kind: "one", value: task } : { kind: "none" };
  }
  if (!title?.trim()) return { kind: "none" };
  const matches = runtime.tasks.filter((t) => t.title === title.trim());
  if (matches.length === 1) return { kind: "one", value: matches[0] };
  const partial = runtime.tasks.filter((t) => t.title.includes(title.trim()));
  if (partial.length === 1) return { kind: "one", value: partial[0] };
  if (partial.length > 1 || matches.length > 1) {
    const names = (partial.length ? partial : matches).map((t) => t.title);
    return { kind: "many", names };
  }
  return { kind: "none" };
}

function upsertRuntimeTask(runtime: ToolRuntime, task: TaskRecord) {
  const index = runtime.tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) {
    runtime.tasks[index] = task;
  } else {
    runtime.tasks.push(task);
  }
}

export async function executeChatTool(
  name: string,
  rawArgs: unknown,
  runtime: ToolRuntime
): Promise<ToolCallResult> {
  try {
    switch (name) {
      case "list_tasks": {
        const args = listTasksArgs.parse(rawArgs);
        const filtered = filterTasks(runtime.tasks, args);
        return {
          content: JSON.stringify({
            tasks: filtered.map(projectTaskForList)
          })
        };
      }
      case "create_task": {
        const args = createTaskArgs.parse(rawArgs);
        if (isPlaceholderTaskTitle(args.title)) {
          return {
            content: JSON.stringify({
              error:
                "タイトルが具体的ではありません。作成せず、何をするタスクかをユーザーに聞き返してください。"
            })
          };
        }
        const groupMatch = resolveGroup(runtime.groups, args.groupName);
        if (groupMatch.kind === "many") {
          return {
            content: JSON.stringify({
              error: `グループ名が複数一致しました: ${groupMatch.names.join("、")}`
            })
          };
        }
        if (groupMatch.kind === "none") {
          return {
            content: JSON.stringify({ error: "対象のグループが特定できません" })
          };
        }
        const group = groupMatch.value;

        let resolvedChildName: string | null = args.childName?.trim() ? args.childName : null;
        if (args.childName?.trim()) {
          const childMatch = matchByDisplayName(group.children, (c) => c.name, args.childName);
          if (childMatch.kind === "many") {
            return {
              content: JSON.stringify({
                error: `子どもの名前が複数一致: ${childMatch.names.join("、")}`
              })
            };
          }
          if (childMatch.kind === "none") {
            return {
              content: JSON.stringify({ error: `子ども「${args.childName}」が見つかりません` })
            };
          }
          resolvedChildName = childMatch.value.name;
        }

        let resolvedAssigneeName: string | null = args.assigneeName?.trim()
          ? args.assigneeName
          : null;
        let assigneeMemberId: string | null | undefined;
        if (args.assigneeName?.trim()) {
          const memberMatch = matchByDisplayName(
            group.members,
            (m) => m.displayName,
            args.assigneeName
          );
          if (memberMatch.kind === "many") {
            return {
              content: JSON.stringify({
                error: `担当者名が複数一致: ${memberMatch.names.join("、")}`
              })
            };
          }
          if (memberMatch.kind === "none") {
            return {
              content: JSON.stringify({
                error: `担当者「${args.assigneeName}」が見つかりません`
              })
            };
          }
          assigneeMemberId = memberMatch.value.id;
          resolvedAssigneeName = memberMatch.value.displayName;
        }

        const created = await runtime.hooks.createTasks(runtime.user, {
          groupId: group.id,
          tasks: [
            {
              title: args.title,
              description: args.description,
              type: args.type,
              dueDate: args.dueDate ?? null,
              childName: resolvedChildName,
              assigneeName: resolvedAssigneeName,
              priority: args.priority
            }
          ]
        });
        if (created.length === 0) {
          return { content: JSON.stringify({ error: "タスクを作成できませんでした" }) };
        }
        let task = created[0];
        if (args.assigneeName === undefined || args.assigneeName === null) {
          const cleared = await runtime.hooks.updateTask(runtime.user, task.id, {
            assigneeMemberId: null
          });
          if (cleared) task = cleared;
        } else if (assigneeMemberId !== undefined) {
          const assigned = await runtime.hooks.updateTask(runtime.user, task.id, {
            assigneeMemberId
          });
          if (assigned) task = assigned;
        }
        upsertRuntimeTask(runtime, task);
        return {
          content: JSON.stringify({
            task: projectTaskForList(task),
            path: `/tasks/${task.id}`
          }),
          summary: `タスク「${args.title}」を作成しました`
        };
      }
      case "update_task": {
        const args = updateTaskArgs.parse(rawArgs);
        const match = await resolveTaskByIdOrTitle(runtime, args.taskId, args.searchTitle);
        if (match.kind === "many") {
          return {
            content: JSON.stringify({
              error: "タイトルが複数一致しました",
              candidates: match.names
            })
          };
        }
        if (match.kind === "none") {
          return { content: JSON.stringify({ error: "タスクが見つかりません" }) };
        }
        const task = match.value;
        const group = runtime.groups.find((g) => g.id === task.groupId);
        const patch: TaskUpdatePatch = {};
        if (args.title) patch.title = args.title;
        if (args.description !== undefined) patch.description = args.description;
        if (args.type) patch.type = args.type;
        if (args.dueDate !== undefined) patch.dueDate = args.dueDate;
        if (args.priority) patch.priority = args.priority;
        if (args.status) patch.status = args.status;
        if (args.assigneeName !== undefined) {
          if (args.assigneeName === null || args.assigneeName === "") {
            patch.assigneeMemberId = null;
          } else if (group) {
            const memberMatch = matchByDisplayName(
              group.members,
              (m) => m.displayName,
              args.assigneeName
            );
            if (memberMatch.kind !== "one") {
              return {
                content: JSON.stringify({
                  error:
                    memberMatch.kind === "many"
                      ? `担当者名が複数一致: ${memberMatch.names.join("、")}`
                      : `担当者「${args.assigneeName}」が見つかりません`
                })
              };
            }
            patch.assigneeMemberId = memberMatch.value.id;
          }
        }
        const updated = await runtime.hooks.updateTask(runtime.user, task.id, patch);
        if (!updated) {
          return { content: JSON.stringify({ error: "更新に失敗しました" }) };
        }
        upsertRuntimeTask(runtime, updated);
        return {
          content: JSON.stringify({ task: projectTaskForList(updated) }),
          summary: `タスク「${updated.title}」を更新しました`
        };
      }
      case "create_group": {
        const args = createGroupArgs.parse(rawArgs);
        const group = await runtime.hooks.createGroup(runtime.user, args.name);
        runtime.groups.push(group);
        return {
          content: JSON.stringify({ group: { id: group.id, name: group.name } }),
          summary: `グループ「${args.name}」を作成しました`
        };
      }
      case "add_child": {
        const args = addChildArgs.parse(rawArgs);
        let group: GroupRecord | null = null;
        if (args.groupId) {
          group = runtime.groups.find((g) => g.id === args.groupId) ?? null;
        }
        if (!group) {
          const gm = resolveGroup(runtime.groups, args.groupName);
          if (gm.kind === "one") group = gm.value;
          if (gm.kind === "many") {
            return {
              content: JSON.stringify({
                error: `グループ名が複数一致: ${gm.names.join("、")}`
              })
            };
          }
        }
        if (!group) {
          return { content: JSON.stringify({ error: "グループが特定できません" }) };
        }
        if (!(await runtime.hooks.userCanManageGroup(runtime.user, group.id))) {
          return { content: JSON.stringify({ error: "このグループを変更する権限がありません" }) };
        }
        const child = await runtime.hooks.addChild(group.id, args.childName);
        group.children.push(child);
        return {
          content: JSON.stringify({ child: { id: child.id, name: child.name } }),
          summary: `子ども「${args.childName}」を追加しました`
        };
      }
      case "create_invite": {
        const args = createInviteArgs.parse(rawArgs);
        const inviteGroup = pickGroup(runtime.groups, args.groupId, args.groupName);
        if (!inviteGroup) {
          const gm = resolveGroup(runtime.groups, args.groupName);
          if (gm.kind === "many") {
            return {
              content: JSON.stringify({
                error: `グループ名が複数一致: ${gm.names.join("、")}`
              })
            };
          }
          return { content: JSON.stringify({ error: "グループが特定できません" }) };
        }
        const group = inviteGroup;
        if (!(await runtime.hooks.userCanManageGroup(runtime.user, group.id))) {
          return { content: JSON.stringify({ error: "招待を発行する権限がありません" }) };
        }
        const invite = await runtime.hooks.createInvite(group.id);
        const url = buildInviteJoinUrl(getAppOrigin(runtime.request), invite.token);
        return {
          content: JSON.stringify({
            url,
            expiresAt: invite.expiresAt,
            settingsPath: `/groups/${group.id}/settings`
          }),
          summary: `「${group.name}」の招待URLを発行しました`
        };
      }
      case "join_group": {
        const args = joinGroupArgs.parse(rawArgs);
        const token = extractInviteToken(args.token);
        const joined = await runtime.hooks.acceptGroupInvite(
          { id: runtime.user.id, name: runtime.user.name },
          token
        );
        const summary = joined.alreadyMember
          ? `すでに「${joined.groupName}」に参加しています`
          : `グループ「${joined.groupName}」に参加しました`;
        return {
          content: JSON.stringify(joined),
          summary
        };
      }
      case "remove_member": {
        const args = removeMemberArgs.parse(rawArgs);
        const removalGroup = pickGroup(runtime.groups, args.groupId, args.groupName);
        if (!removalGroup) {
          const gm = resolveGroup(runtime.groups, args.groupName);
          return {
            content: JSON.stringify({
              error:
                gm.kind === "many"
                  ? `グループ名が複数一致: ${gm.names.join("、")}`
                  : "グループが特定できません"
            })
          };
        }
        const group = removalGroup;
        let member: MemberRecord | undefined = args.memberId
          ? group.members.find((entry) => entry.id === args.memberId)
          : undefined;
        if (!member && args.memberName) {
          const mm = matchByDisplayName(group.members, (m) => m.displayName, args.memberName);
          if (mm.kind === "one") member = mm.value;
          if (mm.kind === "many") {
            return {
              content: JSON.stringify({
                error: `メンバー名が複数一致: ${mm.names.join("、")}`
              })
            };
          }
        }
        if (!member) {
          return { content: JSON.stringify({ error: "メンバーが見つかりません" }) };
        }

        const pending = { groupId: group.id, memberId: member.id };
        const incomplete = runtime.tasks.filter(
          (t) => t.groupId === group.id && t.assigneeMemberId === member.id && t.status === "TODO"
        ).length;

        if (
          shouldExecuteRemoval(pending, runtime.requestPendingRemoval, runtime.latestUserMessage)
        ) {
          await runtime.hooks.removeGroupMember(runtime.user, group.id, member.id);
          return {
            content: JSON.stringify({
              removed: true,
              displayName: member.displayName,
              unassignedTaskCount: incomplete
            }),
            summary: `メンバー「${member.displayName}」を外しました`,
            pendingRemoval: null
          };
        }

        const stalePendingWithoutConsent =
          runtime.requestPendingRemoval !== null && !isRemovalConsent(runtime.latestUserMessage);

        return {
          content: JSON.stringify({
            pendingRemoval: stalePendingWithoutConsent ? null : pending,
            displayName: member.displayName,
            incompleteTaskCount: incomplete,
            message: "この操作は取り消せません。実行する場合は「はい」などと返信してください。"
          }),
          pendingRemoval: stalePendingWithoutConsent ? null : pending
        };
      }
      case "update_my_name": {
        const args = updateMyNameArgs.parse(rawArgs);
        const updated = await runtime.hooks.updateDisplayName(runtime.user, args.name);
        runtime.user.name = updated;
        return {
          content: JSON.stringify({ name: updated }),
          summary: `表示名を「${updated}」に変更しました`
        };
      }
      case "calendar_link": {
        const args = calendarLinkArgs.parse(rawArgs);
        const match = await resolveTaskByIdOrTitle(runtime, args.taskId, args.title);
        if (match.kind === "many") {
          return {
            content: JSON.stringify({
              error: "タイトルが複数一致しました",
              candidates: match.names
            })
          };
        }
        if (match.kind === "none") {
          return { content: JSON.stringify({ error: "タスクが見つかりません" }) };
        }
        const url = `${getAppOrigin(runtime.request)}/api/calendar/start?taskId=${match.value.id}`;
        return { content: JSON.stringify({ url }) };
      }
      default:
        return { content: JSON.stringify({ error: `未知のツール: ${name}` }) };
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { content: JSON.stringify({ error: "引数が不正です", details: err.flatten() }) };
    }
    if (err instanceof MembershipError) {
      return { content: JSON.stringify({ error: err.message }) };
    }
    const message = err instanceof Error ? err.message : "ツールの実行に失敗しました";
    return { content: JSON.stringify({ error: message }) };
  }
}

type OpenRouterMessage = {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

export const MAX_AGENT_LOOP_TURNS = 3;

export type ChatAgentEvent = { type: "status"; text: string } | { type: "delta"; text: string };

export function toolStatusText(toolName: string): string {
  const labels: Record<string, string> = {
    list_tasks: "タスクを確認しています",
    create_task: "タスクを作っています",
    update_task: "タスクを更新しています",
    create_group: "グループを作っています",
    add_child: "子どもを追加しています",
    create_invite: "招待リンクを作っています",
    join_group: "グループに参加しています",
    remove_member: "メンバーを確認しています",
    update_my_name: "表示名を変えています",
    calendar_link: "カレンダーのリンクを作っています"
  };
  return labels[toolName] ?? "処理しています";
}

export type RunChatLoopInput = {
  apiKey: string;
  systemPrompt: string;
  clientMessages: ChatTurn[];
  runtime: ToolRuntime;
  fetchImpl?: typeof fetch;
  model?: string;
  onEvent?: (event: ChatAgentEvent) => void;
};

export type RunChatLoopResult = {
  reply: string;
  actions: ChatActionSummary[];
  pendingRemoval: PendingRemoval;
  error?: string;
};

function resolveOutgoingPendingRemoval(
  runtime: ToolRuntime,
  value: PendingRemoval
): PendingRemoval {
  if (!runtime.requestPendingRemoval) return value;
  if (isRemovalConsent(runtime.latestUserMessage)) return value;
  if (
    value &&
    value.groupId === runtime.requestPendingRemoval.groupId &&
    value.memberId === runtime.requestPendingRemoval.memberId
  ) {
    return null;
  }
  return value;
}

type ParsedAssistantTurn = {
  content: string;
  toolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  parseError?: string;
};

type ToolCallAccumulator = {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

function appendToolCallDelta(
  acc: Record<number, ToolCallAccumulator>,
  raw: {
    index?: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }
) {
  const index = raw.index ?? 0;
  const entry = acc[index] ?? {};
  if (raw.id) entry.id = raw.id;
  if (raw.type) entry.type = raw.type;
  if (raw.function) {
    entry.function ??= {};
    if (raw.function.name) {
      entry.function.name = (entry.function.name ?? "") + raw.function.name;
    }
    if (raw.function.arguments !== undefined) {
      entry.function.arguments = (entry.function.arguments ?? "") + raw.function.arguments;
    }
  }
  acc[index] = entry;
}

function finalizeToolCalls(
  acc: Record<number, ToolCallAccumulator>
): ParsedAssistantTurn["toolCalls"] {
  return Object.keys(acc)
    .map((key) => Number(key))
    .sort((a, b) => a - b)
    .map((index) => {
      const item = acc[index];
      return {
        id: item.id ?? `call_${index}`,
        type: item.type ?? "function",
        function: {
          name: item.function?.name ?? "",
          arguments: item.function?.arguments ?? ""
        }
      };
    })
    .filter((call) => call.function.name.length > 0);
}

async function parseOpenRouterResponse(
  response: Response,
  onEvent?: (event: ChatAgentEvent) => void
): Promise<ParsedAssistantTurn> {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/event-stream")) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: "", toolCalls: [], parseError: "応答の形式が不正でした。" };
    }
    const choice = (data as { choices?: Array<{ message?: OpenRouterMessage }> })?.choices?.[0]
      ?.message;
    if (!choice) {
      return { content: "", toolCalls: [] };
    }
    return {
      content: (choice.content || "").trim(),
      toolCalls: choice.tool_calls ?? []
    };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return { content: "", toolCalls: [], parseError: "応答の形式が不正でした。" };
  }

  const decoder = new TextDecoder();
  let lineBuffer = "";
  let content = "";
  const toolAcc: Record<number, ToolCallAccumulator> = {};
  let sawToolCalls = false;
  let invalidPayload = false;

  const processSseLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return;
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      invalidPayload = true;
      return;
    }
    const deltas = (parsed as { choices?: Array<{ delta?: Record<string, unknown> }> })?.choices;
    const delta = deltas?.[0]?.delta;
    if (!delta) return;

    if (Array.isArray(delta.tool_calls)) {
      sawToolCalls = true;
      for (const chunk of delta.tool_calls) {
        appendToolCallDelta(toolAcc, chunk as ToolCallAccumulator & { index?: number });
      }
    }

    const piece = delta.content;
    if (typeof piece === "string" && piece.length > 0 && !sawToolCalls) {
      content += piece;
      onEvent?.({ type: "delta", text: piece });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split(/\r?\n/);
    lineBuffer = lines.pop() ?? "";
    for (const line of lines) {
      processSseLine(line);
    }
  }
  lineBuffer += decoder.decode();
  if (lineBuffer.trim()) {
    processSseLine(lineBuffer);
  }

  if (invalidPayload) {
    return { content: "", toolCalls: [], parseError: "応答の形式が不正でした。" };
  }

  return {
    content: content.trim(),
    toolCalls: finalizeToolCalls(toolAcc)
  };
}

export async function runChatAgentLoop(input: RunChatLoopInput): Promise<RunChatLoopResult> {
  if (!input.apiKey.trim()) {
    return {
      reply: "チャットには OPENROUTER_API_KEY が必要です",
      actions: [],
      pendingRemoval: resolveOutgoingPendingRemoval(
        input.runtime,
        input.runtime.requestPendingRemoval
      )
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const model = input.model ?? selectChatModel();
  const actions: ChatActionSummary[] = [];
  let pendingRemoval: PendingRemoval = input.runtime.requestPendingRemoval;
  const finish = (
    result: Omit<RunChatLoopResult, "pendingRemoval"> & { pendingRemoval?: PendingRemoval }
  ) => ({
    ...result,
    pendingRemoval: resolveOutgoingPendingRemoval(
      input.runtime,
      result.pendingRemoval ?? pendingRemoval
    )
  });
  const messages: OpenRouterMessage[] = [
    { role: "system", content: input.systemPrompt },
    ...input.clientMessages.map((m) => ({ role: m.role, content: m.content }))
  ];

  let lastAssistantText = "";
  const executedSummaries: string[] = [];

  for (let turn = 0; turn < MAX_AGENT_LOOP_TURNS; turn += 1) {
    let response: Response;
    try {
      response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Childcare Task Agent"
        },
        body: JSON.stringify({
          model,
          messages,
          tools: CHAT_TOOLS,
          tool_choice: "auto",
          provider: { data_collection: "deny", zdr: true },
          reasoning: { effort: "none" },
          max_completion_tokens: 800,
          ...(input.onEvent ? { stream: true } : {})
        })
      });
    } catch {
      const prefix = executedSummaries.length > 0 ? `${executedSummaries.join("。")}。` : "";
      return finish({
        reply: `${prefix}通信に失敗しました。時間をおいて再度お試しください。`,
        actions
      });
    }

    if (!response.ok) {
      const prefix = executedSummaries.length > 0 ? `${executedSummaries.join("。")}。` : "";
      return finish({
        reply: `${prefix}応答を取得できませんでした。`,
        actions
      });
    }

    const parsed = await parseOpenRouterResponse(response, input.onEvent);
    if (parsed.parseError) {
      return finish({
        reply: parsed.parseError,
        actions
      });
    }

    const toolCalls = parsed.toolCalls;
    if (!toolCalls.length) {
      lastAssistantText = parsed.content || lastAssistantText;
      return finish({ reply: lastAssistantText || "完了しました。", actions });
    }

    messages.push({
      role: "assistant",
      content: parsed.content ? parsed.content : null,
      tool_calls: toolCalls
    });

    for (const call of toolCalls) {
      input.onEvent?.({ type: "status", text: toolStatusText(call.function.name) });
      let parsedArgs: unknown = {};
      try {
        parsedArgs = JSON.parse(call.function.arguments || "{}");
      } catch {
        parsedArgs = {};
      }
      const result = await executeChatTool(call.function.name, parsedArgs, input.runtime);
      if (result.summary) {
        actions.push({ summary: result.summary });
        executedSummaries.push(result.summary);
      }
      if (result.pendingRemoval !== undefined) {
        pendingRemoval = result.pendingRemoval;
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.content
      });
    }

    if (turn === MAX_AGENT_LOOP_TURNS - 1) {
      const summary = executedSummaries.join("。");
      return finish({
        reply: summary
          ? `${summary}。続きの操作は、もう一度具体的に指示してください。`
          : "操作が多すぎるため、ここまでの結果を返しました。",
        actions
      });
    }
  }

  return finish({
    reply: lastAssistantText || "完了しました。",
    actions
  });
}
