"use client";

import { AlertTriangle, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ConflictAnalysisResult } from "@/lib/conflict-detector";

type Props = {
  conflicts: ConflictAnalysisResult;
  onSelectDate?: (dateKey: string) => void;
};

export function ConflictAlerts({ conflicts }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!conflicts.hasAnyConflict) {
    return null;
  }

  const { siblingConflicts, workConflicts } = conflicts;
  const totalCount = siblingConflicts.length + workConflicts.length;

  return (
    <div className="border-b border-amber-200/90 bg-amber-50/40 text-amber-950 transition">
      {/* 1行インラインバー */}
      <div className="flex items-center justify-between gap-3 py-2 px-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
          <span className="text-xs font-semibold truncate">
            予定の重複・衝突が {totalCount}件 検出されました
          </span>
          <span className="hidden sm:inline text-[11px] text-amber-700 truncate">
            — 仕事やきょうだい間の重複を確認してください
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/family"
            className="text-[11px] font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2"
          >
            分担調整
          </Link>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-800 hover:text-amber-950"
          >
            <span>{expanded ? "閉じる" : "詳細"}</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* 展開時詳細（フラットなインライン展開） */}
      {expanded && (
        <div className="space-y-2.5 px-3 pb-3 pt-1 border-t border-amber-200/60 text-xs">
          {workConflicts.map((c) => (
            <div key={`work-${c.dateKey}`} className="flex items-start gap-2 text-zinc-700">
              <Briefcase size={13} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-zinc-900">{c.formattedDate || c.dateKey}</span>:{" "}
                {c.summary}
              </div>
            </div>
          ))}

          {siblingConflicts.map((c) => (
            <div key={`sibling-${c.dateKey}`} className="flex items-start gap-2 text-zinc-700">
              <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-zinc-900">{c.formattedDate || c.dateKey}</span>:{" "}
                {c.summary}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
