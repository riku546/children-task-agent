"use client";

import { CircleUserRound, LogOut, Save, Undo2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupRecord } from "@/lib/types";

type UserData = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  defaultGroupId: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) throw new Error("ユーザー情報の取得に失敗しました");
      const data = await res.json();
      setUser(data.user);
      setName(data.user?.name || "");
      setGroups(data.groups || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "ユーザー情報の読み込みに失敗しました" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setMessage({ type: "error", text: "お名前を入力してください" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "更新に失敗しました");
      }
      setMessage({ type: "success", text: "ユーザー情報を更新しました" });
      setUser((prev) => (prev ? { ...prev, name: data.name } : null));
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "更新に失敗しました";
      setMessage({ type: "error", text: errorText });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // 1. Supabase browser client signOut
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase signout failed", err);
      }

      // 2. Server API signOut
      await fetch("/api/auth/logout", { method: "POST" });

      // 3. ログイン画面へ遷移
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed", err);
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center text-sm font-semibold text-ink/60">
        読み込み中...
      </section>
    );
  }

  const initial = (name || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <section className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:pb-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-moss"
      >
        <Undo2 size={16} />
        ダッシュボードへ戻る
      </Link>

      <div className="mt-5">
        <p className="text-sm font-bold text-moss">User Settings</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal md:text-4xl">ユーザー情報・設定</h1>
      </div>

      {message && (
        <div
          className={`mt-6 rounded-md px-4 py-3 text-sm font-semibold ${
            message.type === "success" ? "bg-mint text-moss" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ユーザー情報登録・編集フォーム */}
      <form
        onSubmit={handleSave}
        className="mt-6 rounded-md border border-ink/10 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-4">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="size-16 rounded-full border border-ink/15 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid size-16 place-items-center rounded-full bg-mint text-2xl font-black text-moss">
              {initial || <CircleUserRound size={32} />}
            </div>
          )}
          <div>
            <div className="text-lg font-bold">{user?.name || "ユーザー"}</div>
            <div className="text-sm text-ink/60">{user?.email}</div>
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="user-name" className="block text-sm font-semibold text-ink">
            お名前（表示名）
          </label>
          <input
            id="user-name"
            className="field mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前を入力"
            disabled={saving}
          />
          <p className="mt-1.5 text-xs text-ink/50">
            家族グループやタスクの担当者として表示される名前です。
          </p>
        </div>

        <div className="mt-6">
          <label htmlFor="email" className="block text-sm font-semibold text-ink">
            メールアドレス
          </label>
          <input
            id="email"
            className="field mt-2 bg-cloud text-ink/70 cursor-not-allowed"
            value={user?.email || ""}
            readOnly
            disabled
          />
          <p className="mt-1.5 text-xs text-ink/50">ログイン用メールアドレスです（変更不可）。</p>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" className="button-primary" disabled={saving || !name.trim()}>
            <Save size={18} />
            {saving ? "保存中..." : "変更を保存する"}
          </button>
        </div>
      </form>

      {/* 所属グループ情報 */}
      <div className="mt-6 rounded-md border border-ink/10 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <Users size={18} />
          参加中の家族グループ
        </h2>
        <div className="mt-4 space-y-2">
          {groups.length === 0 ? (
            <p className="text-sm text-ink/60">参加中のグループはありません。</p>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-md bg-cloud px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-ink">{g.name}</div>
                  <div className="text-xs text-ink/60">
                    メンバー {g.members.length}人 / 子ども {g.children.length}人
                  </div>
                </div>
                <Link
                  href={`/groups/${g.id}/settings`}
                  className="text-xs font-semibold text-moss hover:underline"
                >
                  設定
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* セッション管理・ログアウト */}
      <div className="mt-6 rounded-md border border-red-100 bg-red-50/40 p-6 shadow-sm">
        <h2 className="text-base font-bold text-ink">アカウント操作</h2>
        <p className="mt-1 text-xs text-ink/65">現在ログインしている端末からサインアウトします。</p>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-ring disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "ログアウト中..." : "ログアウトする"}
          </button>
        </div>
      </div>
    </section>
  );
}
