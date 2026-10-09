"use client";

import {
  ArrowRight,
  Baby,
  CheckCircle2,
  Circle,
  Filter,
  Hand,
  Loader2,
  Plus,
  RefreshCw,
  UserCheck,
  UserRound,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DuePill, PriorityPill, StatusPill } from "@/components/StatusPill";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import type { GroupRecord, MemberRecord, TaskRecord } from "@/lib/types";

export default function FamilyTasksPage() {
  const cachedMe = getCachedData<any>("/api/me");
  const cachedTasks = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");

  const [groups, setGroups] = useState<GroupRecord[]>(cachedMe?.groups || []);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(cachedMe?.groups?.[0]?.id || "");
  const [tasks, setTasks] = useState<TaskRecord[]>(cachedTasks?.tasks || []);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(
    cachedMe?.user || null
  );
  const [selectedChildId, setSelectedChildId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "TODO" | "DONE">("TODO");
  const [loading, setLoading] = useState(!cachedMe || !cachedTasks);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadData(force = false) {
    if (!force) {
      const me = getCachedData<any>("/api/me");
      const t = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
      if (me && t) {
        setGroups(me.groups || []);
        setCurrentUser(me.user || null);
        if (me.groups?.length > 0 && !selectedGroupId) {
          setSelectedGroupId(me.groups[0].id);
        }
        setTasks(t.tasks || []);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const [meData, tasksData] = await Promise.all([
        fetchJsonWithCache<any>("/api/me", { force }),
        fetchJsonWithCache<{ tasks: TaskRecord[] }>("/api/tasks", { force })
      ]);

      setGroups(meData.groups || []);
      setCurrentUser(meData.user || null);

      if (meData.groups?.length > 0 && !selectedGroupId) {
        setSelectedGroupId(meData.groups[0].id);
      }
      setTasks(tasksData.tasks || []);
    } catch (e) {
      console.error("Failed to load family data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const currentGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || groups[0] || null;
  }, [groups, selectedGroupId]);

  // 現在のユーザーに対応するFamilyMember
  const currentMember = useMemo(() => {
    if (!currentGroup || !currentUser) return null;
    return currentGroup.members.find((m) => m.userId === currentUser.id) || null;
  }, [currentGroup, currentUser]);

  // 選択中グループのタスク（子ども・ステータス絞り込み反映）
  const groupTasks = useMemo(() => {
    if (!currentGroup) return [];
    return tasks.filter((task) => {
      if (task.groupId !== currentGroup.id) return false;
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
      if (selectedChildId !== "all" && task.childId !== selectedChildId) return false;
      return true;
    });
  }, [tasks, currentGroup, statusFilter, selectedChildId]);

  // メンバー別タスクの集計
  const memberBuckets = useMemo(() => {
    if (!currentGroup) {
      return {
        buckets: [] as {
          member: MemberRecord;
          tasks: TaskRecord[];
          todoCount: number;
          doneCount: number;
        }[],
        unassigned: {
          tasks: [] as TaskRecord[],
          todoCount: 0
        }
      };
    }
    const members = currentGroup.members;

    const buckets = members.map((member) => {
      const memberTasks = groupTasks.filter(
        (t) =>
          t.assigneeMemberId === member.id ||
          (!t.assigneeMemberId && t.assigneeName === member.displayName)
      );
      return {
        member,
        tasks: memberTasks,
        todoCount: memberTasks.filter((t) => t.status === "TODO").length,
        doneCount: memberTasks.filter((t) => t.status === "DONE").length
      };
    });

    // 担当未設定のタスク
    const unassignedTasks = groupTasks.filter((t) => {
      const hasId = members.some((m) => m.id === t.assigneeMemberId);
      const hasName = members.some((m) => m.displayName === t.assigneeName);
      return !hasId && !hasName;
    });

    return {
      buckets,
      unassigned: {
        tasks: unassignedTasks,
        todoCount: unassignedTasks.filter((t) => t.status === "TODO").length
      }
    };
  }, [currentGroup, groupTasks]);

  // 「私がやる」ボタン
  async function assignToMe(taskId: string) {
    if (!currentMember) return;
    setActionLoadingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeMemberId: currentMember.id })
      });
      if (res.ok) {
        invalidateCache("/api/tasks");
        await loadData(true);
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  // 担当者の変更
  async function changeAssignee(taskId: string, memberId: string) {
    setActionLoadingId(taskId);
    try {
      const body =
        memberId === "unassigned" ? { assigneeMemberId: null } : { assigneeMemberId: memberId };
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        invalidateCache("/api/tasks");
        await loadData(true);
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  // ステータスのトグル
  async function toggleStatus(task: TaskRecord) {
    setActionLoadingId(task.id);
    try {
      const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        invalidateCache("/api/tasks");
        await loadData(true);
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading && !currentGroup) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <Loader2 className="mx-auto animate-spin text-moss" size={32} />
        <p className="mt-3 text-sm text-ink/60">読み込み中...</p>
      </section>
    );
  }

  if (!currentGroup) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-lg font-bold">参加している家族グループがありません</p>
        <Link href="/groups" className="button-primary mt-4 inline-flex">
          グループを作成する
        </Link>
      </section>
    );
  }

  const allTodoCount = groupTasks.filter((t) => t.status === "TODO").length;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-moss">Family Task Board</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">家族のタスク管理</h1>
          <p className="mt-2 text-sm text-ink/70">
            誰が何のタスクを持っているか、分担状況を一覧で確認・調整できます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="button-icon"
            onClick={() => loadData(true)}
            title="更新"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <Link href="/tasks/new" className="button-primary">
            <Plus size={18} />
            新しいTODO
          </Link>
        </div>
      </div>

      {/* フィルター＆グループ選択エリア */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {groups.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink/60">グループ:</span>
              <select
                className="field text-sm py-1.5"
                value={currentGroup.id}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Users size={18} className="text-moss" />
              {currentGroup.name}
            </div>
          )}

          {/* 子どもフィルター */}
          {currentGroup.children.length > 0 ? (
            <div className="flex items-center gap-2">
              <Baby size={16} className="text-ink/60" />
              <select
                className="field text-sm py-1.5"
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
              >
                <option value="all">すべての子ども</option>
                {currentGroup.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {/* 完了状態フィルター */}
        <div className="flex items-center gap-1 rounded-md bg-cloud p-1 text-xs font-semibold">
          <button
            className={`rounded px-2.5 py-1 transition ${
              statusFilter === "TODO" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
            }`}
            onClick={() => setStatusFilter("TODO")}
          >
            未完了 ({allTodoCount})
          </button>
          <button
            className={`rounded px-2.5 py-1 transition ${
              statusFilter === "ALL" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
            }`}
            onClick={() => setStatusFilter("ALL")}
          >
            すべて
          </button>
          <button
            className={`rounded px-2.5 py-1 transition ${
              statusFilter === "DONE" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
            }`}
            onClick={() => setStatusFilter("DONE")}
          >
            完了済
          </button>
        </div>
      </div>

      {/* 分担サマリーバー */}
      <div className="mt-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink/60">
          タスク分担の偏り状況
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {memberBuckets.buckets?.map((bucket) => {
            const isMe = currentMember?.id === bucket.member.id;
            return (
              <div
                key={bucket.member.id}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  isMe ? "border border-moss/30 bg-moss/10" : "bg-cloud"
                }`}
              >
                <UserRound size={16} className={isMe ? "text-moss" : "text-ink/60"} />
                <span className="font-bold">
                  {bucket.member.displayName} {isMe ? "(あなた)" : ""}
                </span>
                <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">
                  {bucket.todoCount}件
                </span>
              </div>
            );
          })}
          {memberBuckets.unassigned?.tasks.length ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <Hand size={16} className="text-amber-600" />
              <span className="font-bold">担当未設定</span>
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                {memberBuckets.unassigned.todoCount}件
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 担当者別タスクカラム一覧 */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 未割り当てカラム */}
        {memberBuckets.unassigned && memberBuckets.unassigned.tasks.length > 0 ? (
          <section className="flex flex-col rounded-md border-2 border-dashed border-amber-300 bg-amber-50/40 p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded bg-amber-500 text-white font-bold text-xs">
                  ?
                </span>
                <h3 className="font-bold text-amber-950">担当未設定</h3>
              </div>
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {memberBuckets.unassigned.tasks.length}件
              </span>
            </div>
            <p className="mt-2 text-xs text-amber-800">
              誰がやるか決まっていないタスクです。引き受けてみましょう！
            </p>
            <div className="mt-4 flex-1 space-y-3">
              {memberBuckets.unassigned.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  members={currentGroup.members}
                  currentMember={currentMember}
                  isActionLoading={actionLoadingId === task.id}
                  onAssignToMe={() => assignToMe(task.id)}
                  onChangeAssignee={(memberId) => changeAssignee(task.id, memberId)}
                  onToggleStatus={() => toggleStatus(task)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* 各メンバーのカラム */}
        {memberBuckets.buckets?.map((bucket) => {
          const isMe = currentMember?.id === bucket.member.id;
          return (
            <section
              key={bucket.member.id}
              className={`flex flex-col rounded-md border bg-white p-4 shadow-sm ${
                isMe ? "border-moss/40 ring-1 ring-moss/20" : "border-ink/10"
              }`}
            >
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`grid size-7 place-items-center rounded text-white font-bold text-xs ${
                      isMe ? "bg-moss" : "bg-ink"
                    }`}
                  >
                    <UserRound size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink">
                      {bucket.member.displayName}
                      {isMe ? (
                        <span className="ml-1 text-xs text-moss font-semibold">(あなた)</span>
                      ) : null}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="rounded-full bg-cloud px-2 py-0.5 text-ink/70">
                    {bucket.tasks.length}件
                  </span>
                  {bucket.todoCount > 0 ? (
                    <span className="rounded-full bg-moss/20 px-2 py-0.5 text-moss">
                      未完了 {bucket.todoCount}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex-1 space-y-3">
                {bucket.tasks.length === 0 ? (
                  <div className="rounded-md border border-dashed border-ink/10 p-6 text-center text-xs text-ink/40">
                    現在担当しているタスクはありません
                  </div>
                ) : (
                  bucket.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      members={currentGroup.members}
                      currentMember={currentMember}
                      isActionLoading={actionLoadingId === task.id}
                      onAssignToMe={() => assignToMe(task.id)}
                      onChangeAssignee={(memberId) => changeAssignee(task.id, memberId)}
                      onToggleStatus={() => toggleStatus(task)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  members,
  currentMember,
  isActionLoading,
  onAssignToMe,
  onChangeAssignee,
  onToggleStatus
}: {
  task: TaskRecord;
  members: MemberRecord[];
  currentMember: MemberRecord | null;
  isActionLoading: boolean;
  onAssignToMe: () => void;
  onChangeAssignee: (memberId: string) => void;
  onToggleStatus: () => void;
}) {
  const isAssignedToMe = currentMember && task.assigneeMemberId === currentMember.id;

  return (
    <div
      className={`group rounded-md border p-3.5 transition shadow-xs ${
        task.status === "DONE"
          ? "border-ink/10 bg-cloud/40 opacity-70"
          : "border-ink/10 bg-white hover:border-moss hover:shadow-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onToggleStatus}
          disabled={isActionLoading}
          className="mt-0.5 shrink-0 text-ink/40 hover:text-moss transition"
          title={task.status === "DONE" ? "未完了に戻す" : "完了にする"}
        >
          {task.status === "DONE" ? (
            <CheckCircle2 size={19} className="text-moss" />
          ) : (
            <Circle size={19} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <Link
            href={`/tasks/${task.id}`}
            className={`font-bold leading-snug hover:underline block text-sm ${
              task.status === "DONE" ? "line-through text-ink/50" : "text-ink"
            }`}
          >
            {task.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <DuePill dueDate={task.dueDate} />
            <PriorityPill priority={task.priority} />
            {task.childName && task.childName !== "未設定" ? (
              <span className="rounded bg-cloud px-1.5 py-0.5 text-ink/70">{task.childName}</span>
            ) : null}
          </div>
        </div>

        <Link
          href={`/tasks/${task.id}`}
          className="shrink-0 text-ink/30 transition hover:text-moss mt-0.5"
          title="詳細"
        >
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* 担当操作エリア */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink/5 pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-ink/50">担当:</span>
          <select
            className="rounded border border-ink/15 bg-white px-2 py-0.5 text-xs font-semibold text-ink"
            value={task.assigneeMemberId || "unassigned"}
            disabled={isActionLoading}
            onChange={(e) => onChangeAssignee(e.target.value)}
          >
            <option value="unassigned">未設定</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>

        {!isAssignedToMe && currentMember ? (
          <button
            type="button"
            onClick={onAssignToMe}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1 rounded bg-moss/10 px-2 py-1 font-bold text-moss transition hover:bg-moss/20"
          >
            {isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <Hand size={13} />}
            私がやる
          </button>
        ) : null}
      </div>
    </div>
  );
}
