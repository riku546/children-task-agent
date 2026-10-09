"use client";

import { ArrowUpRight, BarChart3, Info } from "lucide-react";
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

    // チームワークスコアの算出（100点満点）
    let score = 100;
    let message = "未担当のタスクを引き受け合ってバランスを取りましょう";
    let badgeText = "調整中";

    if (totalTodo === 0 && doneTasks.length > 0) {
      score = 100;
      message = "今週のタスクはすべて完了しています。";
      badgeText = "完了";
    } else if (members.length >= 2) {
      const top = members[0].todoCount;
      const second = members[1].todoCount;
      const diff = Math.abs(top - second);

      if (diff <= 1) {
        score = 95;
        message = "夫婦でバランスよくタスクを分担できています。";
        badgeText = "良好";
      } else if (diff <= 3) {
        score = 80;
        message = "概ね良好な分担状況です。";
        badgeText = "安定";
      } else {
        score = 65;
        message = `${members[0].name} さんに負担が集中しています。「引き受ける」でサポートしましょう。`;
        badgeText = "偏りあり";
      }
    } else if (unassignedCount > 0 && members.length === 0) {
      score = 70;
      message = "担当が決まっていないタスクがあります。";
      badgeText = "未割当あり";
    }

    return {
      totalTodo,
      unassignedCount,
      members,
      score,
      message,
      badgeText
    };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 shadow-2xs">
            <BarChart3 size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900">ワークロード・チーム分担</h3>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600">
                {analysis.badgeText}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              夫婦間でのタスク保有バランスと未完了件数の比率
            </p>
          </div>
        </div>

        <Link
          href="/family"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition"
        >
          <span>詳細分担ボード</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* スコア ＆ バー */}
      <div className="mt-3.5 grid gap-4 sm:grid-cols-[110px_1fr] sm:items-center">
        {/* スコア */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50/70 p-2.5 text-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Balance
          </span>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold tracking-tight text-zinc-900">
              {analysis.score}
            </span>
            <span className="font-mono text-[10px] text-zinc-400">/100</span>
          </div>
        </div>

        {/* スタックバー ＆ 担当者内訳 */}
        <div className="min-w-0">
          {analysis.totalTodo > 0 ? (
            <div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                {analysis.members.map((m, idx) => {
                  const pct = (m.todoCount / analysis.totalTodo) * 100;
                  const colors = ["bg-zinc-800", "bg-zinc-500", "bg-zinc-400", "bg-zinc-300"];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={m.name}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${color} transition-all duration-300`}
                      title={`${m.name}: ${m.todoCount}件`}
                    />
                  );
                })}
                {analysis.unassignedCount > 0 && (
                  <div
                    style={{ width: `${(analysis.unassignedCount / analysis.totalTodo) * 100}%` }}
                    className="h-full bg-amber-400 transition-all duration-300"
                    title={`未定: ${analysis.unassignedCount}件`}
                  />
                )}
              </div>

              {/* メンバー別数値 */}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {analysis.members.map((m, idx) => {
                  const dotColors = ["bg-zinc-800", "bg-zinc-500", "bg-zinc-400", "bg-zinc-300"];
                  const color = dotColors[idx % dotColors.length];
                  return (
                    <div key={m.name} className="flex items-center gap-1.5 text-zinc-700">
                      <span className={`size-2 rounded-full ${color}`} />
                      <span className="font-medium">{m.name}:</span>
                      <span className="font-mono font-semibold text-zinc-900">{m.todoCount}件</span>
                    </div>
                  );
                })}
                {analysis.unassignedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="font-medium">未定:</span>
                    <span className="font-mono font-semibold">{analysis.unassignedCount}件</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">未完了のタスクはありません。</p>
          )}

          {/* インフォメッセージ */}
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-1.5 text-[11px] text-zinc-600">
            <Info size={13} className="shrink-0 text-zinc-400" />
            <span>{analysis.message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
