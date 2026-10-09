"use client";

import { Camera, Sparkles, Upload } from "lucide-react";
import Link from "next/link";

export function QuickScanHero() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-moss/20 bg-gradient-to-br from-mint/40 via-white to-cloud p-6 shadow-sm">
      {/* 背景装飾 */}
      <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-mint/30 blur-2xl" />

      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-moss/30 bg-white/80 px-3 py-1 text-xs font-bold text-moss shadow-2xs backdrop-blur-xs">
            <Sparkles size={14} className="text-moss" />
            <span>名もなき育児・お便りのストレスから解放</span>
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-ink md:text-3xl">
            園や学校のお便りをパシャリ。
            <br className="hidden sm:inline" />
            AIが<span className="text-moss">TODO・持ち物</span>を自動分解して家族にシェア
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-ink/75">
            冷蔵庫に貼る必要も、パートナーに「これ読んで」と頼む必要もありません。
            写真1枚で期限・持ち物・集金を整理し、家族のTODOとして共有します。
          </p>
        </div>

        {/* アクションボタン群 */}
        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row md:flex-col lg:flex-row">
          <Link
            href="/tasks/new"
            className="flex items-center justify-center gap-2 rounded-xl bg-moss px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-moss/90 hover:shadow-lg focus-ring active:scale-98"
          >
            <Camera size={18} />
            <span>お便りを撮影・読み取る</span>
          </Link>

          <Link
            href="/tasks/new"
            className="flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-3.5 text-sm font-bold text-ink shadow-2xs transition hover:bg-cloud hover:border-ink/30 focus-ring"
          >
            <Upload size={17} className="text-ink/60" />
            <span>画像・PDFを選ぶ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
