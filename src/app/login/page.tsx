"use client";

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24">
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
    <section className="mx-auto grid min-h-[calc(100vh-70px)] max-w-6xl items-center px-4 py-12">
      <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-sm font-bold text-moss">Web MVP Prototype</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
            育児の連絡を、家族で動けるTODOへ。
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-ink/70">
            園や学校からの書類・お便りをAIが読み取り、期限や提出物を家族で分担できるタスクに自動変換します。
          </p>
        </div>

        <div className="rounded-xl border border-ink/10 bg-white p-8 shadow-soft">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black text-ink">ログイン / 新規登録</h2>
            <p className="mt-2 text-sm text-ink/65">
              Googleアカウントを使って安全にログインできます。パスワードの入力や確認メールは不要です。
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-ink/20 bg-white px-4 py-3 text-base font-bold text-ink shadow-sm transition hover:bg-cloud hover:border-ink/30 focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              <span>{loading ? "Googleへ移動中..." : "Googleでログイン・新規登録"}</span>
            </button>

            <p className="pt-2 text-center text-xs leading-5 text-ink/50">
              ボタンをクリックするとGoogleの認証画面に移動します。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
