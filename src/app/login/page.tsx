"use client";

import { Loader2, ShieldCheck } from "lucide-react";
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
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setError("認証に失敗しました。もう一度ログインをお試しください。");
    }
    const next = params.get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) {
      setNextPath(next);
    }
  }, []);

  async function loginWithGoogle() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: nextPath })
      });
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
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
        育児タスクAI にログイン
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Googleアカウントで安全にログインまたは新規登録できます。
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={loading}
          className="button-secondary min-h-11 w-full border border-zinc-200 bg-white"
        >
          {loading ? <Loader2 size={15} className="animate-spin text-zinc-400" /> : <GoogleIcon />}
          <span>{loading ? "Googleへ移動中..." : "Googleで続ける"}</span>
        </button>

        {nextPath.startsWith("/groups/join") ? (
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-950">
            ログイン後、招待された家族グループの参加画面に戻ります。
          </p>
        ) : null}

        <p className="text-sm text-zinc-600">パスワード設定不要・1クリックで利用開始</p>
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>ZDR準拠（推論後データ即時破棄）</span>
        </div>
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        アカウント作成により、サービス利用規約およびプライバシーポリシーに同意したものとみなされます。
      </p>
    </section>
  );
}
