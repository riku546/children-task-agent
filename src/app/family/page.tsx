"use client";

import {
  ArrowRight,
  Baby,
  CheckCircle2,
  Circle,
  Hand,
  Loader2,
  Plus,
  RefreshCw,
  UserRound,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChildBadge } from "@/components/ChildBadge";
import { ConflictAlerts } from "@/components/ConflictAlerts";
import { DuePill, PriorityPill } from "@/components/StatusPill";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import { detectAllConflicts, isWorkTask } from "@/lib/conflict-detector";
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

  const conflicts = useMemo(() => {
    return detectAllConflicts(tasks);
  }, [tasks]);

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
        <Loader2 className="mx-auto animate-spin text-emerald-600" size={28} />
        <p className="mt-3 text-xs text-zinc-500">読み込み中...</p>
      </section>
    );
  }

  if (!currentGroup) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-base font-bold text-zinc-900">参加している家族グループがありません</p>
        <Link href="/groups" className="button-primary mt-4 inline-flex text-xs">
          グループを作成する
        </Link>
      </section>
    );
  }

  const allTodoCount = groupTasks.filter((t) => t.status === "TODO").length;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider uppercase text-zinc-500">
            Team Workload & Assignment
          </p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            家族のタスク管理・分担
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            誰が何のタスクを持っているか、分担状況を一覧で確認・引き受けできます
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="button-icon"
            onClick={() => loadData(true)}
            title="最新情報に更新"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <Link href="/tasks/new" className="button-primary text-xs">
            <Plus size={14} />
            <span>新しいTODO</span>
          </Link>
        </div>
      </div>

      {/* 重複・衝突警告 */}
      {conflicts.hasAnyConflict ? (
        <div className="mt-4">
          <ConflictAlerts conflicts={conflicts} />
        </div>
      ) : null}

      {/* フラットなツールバー & フィルター */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {groups.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-500">グループ:</span>
              <select
                className="field text-xs py-1 h-7"
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
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
              <Users size={14} className="text-zinc-500" />
              <span>{currentGroup.name}</span>
            </div>
          )}

          {/* 子どもフィルター */}
          {currentGroup.children.length > 0 ? (
            <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
              <Baby size={13} className="text-zinc-400" />
              <select
                className="field text-xs py-1 h-7"
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

        {/* 完了状態フィルター (セグメントコントロール) */}
        <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-100/70 p-0.5 text-xs">
          <button
            type="button"
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "TODO"
                ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
            onClick={() => setStatusFilter("TODO")}
          >
            未完了 ({allTodoCount})
          </button>
          <button
            type="button"
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "ALL"
                ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
            onClick={() => setStatusFilter("ALL")}
          >
            すべて
          </button>
          <button
            type="button"
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "DONE"
                ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
            onClick={() => setStatusFilter("DONE")}
          >
            完了済
          </button>
        </div>
      </div>

      {/* インライン分担サマリーストリップ（カードではなく1行のストリップ） */}
      <div className="mt-3 flex flex-wrap items-center gap-2 py-1 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
          メンバー負荷:
        </span>
        {memberBuckets.buckets?.map((bucket) => {
          const isMe = currentMember?.id === bucket.member.id;
          return (
            <div
              key={bucket.member.id}
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${
                isMe
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700"
              }`}
            >
              <UserRound size={12} className={isMe ? "text-emerald-700" : "text-zinc-500"} />
              <span>{bucket.member.displayName}</span>
              {isMe ? <span className="text-[10px] text-emerald-700">(自分)</span> : null}
              <span
                className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-bold ${
                  isMe ? "bg-emerald-700 text-white" : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {bucket.todoCount}
              </span>
            </div>
          );
        })}
        {memberBuckets.unassigned?.tasks.length ? (
          <div className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
            <Hand size={12} className="text-amber-600" />
            <span>未担当</span>
            <span className="ml-1 rounded bg-amber-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {memberBuckets.unassigned.todoCount}
            </span>
          </div>
        ) : null}
      </div>

      {/* 担当者別カラム（Linear / GitHub Projects 風のボーダー分割カラムボード） */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 未割り当てカラム */}
        {memberBuckets.unassigned && memberBuckets.unassigned.tasks.length > 0 ? (
          <div className="flex flex-col overflow-hidden rounded-lg border border-amber-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50/60 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="grid size-5 place-items-center rounded bg-amber-500 text-white font-bold text-[10px]">
                  ?
                </span>
                <h3 className="text-xs font-bold text-amber-950">担当未設定</h3>
              </div>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                {memberBuckets.unassigned.tasks.length} 件
              </span>
            </div>
            <div className="divide-y divide-zinc-200/80 flex-1">
              {memberBuckets.unassigned.tasks.map((task) => (
                <TaskRow
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
          </div>
        ) : null}

        {/* 各メンバーのカラム */}
        {memberBuckets.buckets?.map((bucket) => {
          const isMe = currentMember?.id === bucket.member.id;
          return (
            <div
              key={bucket.member.id}
              className={`flex flex-col overflow-hidden rounded-lg border bg-white shadow-2xs ${
                isMe ? "border-emerald-300 ring-1 ring-emerald-300/30" : "border-zinc-200"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b px-3.5 py-2.5 ${
                  isMe ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50/70"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={`grid size-5 place-items-center rounded text-white font-bold text-[10px] ${
                      isMe ? "bg-emerald-600" : "bg-zinc-700"
                    }`}
                  >
                    <UserRound size={12} />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-900">
                    {bucket.member.displayName}
                    {isMe ? (
                      <span className="ml-1 text-[11px] font-semibold text-emerald-700">
                        (自分)
                      </span>
                    ) : null}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  <span className="text-zinc-600">計 {bucket.tasks.length}</span>
                  {bucket.todoCount > 0 ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
                      未完 {bucket.todoCount}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="divide-y divide-zinc-200 flex-1">
                {bucket.tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-600">
                    現在担当しているタスクはありません
                  </div>
                ) : (
                  bucket.tasks.map((task) => (
                    <TaskRow
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
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TaskRow({
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
  const isDone = task.status === "DONE";

  return (
    <div
      className={`group p-3 transition hover:bg-zinc-50/70 ${
        isDone ? "bg-zinc-50/40 opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onToggleStatus}
          disabled={isActionLoading}
          className="mt-0.5 shrink-0 text-zinc-400 hover:text-zinc-800 transition"
          title={isDone ? "未完了に戻す" : "完了にする"}
        >
          {isDone ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} />}
        </button>

        <div className="min-w-0 flex-1">
          <Link
            href={`/tasks/${task.id}`}
            className={`text-xs font-semibold leading-snug block transition ${
              isDone ? "line-through text-zinc-400" : "text-zinc-900 hover:text-emerald-700"
            }`}
          >
            {task.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <DuePill dueDate={task.dueDate} />
            <PriorityPill priority={task.priority} />
            <ChildBadge name={task.childName} isWork={isWorkTask(task)} size="sm" />
          </div>
        </div>

        <Link
          href={`/tasks/${task.id}`}
          className="shrink-0 text-zinc-300 group-hover:text-zinc-700 transition"
          title="詳細"
        >
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* 担当操作エリア */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="text-zinc-600">担当:</span>
          <select
            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-800"
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
            className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 transition hover:bg-emerald-100"
          >
            {isActionLoading ? <Loader2 size={11} className="animate-spin" /> : <Hand size={11} />}
            <span>私がやる</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
