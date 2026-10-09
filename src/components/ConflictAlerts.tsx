"use client";

import {
  AlertTriangle,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChildBadge } from "@/components/ChildBadge";
import type { ConflictAnalysisResult } from "@/lib/conflict-detector";

type Props = {
  conflicts: ConflictAnalysisResult;
  onSelectDate?: (dateKey: string) => void;
};

export function ConflictAlerts({ conflicts, onSelectDate }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (!conflicts.hasAnyConflict) {
    return null;
  }

  const { siblingConflicts, workConflicts } = conflicts;
  const totalCount = siblingConflicts.length + workConflicts.length;

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 shadow-sm transition">
      {/* ヘッダーバー */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/70 bg-amber-100/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-amber-500 text-white shadow-sm">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h3 className="text-base font-black text-amber-950">
              予定の重複・衝突が {totalCount}件 検出されました
            </h3>
            <p className="text-xs text-amber-800">
              ダブルブッキングや仕事とのバッティングを未然に防ぐため、事前に確認・調整しましょう
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/family"
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-50"
          >
            <Users size={14} />
            家族で分担調整
          </Link>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="grid size-7 place-items-center rounded-full text-amber-900 transition hover:bg-amber-200/50"
            title={expanded ? "折りたたむ" : "展開する"}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 p-4">
          {/* 機能4: 仕事と子育ての予定の衝突警告 */}
          {workConflicts.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800">
                <Briefcase size={14} className="text-rose-600" />
                <span>仕事 × 子育ての予定衝突（{workConflicts.length}件）</span>
              </div>
              <div className="grid gap-2.5">
                {workConflicts.map((c) => (
                  <div
                    key={`work-${c.dateKey}`}
                    className="rounded-lg border border-rose-200 bg-white p-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 pb-2">
                      <span className="flex items-center gap-1.5 font-bold text-rose-900">
                        <Calendar size={15} className="text-rose-600" />
                        {c.formattedDate}
                      </span>
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                        🚨 要調整（仕事と重複）
                      </span>
                    </div>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2.5">
                        <p className="text-xs font-bold text-slate-500">【勤務先・仕事の予定】</p>
                        <div className="mt-1 space-y-1">
                          {c.workTasks.map((wt) => (
                            <p key={wt.id} className="text-sm font-semibold text-slate-800">
                              💼 {wt.title}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
                        <p className="text-xs font-bold text-amber-700">
                          【園・学校・家庭のタスク】
                        </p>
                        <div className="mt-1 space-y-1">
                          {c.childcareTasks.map((ct) => (
                            <div
                              key={ct.id}
                              className="flex items-center gap-1.5 text-sm font-semibold text-ink"
                            >
                              <ChildBadge name={ct.childName} size="sm" />
                              <span className="truncate">{ct.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-950/80">
                      <p className="flex items-center gap-1">
                        <Sparkles size={13} className="text-rose-600" />
                        パートナーにタスクの引き受けをお願いするか、仕事の調整を検討しましょう
                      </p>
                      {onSelectDate && (
                        <button
                          type="button"
                          onClick={() => onSelectDate(c.dateKey)}
                          className="font-bold text-moss hover:underline"
                        >
                          この日のカレンダーを見る →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 機能2: きょうだいの予定・提出期限の重複通知 */}
          {siblingConflicts.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                <AlertTriangle size={14} className="text-amber-600" />
                <span>きょうだいの予定・提出期限の重複（{siblingConflicts.length}件）</span>
              </div>
              <div className="grid gap-2.5">
                {siblingConflicts.map((sc) => (
                  <div
                    key={`sibling-${sc.dateKey}`}
                    className="rounded-lg border border-amber-200 bg-white p-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2">
                      <span className="flex items-center gap-1.5 font-bold text-amber-950">
                        <Calendar size={15} className="text-amber-600" />
                        {sc.formattedDate}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {sc.childNames.map((name) => (
                          <ChildBadge key={name} name={name} size="sm" />
                        ))}
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      {sc.tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm text-ink">
                          <ChildBadge name={task.childName} size="sm" />
                          <span className="font-semibold">{task.title}</span>
                          <span className="text-xs text-ink/50">({task.type})</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900/80">
                      <p>
                        💡
                        同日に重なっています。持ち物準備や送迎の分担を事前に決めておくと安心です。
                      </p>
                      {onSelectDate && (
                        <button
                          type="button"
                          onClick={() => onSelectDate(sc.dateKey)}
                          className="font-bold text-moss hover:underline"
                        >
                          この日のカレンダーを見る →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
