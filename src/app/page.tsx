"use client";

import {
  ArrowRight,
  Baby,
  Camera,
  CheckCircle2,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCachedData } from "@/lib/client-cache";

function GoogleIcon() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
    // ログイン状態の確認（キャッシュまたはAPI）
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
    <div className="min-h-screen bg-sand text-ink">
      {/* ヒーローセクション */}
      <section className="relative overflow-hidden border-b border-ink/10 bg-gradient-to-b from-mint/20 via-sand to-sand px-4 pb-20 pt-12 md:pb-28 md:pt-20">
        <div className="pointer-events-none absolute -left-20 top-0 size-96 rounded-full bg-mint/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/4 size-80 rounded-full bg-amber-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          {/* キャッチバッジ */}
          <div className="inline-flex items-center gap-2 rounded-full border border-moss/30 bg-white/90 px-4 py-1.5 text-xs font-bold text-moss shadow-2xs backdrop-blur-xs">
            <Sparkles size={14} className="text-moss" />
            <span>名もなき育児・お便りのストレスから解放</span>
          </div>

          {/* メインキャッチコピー */}
          <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl">
            園や学校のお便りをパシャリ。
            <br />
            AIが<span className="text-moss">TODO・持ち物</span>を自動分解して
            <br className="hidden sm:inline" />
            家族にシェア
          </h1>

          {/* サブコピー */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink/75 sm:text-lg">
            冷蔵庫にお便りを何枚も貼る必要も、パートナーに「これ読んでおいて」と頼む必要もありません。
            スマホで撮影するだけで提出期限・持ち物・集金をAIが瞬時に整理。
            きょうだい別管理と夫婦のチーム分担で、育児負担を劇的に減らします。
          </p>

          {/* CTAエリア */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-moss px-8 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-moss/90 hover:shadow-lg focus-ring active:scale-98 sm:w-auto"
              >
                <span>ダッシュボードを開く</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  disabled={loading}
                  className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-ink/20 bg-white px-7 py-3.5 text-base font-bold text-ink shadow-sm transition hover:bg-cloud hover:border-ink/30 focus-ring disabled:opacity-60 active:scale-98 sm:w-auto"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin text-moss" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{loading ? "Googleへ移動中..." : "Googleで今すぐ始める（無料）"}</span>
                </button>

                <Link
                  href="/dashboard"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white/70 px-6 py-3.5 text-base font-bold text-ink/80 transition hover:bg-white hover:text-ink focus-ring sm:w-auto"
                >
                  <span>アプリ画面を見る</span>
                </Link>
              </>
            )}
          </div>

          {error && <p className="mt-4 text-xs font-semibold text-red-600">{error}</p>}

          <p className="mt-3 text-xs text-ink/50">
            登録不要のデモ機能も利用可能 • Googleアカウントで安全にログイン
          </p>

          {/* ビジュアルプレビュー風カード */}
          <div className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-ink/10 bg-white p-4 shadow-xl sm:p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-rose-400" />
                <span className="size-3 rounded-full bg-amber-400" />
                <span className="size-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-bold text-ink/60">
                  育児タスクAI ダッシュボード
                </span>
              </div>
              <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold text-moss">
                AI自動解析デモ
              </span>
            </div>

            <div className="mt-6 grid gap-4 text-left sm:grid-cols-3">
              {/* ステップ1 */}
              <div className="rounded-xl border border-ink/10 bg-cloud/50 p-4">
                <div className="flex items-center gap-2 text-moss">
                  <Camera size={18} />
                  <span className="text-xs font-bold">1. お便りをパシャリ</span>
                </div>
                <p className="mt-2 text-xs font-medium text-ink/70">
                  「5月の遠足について.pdf」やプリントの写真をアップロード
                </p>
                <div className="mt-3 rounded-md bg-white p-2.5 text-[11px] text-ink/60 shadow-2xs">
                  📄 園外保育のお願い：5月15日(木) お弁当・水筒・敷物持参...
                </div>
              </div>

              {/* ステップ2 */}
              <div className="rounded-xl border border-moss/30 bg-mint/20 p-4">
                <div className="flex items-center gap-2 text-moss">
                  <Sparkles size={18} />
                  <span className="text-xs font-bold">2. AIが自動でタスク分解</span>
                </div>
                <p className="mt-2 text-xs font-medium text-ink/70">
                  期日・持ち物・対象のお子さんを自動で抽出
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="rounded-md bg-white p-2 text-[11px] font-bold text-ink shadow-2xs">
                    🍱 お弁当の準備 <span className="text-[10px] text-moss">5/15 期限</span>
                  </div>
                  <div className="rounded-md bg-white p-2 text-[11px] font-bold text-ink shadow-2xs">
                    🎒 水筒とレジャーシートを用意
                  </div>
                </div>
              </div>

              {/* ステップ3 */}
              <div className="rounded-xl border border-ink/10 bg-cloud/50 p-4">
                <div className="flex items-center gap-2 text-violet-700">
                  <Users size={18} />
                  <span className="text-xs font-bold">3. 夫婦・家族でチーム分担</span>
                </div>
                <p className="mt-2 text-xs font-medium text-ink/70">
                  「私がやる」ワンタップで引き受け。ありがとうリアクションも
                </p>
                <div className="mt-3 rounded-md bg-white p-2.5 text-[11px] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">担当: パパ</span>
                    <span className="text-rose-500 font-bold">❤️ ありがとう!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 課題提起セクション */}
      <section className="border-b border-ink/10 bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
            こんなお悩みありませんか？
          </span>
          <h2 className="mt-4 text-2xl font-black text-ink sm:text-3xl md:text-4xl">
            「お便りを読む・共有する」という
            <br className="hidden sm:inline" />
            名もなき育児の大きな負担
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-3 text-left">
            <div className="rounded-2xl border border-ink/10 bg-sand/60 p-6">
              <span className="text-2xl">📑</span>
              <h3 className="mt-3 text-base font-bold text-ink">紙のお便りが多すぎて埋もれる</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                園だより、学年通信、給食だより、PTA...
                毎日届く大量のプリントを冷蔵庫に貼り、結局提出日を直前に思い出すストレス。
              </p>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-sand/60 p-6">
              <span className="text-2xl">👶</span>
              <h3 className="mt-3 text-base font-bold text-ink">きょうだいで情報がごちゃ混ぜ</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                「上の子の集金はいつ？」「下の子のエプロンは今日？」きょうだいが増えるほど予定が錯綜し、「二人目の壁」に直面。
              </p>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-sand/60 p-6">
              <span className="text-2xl">💬</span>
              <h3 className="mt-3 text-base font-bold text-ink">パートナーへの情報共有が負担</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                「プリント読んどいて」「来週水曜午前中あけておいて」と頼む側の精神的コストが高く、結局1人でタスクを抱え込んでしまう。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3つのコアバリュー */}
      <section className="border-b border-ink/10 bg-sand px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-moss">
              育児タスクAIの3つの特徴
            </span>
            <h2 className="mt-4 text-2xl font-black text-ink sm:text-3xl md:text-4xl">
              「家族みんなで動ける仕組み」をつくる
            </h2>
          </div>

          <div className="mt-14 space-y-12">
            {/* 特徴1 */}
            <div className="grid gap-8 rounded-2xl border border-ink/10 bg-white p-6 sm:p-8 md:grid-cols-2 md:items-center">
              <div>
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-mint text-moss font-bold">
                  01
                </span>
                <h3 className="mt-4 text-xl font-black text-ink sm:text-2xl">
                  スマホで撮るだけ。1秒でお便りをTODO化
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">
                  写真、PDF、音声入力に対応。最新のマルチモーダルAIが、長文のお便りから「誰が」「いつまでに」「何を用意するか」を瞬時に抽出してタスク化します。もう全文をじっくり読む必要はありません。
                </p>
                <ul className="mt-4 space-y-2 text-xs font-semibold text-ink/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-moss shrink-0" />
                    写真・画像・スキャンPDF・音声から一発抽出
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-moss shrink-0" />
                    持ち物、提出物、集金、行事日程を自動タグ付け
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-moss/20 bg-gradient-to-br from-mint/30 to-cloud p-6 text-center">
                <Camera size={48} className="mx-auto text-moss opacity-80" />
                <p className="mt-3 text-sm font-bold text-ink">お便りスキャン画面</p>
                <p className="mt-1 text-xs text-ink/60">ボタン1つでカメラ起動・ファイル読み込み</p>
              </div>
            </div>

            {/* 特徴2 */}
            <div className="grid gap-8 rounded-2xl border border-ink/10 bg-white p-6 sm:p-8 md:grid-cols-2 md:items-center">
              <div className="order-2 md:order-1 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-cloud p-6 text-center">
                <Baby size={48} className="mx-auto text-violet-600 opacity-80" />
                <p className="mt-3 text-sm font-bold text-ink">きょうだい別専用レーン</p>
                <p className="mt-1 text-xs text-ink/60">子どもごとに持ち物・予定をクリアに分離</p>
              </div>
              <div className="order-1 md:order-2">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-800 font-bold">
                  02
                </span>
                <h3 className="mt-4 text-xl font-black text-ink sm:text-2xl">
                  きょうだい別タイムラインで「二人目の壁」を打破
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">
                  兄弟・姉妹それぞれの予定と持ち物を色分けレーンで管理。同日の行事重なりや、親の仕事（残業・出張）との衝突もAIが自動検知してアラートを出します。ダブルブッキングの不安がゼロに。
                </p>
                <ul className="mt-4 space-y-2 text-xs font-semibold text-ink/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-violet-700 shrink-0" />
                    子ども別の個別レーンで持ち物の混同を防止
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-violet-700 shrink-0" />
                    仕事の予定×育児イベントの衝突を事前検知
                  </li>
                </ul>
              </div>
            </div>

            {/* 特徴3 */}
            <div className="grid gap-8 rounded-2xl border border-ink/10 bg-white p-6 sm:p-8 md:grid-cols-2 md:items-center">
              <div>
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                  03
                </span>
                <h3 className="mt-4 text-xl font-black text-ink sm:text-2xl">
                  家族でのToDo分担と見える化。助け合いのチーム育児へ
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">
                  「私がやる」ボタンで自発的にタスクを引き受け可能。担当状況の偏りをスコアで可視化し、タスクをやってくれたパートナーに「ありがとう❤️」を贈るリアクション機能で、円滑な夫婦コミュニケーションを支援します。
                </p>
                <ul className="mt-4 space-y-2 text-xs font-semibold text-ink/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-700 shrink-0" />
                    ワンタップで担当を引き受け・分担
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-700 shrink-0" />
                    「ありがとう❤️」で感謝を循環させるチーム育児
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-cloud p-6 text-center">
                <Heart size={48} className="mx-auto text-rose-500 opacity-80" />
                <p className="mt-3 text-sm font-bold text-ink">チーム育児スコア</p>
                <p className="mt-1 text-xs text-ink/60">偏りをなくし、夫婦の協働を促進</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* プライバシー＆セキュリティ */}
      <section className="border-b border-ink/10 bg-white px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-moss/30 bg-mint/20 p-8 text-center sm:p-10">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-moss shadow-xs">
            <ShieldCheck size={26} />
          </div>
          <h2 className="mt-4 text-xl font-black text-ink sm:text-2xl">
            お子さんとご家庭のプライバシーを最優先に保護
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-ink/75 sm:text-sm">
            お便りやお子さんの名前などの機微情報は、AI推論完了後に即座に破棄されます（Zero Data
            Retention準拠）。
            AIモデルの学習データとして使用・保存されることは一切ありません。安心してお使いいただけます。
          </p>
        </div>
      </section>

      {/* フッターCTA */}
      <section className="bg-sand px-4 py-16 text-center md:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-black text-ink sm:text-4xl">
            今日から、名もなき育児をチーム育児へ。
          </h2>
          <p className="mt-3 text-sm text-ink/70">
            Googleアカウントがあれば、10秒で今すぐ始められます。
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-ink/20 bg-white px-8 py-3.5 text-base font-bold text-ink shadow-sm transition hover:bg-cloud hover:border-ink/30 focus-ring disabled:opacity-60 active:scale-98 sm:w-auto"
            >
              {loading ? <Loader2 size={18} className="animate-spin text-moss" /> : <GoogleIcon />}
              <span>Googleで無料登録・ログイン</span>
            </button>

            <Link
              href="/dashboard"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-moss px-7 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-moss/90 focus-ring sm:w-auto"
            >
              <span>ダッシュボードを開く</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-ink/10 bg-white px-4 py-8 text-center text-xs text-ink/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-bold text-ink">育児タスクAI (Childcare Task Agent)</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-ink">
              ダッシュボード
            </Link>
            <Link href="/login" className="hover:text-ink">
              ログイン
            </Link>
          </div>
          <p>© 2026 Childcare Task Agent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
