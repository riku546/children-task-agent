"use client";

import { Layers, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

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

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setError("認証に失敗しました。もう一度ログインをお試しください。");
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
    <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-4xl flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-soft">
        <div className="text-center">
          <span className="mx-auto grid size-9 place-items-center rounded-lg bg-zinc-900 text-white shadow-2xs">
            <Layers size={18} />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-zinc-950">
            育児タスクAI にログイン
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500">
            Googleアカウントで安全にログインまたは新規登録
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="flex min-h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:bg-zinc-50 hover:border-zinc-300 focus-ring disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin text-zinc-400" />
            ) : (
              <GoogleIcon />
            )}
            <span>{loading ? "Googleへ移動中..." : "Googleで続ける"}</span>
          </button>

          <p className="pt-2 text-center text-[11px] text-zinc-400">
            パスワード設定不要・1クリックで利用開始
          </p>
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>ZDR準拠（推論後データ即時破棄）</span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-500">
        アカウント作成により、サービス利用規約およびプライバシーポリシーに同意したものとみなされます。
      </p>
    </section>
  );
}
