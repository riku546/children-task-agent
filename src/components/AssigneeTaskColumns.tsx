"use client";

import { ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
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

  const currentMember = useMemo(() => {
    if (!currentGroup || !currentUserId) return null;
    return currentGroup.members.find((m) => m.userId === currentUserId) || null;
  }, [currentGroup, currentUserId]);

  const groupTasks = useMemo(() => {
    if (!currentGroup) return tasks;
    return tasks.filter((task) => task.groupId === currentGroup.id);
  }, [tasks, currentGroup]);

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
    <div className="space-y-8">
      {memberBuckets.unassigned && memberBuckets.unassigned.tasks.length > 0 ? (
        <section>
          <h3 className="border-b border-amber-200 pb-2 text-sm font-bold text-amber-950">
            担当未設定
            <span className="ml-2 font-normal text-amber-800">
              {memberBuckets.unassigned.tasks.length}件（未完 {memberBuckets.unassigned.todoCount}）
            </span>
          </h3>
          <div className="divide-y divide-zinc-200">
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
        </section>
      ) : null}

      {memberBuckets.buckets?.map((bucket) => {
        const isMe = currentMember?.id === bucket.member.id;
        return (
          <section key={bucket.member.id}>
            <h3 className="border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-900">
              {bucket.member.displayName}
              {isMe ? <span className="ml-1 font-normal text-zinc-600">（自分）</span> : null}
              <span className="ml-2 font-normal text-zinc-500">
                {bucket.tasks.length}件{bucket.todoCount > 0 ? ` · 未完 ${bucket.todoCount}` : null}
              </span>
            </h3>

            {bucket.tasks.length === 0 ? (
              <p className="py-6 text-sm text-zinc-500">現在担当しているタスクはありません</p>
            ) : (
              <div className="divide-y divide-zinc-200">
                {bucket.tasks.map((task) => (
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
            )}
          </section>
        );
      })}
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
      className={`group py-3.5 transition hover:bg-zinc-50/70 ${
        isDone ? "bg-zinc-50/40 opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onToggleStatus}
          disabled={isActionLoading}
          className="mt-0.5 shrink-0 text-zinc-400 transition hover:text-zinc-800"
          title={isDone ? "未完了に戻す" : "完了にする"}
        >
          {isDone ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Circle size={17} />}
        </button>

        <div className="min-w-0 flex-1">
          <Link
            href={`/tasks/${task.id}`}
            className={`block text-sm font-semibold leading-snug transition ${
              isDone ? "text-zinc-400 line-through" : "text-zinc-900 hover:text-zinc-600"
            }`}
          >
            {task.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <ChildBadge name={task.childName} isWork={isWorkTask(task)} size="sm" />
            <DuePill dueDate={task.dueDate} />
            <PriorityPill priority={task.priority} />
          </div>
        </div>

        <Link
          href={`/tasks/${task.id}`}
          className="shrink-0 pt-0.5 text-zinc-400 transition group-hover:text-zinc-800"
          title="詳細"
        >
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-600">担当</span>
          <select
            className="max-w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900"
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
            className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : null}
            <span>私がやる</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
