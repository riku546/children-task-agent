"use client";

import { ArrowRight, Layers, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCachedData } from "@/lib/client-cache";

function GoogleIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <title>Google</title>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const cached = getCachedData<{ user: any }>("/api/me");
    if (cached?.user) {
      setIsLoggedIn(true);
    } else {
      fetch("/api/me")
        .then((res) => {
          if (res.ok) setIsLoggedIn(true);
        })
        .catch(() => {});
    }
  }, []);

  async function loginWithGoogle() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/google", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) {
        setError(data.error || "Googleログインを開始できませんでした");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("ログイン処理中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* ヒーローセクション */}
      <section className="relative border-b border-zinc-200 px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
            <span className="flex size-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-zinc-900">v0.2 Beta</span>
            <span className="text-zinc-300">/</span>
            <span>マルチモーダルAIによるお便り自動構造化</span>
          </div>

          {/* メイン見出し */}
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
            お便りをパシャリ。
            <br />
            AIがTODO・持ち物を分解し、
            <br className="hidden sm:inline" />
            家族でシェア。
          </h1>

          {/* サブリード文 */}
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            プリントを冷蔵庫に貼る必要も、手作業での転記も不要です。
            撮影した画像やPDFから提出期日・持ち物・集金を瞬時にタスク化。
            きょうだい別管理とチーム育児をサポートします。
          </p>

          {/* CTAボタン群 */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isLoggedIn ? (
              <Link href="/dashboard" className="button-primary min-h-10 px-5 text-xs sm:w-auto">
                <span>ダッシュボードを開く</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  disabled={loading}
                  className="button-primary min-h-10 px-5 text-xs sm:w-auto"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin text-zinc-400" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{loading ? "認証中..." : "Googleアカウントで始める"}</span>
                </button>

                <Link
                  href="/dashboard"
                  className="button-secondary min-h-10 px-4 text-xs sm:w-auto"
                >
                  <span>デモを試す</span>
                  <ArrowRight size={13} className="text-zinc-400" />
                </Link>
              </>
            )}
          </div>

          {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}

          <div className="mt-4 flex items-center justify-center gap-6 text-[11px] text-zinc-500 font-mono">
            <span>ZDR準拠（データ即時破棄）</span>
            <span>•</span>
            <span>無料・登録不要デモあり</span>
          </div>

          {/* インラインUIプレビュー（浮いたカードではなく、1本のボーダー枠内に収まる） */}
          <div className="mt-12 border border-zinc-200 bg-zinc-50/50 text-left">
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-1.5 text-[11px] font-mono text-zinc-500 bg-white">
              <span>app.childcare-task.agent / inbox</span>
              <span>⌘K</span>
            </div>

            <div className="divide-y divide-zinc-200 bg-white">
              <div className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="size-3.5 rounded border border-zinc-300 shrink-0" />
                  <span className="font-medium text-zinc-900 truncate">
                    遠足用のお弁当と水筒の準備
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
                    太郎（小1）
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 shrink-0">
                  <span>5/15 期限</span>
                  <span className="font-sans font-medium text-zinc-700">担当: パパ</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="size-3.5 rounded border border-zinc-300 shrink-0" />
                  <span className="font-medium text-zinc-900 truncate">
                    集金袋（教材費 ¥2,400）の提出
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
                    花子（年少）
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 shrink-0">
                  <span>5/18 期限</span>
                  <span className="font-sans font-medium text-amber-600">担当未定</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3つのコア機能（カードではなく、1本のボーダーで美しく分割されたマトリクス） */}
      <section className="border-b border-zinc-200 bg-white px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Core Capabilities
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
              育児のタスク管理を、モダンSaaSの体験に
            </h2>
          </div>

          <div className="mt-12 border-t border-b border-zinc-200 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 grid sm:grid-cols-3">
            {/* 01 */}
            <div className="py-6 sm:px-6 first:pl-0 last:pr-0">
              <span className="font-mono text-[11px] text-zinc-400">01 / INGESTION</span>
              <h3 className="mt-1.5 text-xs font-bold text-zinc-900">マルチモーダル高速スキャン</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                写真、PDF、音声に対応。Gemini
                VLMがお便りの文脈を解析し、日付・持ち物・集金を正確に抽出。
              </p>
            </div>

            {/* 02 */}
            <div className="py-6 sm:px-6">
              <span className="font-mono text-[11px] text-zinc-400">02 / MULTI-CHILD</span>
              <h3 className="mt-1.5 text-xs font-bold text-zinc-900">きょうだい別マルチレーン</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                お子さんごとにレーンを分離。誰の提出物かを明確にし、同日行事の重複や親の仕事との衝突を検知。
              </p>
            </div>

            {/* 03 */}
            <div className="py-6 sm:px-6 last:pr-0">
              <span className="font-mono text-[11px] text-zinc-400">03 / TEAM WORKLOAD</span>
              <h3 className="mt-1.5 text-xs font-bold text-zinc-900">
                ワークロード可視化と引き受け
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                「私がやる」ワンタップ分担と、家族のタスク比率メーター。特定の人への育児負荷の偏りを防止。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* プライバシーセクション（インライン） */}
      <section className="border-b border-zinc-200 bg-zinc-50/50 px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">Security</p>
            <h3 className="mt-1 text-sm font-bold text-zinc-900">
              Zero Data Retention（データ学習なし）
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-xl">
              お子さんの名前やお便りデータは、AI推論完了後に即座に破棄されます。モデルの学習には一切使用されません。
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] text-zinc-600 shrink-0">
            <Lock size={11} className="text-emerald-600" />
            ZDR Compliant
          </span>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-white px-4 py-8 text-xs text-zinc-500 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-zinc-800">
            <Layers size={14} />
            <span>育児タスクAI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-zinc-900 transition">
              ダッシュボード
            </Link>
            <Link href="/login" className="hover:text-zinc-900 transition">
              ログイン
            </Link>
            <span className="text-zinc-300">|</span>
            <span>© 2026 Childcare Task Agent.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
