"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { ChildBadge } from "@/components/ChildBadge";
import { DuePill, PriorityPill } from "@/components/StatusPill";
import { isWorkTask } from "@/lib/conflict-detector";
import { isTaskTakenByMe } from "@/lib/task-claim";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  emptyText: string;
  currentUserId?: string | null;
  myMemberIds?: string[];
  onAssignToMe?: (taskId: string) => Promise<void> | void;
  onToggleStatus?: (task: TaskRecord) => Promise<void> | void;
  actionLoadingId?: string | null;
  onThankYou?: (task: TaskRecord) => void;
  showHeader?: boolean;
};

export function TaskList({
  tasks,
  emptyText,
  currentUserId,
  myMemberIds = [],
  onAssignToMe,
  onToggleStatus,
  actionLoadingId,
  onThankYou,
  showHeader = false
}: Props) {
  if (tasks.length === 0) {
    return <div className="py-8 text-center text-sm text-zinc-500">{emptyText}</div>;
  }

  return (
    <div className="task-list w-full min-w-0">
      {showHeader && (
        <div className="hidden items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs text-zinc-500 sm:flex">
          <span>やること</span>
          <div className="flex items-center gap-6">
            <span>子ども</span>
            <span>期限</span>
            <span>担当</span>
            <span className="w-20 text-right">操作</span>
          </div>
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {tasks.map((task) => {
          const isWork = isWorkTask(task);
          const isActionLoading = actionLoadingId === task.id;
          const isDone = task.status === "DONE";
          const takenByMe = isTaskTakenByMe(task.assigneeMemberId, myMemberIds, currentUserId);

          return (
            <div
              key={task.id}
              className={`group flex flex-col gap-2 px-3 py-3 transition hover:bg-zinc-50/80 sm:flex-row sm:items-center sm:justify-between ${
                isDone ? "opacity-50" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {onToggleStatus && (
                  <button
                    type="button"
                    onClick={() => onToggleStatus(task)}
                    disabled={isActionLoading}
                    className={`grid size-5 shrink-0 place-items-center rounded border transition focus-ring ${
                      isDone
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white hover:border-zinc-400 text-transparent"
                    }`}
                    title={isDone ? "未完了に戻す" : "完了にする"}
                  >
                    {isActionLoading ? (
                      <Loader2 size={12} className="animate-spin text-zinc-400" />
                    ) : (
                      <Check size={13} className={isDone ? "text-white" : "opacity-0"} />
                    )}
                  </button>
                )}

                <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 truncate">
                  <span
                    className={`truncate text-sm font-medium text-zinc-900 transition hover:text-zinc-600 ${
                      isDone ? "line-through text-zinc-400" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-8 sm:shrink-0 sm:pl-0">
                <ChildBadge name={task.childName} isWork={isWork} size="sm" />
                <DuePill dueDate={task.dueDate} />
                <PriorityPill priority={task.priority} />

                <div className="hidden min-w-[76px] items-center gap-1.5 text-xs text-zinc-600 md:flex">
                  <span className="truncate">
                    {task.assigneeName || <span className="text-amber-700">未定</span>}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onAssignToMe &&
                    !isDone &&
                    (takenByMe ? (
                      <span
                        role="status"
                        className="inline-flex min-h-11 items-center text-xs font-medium text-zinc-600"
                      >
                        引き受け済み
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAssignToMe(task.id)}
                        disabled={isActionLoading}
                        aria-pressed={false}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-rose-700 underline-offset-2 transition hover:text-rose-900 hover:underline disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                        引き受ける
                      </button>
                    ))}

                  {task.assigneeName && !takenByMe ? (
                    <span className="text-xs text-zinc-500 md:hidden">{task.assigneeName}</span>
                  ) : null}

                  {onThankYou && !isDone && task.assigneeName ? (
                    <button
                      type="button"
                      onClick={() => onThankYou(task)}
                      className="inline-flex min-h-11 items-center text-xs font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
                    >
                      ありがとう
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
