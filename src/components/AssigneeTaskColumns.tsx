"use client";

import { ArrowRight, CheckCircle2, Circle, Hand, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChildBadge } from "@/components/ChildBadge";
import { DuePill, PriorityPill } from "@/components/StatusPill";
import { invalidateCache } from "@/lib/client-cache";
import { isWorkTask } from "@/lib/conflict-detector";
import type { GroupRecord, MemberRecord, TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  currentGroup: GroupRecord | null;
  currentUserId?: string | null;
  onRefresh?: () => Promise<void> | void;
};

export function AssigneeTaskColumns({ tasks, currentGroup, currentUserId, onRefresh }: Props) {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 現在のユーザーに対応するMember
  const currentMember = useMemo(() => {
    if (!currentGroup || !currentUserId) return null;
    return currentGroup.members.find((m) => m.userId === currentUserId) || null;
  }, [currentGroup, currentUserId]);

  // 選択中グループのタスク
  const groupTasks = useMemo(() => {
    if (!currentGroup) return tasks;
    return tasks.filter((task) => task.groupId === currentGroup.id);
  }, [tasks, currentGroup]);

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
        await onRefresh?.();
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
        await onRefresh?.();
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
        await onRefresh?.();
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  if (!currentGroup) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        所属している家族グループがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 担当者別カラムボード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 未割り当てカラム */}
        {memberBuckets.unassigned && memberBuckets.unassigned.tasks.length > 0 ? (
          <div className="flex flex-col overflow-hidden rounded-lg border border-amber-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded bg-amber-500 text-white font-bold text-xs">
                  ?
                </span>
                <h3 className="text-sm font-bold text-amber-950">担当未設定</h3>
              </div>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-900">
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
                className={`flex items-center justify-between border-b px-4 py-3 ${
                  isMe ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`grid size-5 place-items-center rounded text-white font-bold text-xs ${
                      isMe ? "bg-emerald-600" : "bg-zinc-700"
                    }`}
                  >
                    <UserRound size={13} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {bucket.member.displayName}
                    {isMe ? (
                      <span className="ml-1 text-xs font-semibold text-emerald-700">(自分)</span>
                    ) : null}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="text-zinc-600">計 {bucket.tasks.length}</span>
                  {bucket.todoCount > 0 ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
                      未完 {bucket.todoCount}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="divide-y divide-zinc-200 flex-1">
                {bucket.tasks.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-500">
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
    </div>
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
      className={`group p-3.5 transition hover:bg-zinc-50/70 ${
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
          {isDone ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Circle size={17} />}
        </button>

        <div className="min-w-0 flex-1">
          <Link
            href={`/tasks/${task.id}`}
            className={`text-sm font-semibold leading-snug block transition ${
              isDone ? "line-through text-zinc-400" : "text-zinc-900 hover:text-emerald-700"
            }`}
          >
            {task.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <DuePill dueDate={task.dueDate} />
            <PriorityPill priority={task.priority} />
            <ChildBadge name={task.childName} isWork={isWorkTask(task)} size="sm" />
          </div>
        </div>

        <Link
          href={`/tasks/${task.id}`}
          className="shrink-0 text-zinc-400 group-hover:text-zinc-800 transition pt-0.5"
          title="詳細"
        >
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* 担当操作エリア */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-600 font-medium">担当:</span>
          <select
            className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-800"
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
            className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
          >
            {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Hand size={12} />}
            <span>私がやる</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
