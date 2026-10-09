"use client";

import { CheckCircle2, Circle, Hand, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { ChildBadge } from "@/components/ChildBadge";
import { DuePill, PriorityPill, StatusPill } from "@/components/StatusPill";
import { isWorkTask } from "@/lib/conflict-detector";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  emptyText: string;
  currentUserId?: string | null;
  onAssignToMe?: (taskId: string) => Promise<void> | void;
  onToggleStatus?: (task: TaskRecord) => Promise<void> | void;
  actionLoadingId?: string | null;
};

export function TaskList({
  tasks,
  emptyText,
  currentUserId,
  onAssignToMe,
  onToggleStatus,
  actionLoadingId
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/20 bg-white/70 px-4 py-8 text-center text-sm text-ink/60">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => {
        const isWork = isWorkTask(task);
        const isActionLoading = actionLoadingId === task.id;

        return (
          <div
            key={task.id}
            className="group relative rounded-xl border border-ink/10 bg-white p-4 shadow-xs transition hover:border-moss/60 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* ピル・バッジ群 */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={task.status} />
                  <DuePill dueDate={task.dueDate} />
                  <PriorityPill priority={task.priority} />
                  <ChildBadge name={task.childName} isWork={isWork} size="sm" />
                </div>

                {/* タイトル */}
                <Link href={`/tasks/${task.id}`} className="block">
                  <h3
                    className={`mt-2.5 text-base font-bold leading-snug text-ink transition hover:text-moss ${
                      task.status === "DONE" ? "line-through opacity-60" : ""
                    }`}
                  >
                    {task.title}
                  </h3>
                </Link>

                {/* 補足・担当・種別 */}
                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-ink/70">
                  <span className="font-semibold">{task.type}</span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <UserRound size={13} className="text-ink/50" />
                    {task.assigneeName ? (
                      <span className="text-ink">{task.assigneeName}</span>
                    ) : (
                      <span className="text-amber-600">担当未設定</span>
                    )}
                  </span>
                </div>
              </div>

              {/* アクションボタン群 */}
              <div className="flex shrink-0 flex-col items-end gap-2">
                {/* 完了トグル */}
                {onToggleStatus && (
                  <button
                    type="button"
                    onClick={() => onToggleStatus(task)}
                    disabled={isActionLoading}
                    className="grid size-8 place-items-center rounded-full text-ink/40 transition hover:bg-cloud hover:text-moss"
                    title={task.status === "DONE" ? "未完了に戻す" : "完了にする"}
                  >
                    {isActionLoading ? (
                      <Loader2 size={18} className="animate-spin text-moss" />
                    ) : task.status === "DONE" ? (
                      <CheckCircle2 size={22} className="text-moss" />
                    ) : (
                      <Circle size={22} className="text-ink/30 hover:text-moss" />
                    )}
                  </button>
                )}

                {/* 機能3: 「私がやる」ボタン（未担当または未完了時） */}
                {onAssignToMe &&
                  task.status !== "DONE" &&
                  (task.assigneeMemberId === currentUserId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-moss/15 px-2 py-0.5 text-xs font-bold text-moss">
                      担当中
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAssignToMe(task.id)}
                      disabled={isActionLoading}
                      className="inline-flex items-center gap-1 rounded-full border border-moss/40 bg-mint/50 px-2.5 py-1 text-xs font-bold text-moss shadow-2xs transition hover:bg-moss hover:text-white disabled:opacity-50"
                      title="私がこのタスクを担当します"
                    >
                      <Hand size={12} />
                      <span>私がやる</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
