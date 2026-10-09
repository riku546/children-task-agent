"use client";

import { ChevronRight, Scale, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
};

export function WorkloadBalance({ tasks }: Props) {
  // 未完了タスクを集計
  const analysis = useMemo(() => {
    const todoTasks = tasks.filter((t) => t.status !== "DONE");
    const totalTodo = todoTasks.length;

    // 担当者ごとの件数を集計
    const memberMap = new Map<string, { name: string; count: number; doneCount: number }>();
    let unassignedCount = 0;

    for (const t of todoTasks) {
      const name = t.assigneeName?.trim();
      if (name) {
        const item = memberMap.get(name) || { name, count: 0, doneCount: 0 };
        item.count += 1;
        memberMap.set(name, item);
      } else {
        unassignedCount += 1;
      }
    }

    // 完了タスクの完了数もカウント
    for (const t of tasks.filter((t) => t.status === "DONE")) {
      const name = t.assigneeName?.trim();
      if (name) {
        const item = memberMap.get(name);
        if (item) {
          item.doneCount += 1;
        }
      }
    }

    const members = Array.from(memberMap.values()).sort((a, b) => b.count - a.count);

    // 偏りの判定
    let advice = "未担当のタスクを「私がやる」ボタンで引き受けてみましょう！";
    let statusText = "分担調整中";
    let statusColor = "text-ink/70";

    if (totalTodo === 0) {
      advice = "現在未完了のタスクはありません。素晴らしい！";
      statusText = "タスクなし";
      statusColor = "text-moss";
    } else if (members.length >= 2) {
      const topCount = members[0].count;
      const secondCount = members[1].count;
      const ratio = topCount / totalTodo;

      if (ratio > 0.7 && totalTodo >= 3) {
        advice = `${members[0].name} さんにタスクが集中しています。分担してみましょう！`;
        statusText = "偏り注意";
        statusColor = "text-amber-600";
      } else if (Math.abs(topCount - secondCount) <= 2) {
        advice = "家族でとてもバランスよく分担できています！";
        statusText = "バランス良好";
        statusColor = "text-moss";
      }
    } else if (unassignedCount > 0 && members.length === 0) {
      advice = "担当が決まっていないタスクがあります。「私がやる」で引き受けましょう！";
      statusText = "未担当あり";
      statusColor = "text-sky-600";
    }

    return {
      totalTodo,
      unassignedCount,
      members,
      advice,
      statusText,
      statusColor
    };
  }, [tasks]);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 rounded-xl border border-ink/10 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-mint text-moss">
            <Scale size={16} />
          </span>
          <div>
            <h3 className="text-sm font-black text-ink">家族のToDo分担状況（見える化）</h3>
            <p className="text-xs text-ink/60">家庭内のタスク引き受けとバランス</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${analysis.statusColor}`}>
            ● {analysis.statusText}
          </span>
          <Link
            href="/family"
            className="flex items-center gap-0.5 text-xs font-bold text-moss hover:underline"
          >
            詳しく見る
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* 分担バー（スタックドプログレスバー） */}
      {analysis.totalTodo > 0 && (
        <div className="mt-3.5">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-cloud">
            {analysis.members.map((m, idx) => {
              const pct = (m.count / analysis.totalTodo) * 100;
              const bgColors = ["bg-moss", "bg-sky-500", "bg-violet-500", "bg-rose-500"];
              const color = bgColors[idx % bgColors.length];
              return (
                <div
                  key={m.name}
                  style={{ width: `${pct}%` }}
                  className={`${color} transition-all duration-300`}
                  title={`${m.name}: ${m.count}件 (${Math.round(pct)}%)`}
                />
              );
            })}
            {analysis.unassignedCount > 0 && (
              <div
                style={{ width: `${(analysis.unassignedCount / analysis.totalTodo) * 100}%` }}
                className="bg-amber-400 transition-all duration-300"
                title={`担当未定: ${analysis.unassignedCount}件`}
              />
            )}
          </div>

          {/* 凡例 / 担当者カード */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {analysis.members.map((m, idx) => {
              const dotColors = ["bg-moss", "bg-sky-500", "bg-violet-500", "bg-rose-500"];
              const color = dotColors[idx % dotColors.length];
              return (
                <div
                  key={m.name}
                  className="flex items-center gap-1.5 text-xs font-semibold text-ink"
                >
                  <span className={`size-2 rounded-full ${color}`} />
                  <span>{m.name}</span>
                  <span className="font-bold text-ink/80">{m.count}件</span>
                </div>
              );
            })}
            {analysis.unassignedCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <span className="size-2 rounded-full bg-amber-400" />
                <span>担当未定</span>
                <span className="font-bold">{analysis.unassignedCount}件</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* アドバイスバナー */}
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-cloud/70 px-3 py-2 text-xs font-semibold text-ink/80">
        <Sparkles size={14} className="shrink-0 text-moss" />
        <span>{analysis.advice}</span>
      </div>
    </section>
  );
}
