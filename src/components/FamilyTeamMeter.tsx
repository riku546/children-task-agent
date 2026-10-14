"use client";

import { useMemo } from "react";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  /** team: 分担画面用（リンクなし） */
  variant?: "inline" | "team";
};

export function FamilyTeamMeter({ tasks, variant = "inline" }: Props) {
  const analysis = useMemo(() => {
    const todoTasks = tasks.filter((t) => t.status !== "DONE");
    const doneTasks = tasks.filter((t) => t.status === "DONE");
    const totalTodo = todoTasks.length;

    // 担当者ごとの件数
    const memberMap = new Map<string, { name: string; todoCount: number; doneCount: number }>();
    let unassignedCount = 0;

    for (const t of todoTasks) {
      const name = t.assigneeName?.trim();
      if (name) {
        const item = memberMap.get(name) || { name, todoCount: 0, doneCount: 0 };
        item.todoCount += 1;
        memberMap.set(name, item);
      } else {
        unassignedCount += 1;
      }
    }

    for (const t of doneTasks) {
      const name = t.assigneeName?.trim();
      if (name) {
        const item = memberMap.get(name);
        if (item) {
          item.doneCount += 1;
        }
      }
    }

    const members = Array.from(memberMap.values()).sort((a, b) => b.todoCount - a.todoCount);

    return {
      totalTodo,
      unassignedCount,
      members
    };
  }, [tasks]);

  if (tasks.length === 0 || analysis.totalTodo === 0) return null;

  const borderClass =
    variant === "team" ? "rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5" : "";

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm text-zinc-600 ${borderClass} ${
        variant === "inline" ? "border-b border-zinc-200/70" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="shrink-0 text-xs font-semibold text-zinc-500">担当の内訳</span>

        <div className="flex h-2.5 w-32 sm:w-48 overflow-hidden rounded-full bg-zinc-100 shrink-0">
          {analysis.members.map((m, idx) => {
            const pct = (m.todoCount / analysis.totalTodo) * 100;
            const colors = ["bg-zinc-800", "bg-zinc-500", "bg-zinc-400", "bg-zinc-300"];
            const color = colors[idx % colors.length];
            return (
              <div
                key={m.name}
                style={{ width: `${pct}%` }}
                className={`h-full ${color}`}
                title={`${m.name}: ${m.todoCount}件`}
              />
            );
          })}
          {analysis.unassignedCount > 0 && (
            <div
              style={{ width: `${(analysis.unassignedCount / analysis.totalTodo) * 100}%` }}
              className="h-full bg-amber-400"
              title={`未割当: ${analysis.unassignedCount}件`}
            />
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2.5 text-xs truncate">
          {analysis.members.map((m, idx) => {
            const dotColors = ["bg-zinc-800", "bg-zinc-500", "bg-zinc-400", "bg-zinc-300"];
            const color = dotColors[idx % dotColors.length];
            return (
              <span key={m.name} className="flex items-center gap-1 truncate text-zinc-700">
                <span className={`size-1.5 rounded-full ${color}`} />
                <span>{m.name}</span>
                <span className="font-mono text-zinc-400">({m.todoCount})</span>
              </span>
            );
          })}
          {analysis.unassignedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-400" />
              <span>未割当</span>
              <span className="font-mono text-amber-600">({analysis.unassignedCount})</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
