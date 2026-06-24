"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, LogIn, CircleUserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@example.com");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-70px)] max-w-6xl items-center px-4 py-12">
      <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-sm font-bold text-moss">Web MVP Prototype</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">育児の連絡を、家族で動けるTODOへ。</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-ink/70">
            画像・PDF・音声は先にブラウザでテキスト化し、確認済みテキストだけをAIに渡す設計です。登録前には必ず編集確認を挟みます。
          </p>
        </div>
        <div className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">ログイン</h2>
          <label className="mt-5 block text-sm font-semibold" htmlFor="email">
            メールアドレス
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-ink/15 bg-white px-3">
            <Mail size={18} className="text-ink/45" />
            <input id="email" className="min-h-11 flex-1 border-0 bg-transparent text-sm outline-none" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <button className="button-primary mt-4 w-full" onClick={login} disabled={loading}>
            <LogIn size={18} />
            {loading ? "ログイン中" : "メールで続ける"}
          </button>
          <button className="button-secondary mt-3 w-full" onClick={login} disabled={loading}>
            <CircleUserRound size={18} />
            Googleで続ける
          </button>
        </div>
      </div>
    </section>
  );
}
