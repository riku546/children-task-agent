"use client";

import { Baby, Circle, Hand, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DuePill, PriorityPill } from "@/components/StatusPill";
import { getChildTheme } from "@/lib/child-theme";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  onAssignToMe?: (taskId: string) => Promise<void> | void;
  onToggleStatus?: (task: TaskRecord) => Promise<void> | void;
  actionLoadingId?: string | null;
  onThankYou?: (task: TaskRecord) => void;
};

export function SiblingTaskTimeline({
  tasks,
  onAssignToMe,
  onToggleStatus,
  actionLoadingId,
  onThankYou
}: Props) {
  const [selectedChildTab, setSelectedChildTab] = useState<string>("all");

  // 子ども一覧の抽出
  const children = useMemo(() => {
    const map = new Map<string, { name: string; taskCount: number }>();
    for (const t of tasks) {
      if (t.status === "DONE") continue;
      const name = t.childName?.trim();
      if (name) {
        const item = map.get(name) || { name, taskCount: 0 };
        item.taskCount += 1;
        map.set(name, item);
      }
    }
    return Array.from(map.values());
  }, [tasks]);

  // 子ども別の未完了タスク
  const tasksByChild = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    for (const t of tasks) {
      if (t.status === "DONE") continue;
      const name = t.childName?.trim() || "未設定";
      const list = map.get(name) || [];
      list.push(t);
      map.set(name, list);
    }
    return map;
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-100 text-violet-800">
            <Baby size={18} />
          </span>
          <div>
            <h3 className="text-base font-black text-ink">きょうだい別の予定・持ち物</h3>
            <p className="text-xs text-ink/60">
              子どもが増えても迷わない。誰の・何のタスクかを子ども別に一括整理
            </p>
          </div>
        </div>

        {/* 子どもフィルターチップ */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedChildTab("all")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              selectedChildTab === "all"
                ? "bg-moss text-white shadow-xs"
                : "border border-ink/15 bg-white text-ink/70 hover:bg-cloud"
            }`}
          >
            きょうだい全員 ({tasks.filter((t) => t.status !== "DONE").length})
          </button>
          {children.map((c) => {
            const theme = getChildTheme(c.name);
            const isSelected = selectedChildTab === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedChildTab(c.name)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                  isSelected
                    ? `${theme.badgeBg} ${theme.badgeText} border ${theme.border} ring-2 ring-moss/30`
                    : "border border-ink/15 bg-white text-ink/70 hover:bg-cloud"
                }`}
              >
                <span className={`size-1.5 rounded-full ${theme.dotColor}`} />
                <span>{c.name}</span>
                <span className="opacity-75">({c.taskCount})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* きょうだい別カードレーン */}
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {children.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/20 bg-white p-6 text-center text-xs text-ink/60 md:col-span-2">
            子どもが紐づいたタスクがまだありません。お便りからTODOを作成すると自動で分類されます。
          </div>
        ) : (
          (selectedChildTab === "all"
            ? children
            : children.filter((c) => c.name === selectedChildTab)
          ).map((child) => {
            const theme = getChildTheme(child.name);
            const childTasks = tasksByChild.get(child.name) || [];

            return (
              <div
                key={child.name}
                className={`flex flex-col rounded-2xl border ${theme.border} ${theme.bg}/40 p-4.5 shadow-xs transition`}
              >
                {/* 子どもレーンヘッダー */}
                <div className="flex items-center justify-between border-b border-ink/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid size-7 place-items-center rounded-full ${theme.badgeBg} ${theme.badgeText} text-xs font-black`}
                    >
                      {child.name.charAt(0)}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-ink">{child.name} のタスク</h4>
                      <p className="text-[11px] text-ink/60">未完了 {childTasks.length}件</p>
                    </div>
                  </div>

                  <Link
                    href={`/tasks/new`}
                    className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2.5 py-1 text-xs font-semibold text-ink/80 hover:bg-white hover:text-ink shadow-2xs"
                  >
                    <Plus size={13} />
                    TODO追加
                  </Link>
                </div>

                {/* タスクリスト */}
                <div className="mt-3 flex-1 space-y-2.5">
                  {childTasks.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink/40">
                      直近のTODOはありません 🎉
                    </p>
                  ) : (
                    childTasks.map((task) => {
                      const isLoading = actionLoadingId === task.id;
                      return (
                        <div
                          key={task.id}
                          className="group flex items-start justify-between gap-2.5 rounded-xl border border-ink/10 bg-white p-3 shadow-2xs transition hover:border-moss/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <DuePill dueDate={task.dueDate} />
                              <PriorityPill priority={task.priority} />
                              <span className="rounded bg-cloud px-1.5 py-0.5 text-[10px] font-semibold text-ink/60">
                                {task.type}
                              </span>
                            </div>

                            <Link href={`/tasks/${task.id}`} className="block">
                              <p className="mt-1.5 text-sm font-bold text-ink hover:text-moss truncate">
                                {task.title}
                              </p>
                            </Link>

                            <div className="mt-1.5 flex items-center gap-2 text-xs text-ink/60">
                              <span>
                                {task.assigneeName ? (
                                  <span className="font-semibold text-ink/80">
                                    担当: {task.assigneeName}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold">担当未定</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* アクションボタン */}
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {onToggleStatus && (
                              <button
                                type="button"
                                onClick={() => onToggleStatus(task)}
                                disabled={isLoading}
                                className="grid size-7 place-items-center rounded-full text-ink/30 hover:text-moss transition"
                                title="完了にする"
                              >
                                {isLoading ? (
                                  <Loader2 size={16} className="animate-spin text-moss" />
                                ) : (
                                  <Circle size={18} />
                                )}
                              </button>
                            )}

                            {onAssignToMe && !task.assigneeName && (
                              <button
                                type="button"
                                onClick={() => onAssignToMe(task.id)}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1 rounded-full border border-moss/40 bg-mint/50 px-2 py-0.5 text-[11px] font-bold text-moss shadow-2xs hover:bg-moss hover:text-white transition"
                              >
                                <Hand size={11} />
                                <span>私がやる</span>
                              </button>
                            )}

                            {onThankYou && task.assigneeName && (
                              <button
                                type="button"
                                onClick={() => onThankYou(task)}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                                title="担当してくれてありがとう！"
                              >
                                <span>❤️ ありがとう</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
