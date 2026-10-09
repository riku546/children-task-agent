"use client";

import { ChevronRight, HeartHandshake, Sparkles } from "lucide-react";
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
    let message = "未担当のタスクを「私がやる」で引き受け合ってみましょう！";
    let badgeText = "チーム調整中";
    let badgeColor = "bg-amber-100 text-amber-800 border-amber-200";

    if (totalTodo === 0 && doneTasks.length > 0) {
      score = 100;
      message = "🎉 今週のTODOはすべて完了！家族の素晴らしい連携です！";
      badgeText = "完全制覇 🌟";
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    } else if (members.length >= 2) {
      const top = members[0].todoCount;
      const second = members[1].todoCount;
      const diff = Math.abs(top - second);

      if (diff <= 1) {
        score = 95;
        message = "👫 素晴らしい！夫婦でバランスよく助け合えています。";
        badgeText = "連携バッチリ ✨";
        badgeColor = "bg-moss/15 text-moss border-moss/30";
      } else if (diff <= 3) {
        score = 80;
        message = "👍 いいチームワークです！無理のない範囲で声かけ合っていきましょう。";
        badgeText = "助け合い中 🤝";
        badgeColor = "bg-sky-100 text-sky-800 border-sky-200";
      } else {
        score = 65;
        message = `⚠️ ${members[0].name} さんに負担が偏っています。「私がやる」で引き受けてみませんか？`;
        badgeText = "偏り注意 ⚠️";
        badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
      }
    } else if (unassignedCount > 0 && members.length === 0) {
      score = 70;
      message = "📝 担当が決まっていないタスクがあります。みんなで1つずつ引き受けましょう！";
      badgeText = "引き受け待ち";
      badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    }

    return {
      totalTodo,
      unassignedCount,
      members,
      score,
      message,
      badgeText,
      badgeColor
    };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-mint text-moss shadow-2xs">
            <HeartHandshake size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-ink">今週のチーム育児メーター</h3>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${analysis.badgeColor}`}
              >
                {analysis.badgeText}
              </span>
            </div>
            <p className="text-xs text-ink/65">
              育児は指示出しではなくチーム戦。夫婦のタスク分担と助け合い状況です
            </p>
          </div>
        </div>

        <Link
          href="/family"
          className="flex items-center gap-1 rounded-lg border border-ink/15 bg-cloud/50 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-cloud hover:border-ink/25"
        >
          <span>家族の分担ボード</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* スコア ＆ メンバー別アバター進捗 */}
      <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr] md:items-center">
        {/* 連携スコアサークル */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-ink/5 bg-cloud/40 p-3 text-center">
          <span className="text-xs font-bold text-ink/60">チーム連携スコア</span>
          <div className="mt-1 flex items-baseline gap-0.5">
            <span className="text-3xl font-black text-moss">{analysis.score}</span>
            <span className="text-xs font-bold text-ink/50">/ 100</span>
          </div>
        </div>

        {/* スタックバー ＆ 担当者内訳 */}
        <div>
          {analysis.totalTodo > 0 ? (
            <div>
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-cloud p-0.5 shadow-inner">
                {analysis.members.map((m, idx) => {
                  const pct = (m.todoCount / analysis.totalTodo) * 100;
                  const bgColors = ["bg-moss", "bg-sky-500", "bg-violet-500", "bg-rose-500"];
                  const color = bgColors[idx % bgColors.length];
                  return (
                    <div
                      key={m.name}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${color} rounded-sm transition-all duration-300`}
                      title={`${m.name}: ${m.todoCount}件`}
                    />
                  );
                })}
                {analysis.unassignedCount > 0 && (
                  <div
                    style={{ width: `${(analysis.unassignedCount / analysis.totalTodo) * 100}%` }}
                    className="h-full bg-amber-400 rounded-sm transition-all duration-300"
                    title={`担当未定: ${analysis.unassignedCount}件`}
                  />
                )}
              </div>

              {/* メンバー別件数 */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                {analysis.members.map((m, idx) => {
                  const dotColors = ["bg-moss", "bg-sky-500", "bg-violet-500", "bg-rose-500"];
                  const color = dotColors[idx % dotColors.length];
                  return (
                    <div
                      key={m.name}
                      className="flex items-center gap-1.5 text-xs font-semibold text-ink"
                    >
                      <span className={`size-2 rounded-full ${color}`} />
                      <span>{m.name}:</span>
                      <span className="font-bold text-ink">{m.todoCount}件</span>
                      <span className="text-[11px] text-ink/50">（完了{m.doneCount}）</span>
                    </div>
                  );
                })}
                {analysis.unassignedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span>担当未定:</span>
                    <span className="font-bold">{analysis.unassignedCount}件</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs font-semibold text-moss">未完了のタスクはありません。</p>
          )}

          {/* 協働アドバイス */}
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-mint/20 px-3 py-2 text-xs font-semibold text-moss">
            <Sparkles size={14} className="shrink-0" />
            <span>{analysis.message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
