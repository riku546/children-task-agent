"use client";

import { Check, Hand, Heart, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { ChildBadge } from "@/components/ChildBadge";
import { DuePill, PriorityPill } from "@/components/StatusPill";
import { isWorkTask } from "@/lib/conflict-detector";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  emptyText: string;
  currentUserId?: string | null;
  onAssignToMe?: (taskId: string) => Promise<void> | void;
  onToggleStatus?: (task: TaskRecord) => Promise<void> | void;
  actionLoadingId?: string | null;
  onThankYou?: (task: TaskRecord) => void;
};

export function TaskList({
  tasks,
  emptyText,
  currentUserId,
  onAssignToMe,
  onToggleStatus,
  actionLoadingId,
  onThankYou
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white/50 px-4 py-8 text-center text-xs font-medium text-zinc-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
      {tasks.map((task) => {
        const isWork = isWorkTask(task);
        const isActionLoading = actionLoadingId === task.id;
        const isDone = task.status === "DONE";

        return (
          <div
            key={task.id}
            className={`group flex items-start gap-3 p-3.5 transition hover:bg-zinc-50/70 sm:p-4 ${
              isDone ? "bg-zinc-50/40" : ""
            }`}
          >
            {/* 完了トグル（チェックボックス） */}
            {onToggleStatus && (
              <button
                type="button"
                onClick={() => onToggleStatus(task)}
                disabled={isActionLoading}
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition focus-ring ${
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

            {/* タスク情報 */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <DuePill dueDate={task.dueDate} />
                <PriorityPill priority={task.priority} />
                <ChildBadge name={task.childName} isWork={isWork} size="sm" />
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                  {task.type}
                </span>
              </div>

              <Link href={`/tasks/${task.id}`} className="block">
                <h3
                  className={`mt-1.5 text-sm font-semibold leading-snug text-zinc-900 hover:text-zinc-600 transition truncate ${
                    isDone ? "line-through text-zinc-400" : ""
                  }`}
                >
                  {task.title}
                </h3>
              </Link>

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <UserRound size={12} className="text-zinc-400" />
                  {task.assigneeName ? (
                    <span className="font-medium text-zinc-800">{task.assigneeName}</span>
                  ) : (
                    <span className="text-amber-600 font-medium">担当未設定</span>
                  )}
                </span>
              </div>
            </div>

            {/* アクションボタン群 */}
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              {onAssignToMe &&
                !isDone &&
                (task.assigneeMemberId === currentUserId ? (
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-700">
                    担当中
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAssignToMe(task.id)}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50"
                    title="私がこのタスクを担当します"
                  >
                    <Hand size={11} className="text-zinc-500" />
                    <span>引き受ける</span>
                  </button>
                ))}

              {onThankYou && !isDone && task.assigneeName && (
                <button
                  type="button"
                  onClick={() => onThankYou(task)}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 shadow-2xs transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                  title="担当してくれてありがとう！"
                >
                  <Heart size={11} className="text-rose-500" />
                  <span>感謝</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
