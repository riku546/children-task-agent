"use client";

import {
  ArrowRight,
  CheckCircle2,
  Command,
  Filter,
  Layers,
  Loader2,
  Lock,
  ScanText,
  ShieldCheck,
  UserCheck
} from "lucide-react";
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
      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-b from-zinc-50/50 via-white to-white px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24">
        {/* 背景微細グリッド */}
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative mx-auto max-w-5xl text-center">
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-2xs">
            <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-zinc-900">v0.2</span>
            <span className="text-zinc-300">|</span>
            <span>マルチモーダルAIによるお便り自動構造化SaaS</span>
          </div>

          {/* メイン見出し */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-6xl md:text-7xl">
            お便りをパシャリ。
            <br />
            AIが
            <span className="text-zinc-900 underline decoration-zinc-300 decoration-wavy decoration-2">
              TODO・持ち物
            </span>
            を分解し、
            <br className="hidden sm:inline" />
            家族でシェア。
          </h1>

          {/* サブリード文 */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            プリントを冷蔵庫に貼る必要も、手作業でのカレンダー転記も不要です。
            撮影した画像やPDFから、提出期日・持ち物・集金を瞬時にタスク化。
            きょうだい別の管理と夫婦チームでの引き受けをサポートします。
          </p>

          {/* CTAボタン群 */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-zinc-800 active:scale-[0.98] sm:w-auto"
              >
                <span>ダッシュボードを開く</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  disabled={loading}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-zinc-400" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{loading ? "認証中..." : "Googleアカウントで始める"}</span>
                </button>

                <Link
                  href="/dashboard"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-900 sm:w-auto"
                >
                  <span>デモを試す</span>
                  <ArrowRight size={14} className="text-zinc-400" />
                </Link>
              </>
            )}
          </div>

          {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}

          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              ZDR準拠（推論後データ即時破棄）
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              クレジットカード登録不要
            </span>
          </div>

          {/* SaaS風プロダクトUIモックアップ（Linear風インターフェース） */}
          <div className="relative mx-auto mt-14 max-w-4xl rounded-xl border border-zinc-200/90 bg-white p-2 shadow-soft sm:p-3">
            {/* ウィンドウコントロールバー */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-zinc-300" />
                <span className="size-2.5 rounded-full bg-zinc-300" />
                <span className="size-2.5 rounded-full bg-zinc-300" />
                <span className="ml-2 font-mono text-[11px] font-medium text-zinc-500">
                  app.childcare-task.agent / inbox
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <span className="inline-flex items-center gap-1 rounded bg-zinc-200/60 px-1.5 py-0.5 font-mono text-[10px]">
                  <Command size={10} /> K
                </span>
              </div>
            </div>

            {/* モック内部コンテンツ */}
            <div className="mt-3 space-y-2.5 p-2 text-left">
              {/* ステータスバー */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-zinc-600">
                  <span className="font-semibold text-zinc-900">未処理のお便り</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.2 text-[10px] font-mono text-zinc-600">
                    2件
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2 py-0.5 text-[11px]">
                    <Filter size={11} />
                    全員
                  </span>
                </div>
              </div>

              {/* タスクアイテム1 */}
              <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white p-3 shadow-2xs hover:border-zinc-200 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-4 shrink-0 rounded border border-zinc-300" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">
                      遠足用のお弁当と水筒の準備
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 font-sans font-medium">
                        太郎（小1）
                      </span>
                      <span>期限: 5月15日</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700">
                    担当: パパ
                  </span>
                </div>
              </div>

              {/* タスクアイテム2 */}
              <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white p-3 shadow-2xs hover:border-zinc-200 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-4 shrink-0 rounded border border-zinc-300" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">
                      集金袋（教材費 ¥2,400）の提出
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                      <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-violet-700 font-sans font-medium">
                        花子（年少）
                      </span>
                      <span>期限: 5月18日</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                    担当未定
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3つのコア機能セクション */}
      <section className="border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-bold tracking-wider uppercase text-zinc-500">
              Core Capabilities
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
              育児のタスク管理を、モダンSaaSの体験に
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600">
              散乱する紙のお便りやLINEの連絡網を、チームで実行可能な構造化データへと集約します。
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
              <div>
                <div className="grid size-9 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
                  <ScanText size={18} />
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-950">
                  マルチモーダル高速スキャン
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  写真、PDF、音声に対応。Gemini
                  VLMが日本語お便りの文脈を解析し、日付・持ち物・集金を正確に抽出します。
                </p>
              </div>
              <div className="mt-6 border-t border-zinc-100 pt-3 text-[11px] font-mono text-zinc-500">
                01 / INGESTION
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
              <div>
                <div className="grid size-9 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
                  <Layers size={18} />
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-950">
                  きょうだい別マルチレーン管理
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  お子さんごとにレーンを分離。「誰の提出物か」を明確にし、同日行事の重複や親の仕事との衝突を自動検知します。
                </p>
              </div>
              <div className="mt-6 border-t border-zinc-100 pt-3 text-[11px] font-mono text-zinc-500">
                02 / MULTI-CHILD
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
              <div>
                <div className="grid size-9 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
                  <UserCheck size={18} />
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-950">
                  ワークロード可視化と引き受け
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  「私がやる」ワンタップ分担と、家族のタスク比率メーター。特定の人への育児負荷の偏りを防ぎます。
                </p>
              </div>
              <div className="mt-6 border-t border-zinc-100 pt-3 text-[11px] font-mono text-zinc-500">
                03 / TEAM PARENTING
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* セキュリティ・プライバシーセクション */}
      <section className="border-b border-zinc-200/80 bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-8 sm:flex-row sm:p-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Privacy & Security</span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-zinc-950">
              Zero Data Retention（データ学習なし）
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              お子さんの名前や学校名、家庭情報は機微情報です。AI推論完了後に即座にデータは破棄され、プロバイダー側の学習に利用されることは一切ありません。
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs font-medium text-zinc-700 shadow-2xs">
              <Lock size={12} className="text-emerald-600" />
              ZDR Compliant
            </span>
          </div>
        </div>
      </section>

      {/* ボトムCTA */}
      <section className="bg-zinc-50/50 px-4 py-20 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
            名もなき育児を、チームで動かす。
          </h2>
          <p className="mt-3 text-sm text-zinc-600">
            Googleアカウントがあれば、10秒で今すぐ始められます。
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loading}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin text-zinc-400" />
              ) : (
                <GoogleIcon />
              )}
              <span>Googleアカウントで始める</span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 sm:w-auto"
            >
              <span>ダッシュボードを開く</span>
              <ArrowRight size={13} className="text-zinc-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-zinc-200/80 bg-white px-4 py-8 text-xs text-zinc-500 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
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
