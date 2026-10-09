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
  showHeader?: boolean;
};

export function TaskList({
  tasks,
  emptyText,
  currentUserId,
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
    <div className="w-full">
      {showHeader && (
        <div className="hidden sm:flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Task</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Child</span>
            <span>Due</span>
            <span>Assignee</span>
            <span className="w-16 text-right">Actions</span>
          </div>
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {tasks.map((task) => {
          const isWork = isWorkTask(task);
          const isActionLoading = actionLoadingId === task.id;
          const isDone = task.status === "DONE";

          return (
            <div
              key={task.id}
              className={`group flex items-center justify-between gap-3 px-3 py-3 transition hover:bg-zinc-50/80 ${
                isDone ? "opacity-50" : ""
              }`}
            >
              {/* 左側: チェックボックス + タイトル */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
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
                    className={`text-sm font-medium text-zinc-900 hover:text-zinc-600 transition truncate ${
                      isDone ? "line-through text-zinc-400" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                </Link>
              </div>

              {/* 右側: メタデータ & アクション */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <ChildBadge name={task.childName} isWork={isWork} size="sm" />
                <DuePill dueDate={task.dueDate} />
                <PriorityPill priority={task.priority} />

                {/* 担当者 */}
                <div className="hidden md:flex items-center gap-1.5 min-w-[76px] text-xs text-zinc-600">
                  <UserRound size={13} className="text-zinc-400" />
                  <span className="truncate">
                    {task.assigneeName || <span className="text-amber-600">未定</span>}
                  </span>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-1.5">
                  {onAssignToMe &&
                    !isDone &&
                    (task.assigneeMemberId === currentUserId ? (
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono font-medium text-zinc-600">
                        担当中
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAssignToMe(task.id)}
                        disabled={isActionLoading}
                        className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 transition"
                        title="私が担当する"
                      >
                        <Hand size={12} className="inline mr-1 text-zinc-500" />
                        引き受ける
                      </button>
                    ))}

                  {onThankYou && !isDone && task.assigneeName && (
                    <button
                      type="button"
                      onClick={() => onThankYou(task)}
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                      title="感謝を伝える"
                    >
                      <Heart size={12} className="inline text-rose-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
