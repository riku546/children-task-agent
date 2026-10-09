"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
};

export function FamilyTeamMeter({ tasks }: Props) {
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 py-2.5 text-xs text-zinc-600">
      {/* 担当者内訳プログレスバー（インライン） */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 shrink-0">
          Workload
        </span>

        <div className="flex h-2 w-32 sm:w-48 overflow-hidden rounded-full bg-zinc-100 shrink-0">
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

        <div className="hidden sm:flex items-center gap-2.5 text-[11px] truncate">
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

      <Link
        href="/dashboard?view=assignee"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 transition shrink-0"
      >
        <span>分担ボード</span>
        <ArrowUpRight size={12} />
      </Link>
    </div>
  );
}
