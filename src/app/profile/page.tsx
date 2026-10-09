"use client";

import { CircleUserRound, LogOut, Save, Undo2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
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
  const cachedMe = getCachedData<any>("/api/me");
  const [user, setUser] = useState<UserData | null>(cachedMe?.user || null);
  const [groups, setGroups] = useState<GroupRecord[]>(cachedMe?.groups || []);
  const [name, setName] = useState(cachedMe?.user?.name || "");
  const [loading, setLoading] = useState(!cachedMe);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load(force = false) {
    if (!force) {
      const c = getCachedData<any>("/api/me");
      if (c) {
        setUser(c.user);
        setName(c.user?.name || "");
        setGroups(c.groups || []);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const data = await fetchJsonWithCache<any>("/api/me", { force });
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
      invalidateCache("/api/me");
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
    invalidateCache(); // 全キャッシュクリア

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
    <section className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      {/* ページヘッダー */}
      <div className="pb-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
        >
          <Undo2 size={13} />
          ダッシュボードへ戻る
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
          アカウント設定
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          プロフィール情報、参加グループの確認、セッション管理を行います
        </p>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-md px-3.5 py-2.5 text-xs font-medium ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 space-y-8 divide-y divide-zinc-200">
        {/* セクション 1: ユーザー基本情報 */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="size-12 rounded-full border border-zinc-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700 border border-zinc-200">
                {initial || <CircleUserRound size={22} />}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-zinc-950">{user?.name || "ユーザー"}</div>
              <div className="text-xs text-zinc-500">{user?.email}</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div>
              <label htmlFor="user-name" className="block text-xs font-semibold text-zinc-700">
                お名前（表示名）
              </label>
              <input
                id="user-name"
                className="field mt-1 text-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="お名前を入力"
                disabled={saving}
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                家族グループやタスクの担当者として表示されます
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-700">
                メールアドレス
              </label>
              <input
                id="email"
                className="field mt-1 text-xs bg-zinc-50 text-zinc-500 cursor-not-allowed"
                value={user?.email || ""}
                readOnly
                disabled
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                ログイン用メールアドレスです（変更不可）
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="button-primary text-xs"
              disabled={saving || !name.trim()}
            >
              <Save size={13} />
              <span>{saving ? "保存中..." : "変更を保存"}</span>
            </button>
          </div>
        </form>

        {/* セクション 2: 参加中の家族グループ */}
        <div className="pt-8">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-zinc-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                参加中の家族グループ ({groups.length})
              </h2>
            </div>
            <Link
              href="/groups"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
            >
              グループ管理へ →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            {groups.length === 0 ? (
              <p className="p-6 text-center text-xs text-zinc-500">参加中のグループはありません</p>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-zinc-900">{g.name}</div>
                    <div className="text-[11px] text-zinc-500">
                      メンバー {g.members.length}名 · 子ども {g.children.length}名
                    </div>
                  </div>
                  <Link
                    href={`/groups/${g.id}/settings`}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-950 transition"
                  >
                    設定
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* セクション 3: アカウント操作 / サインアウト */}
        <div className="pt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            セッション管理
          </h2>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
            <div>
              <div className="text-xs font-semibold text-zinc-900">サインアウト</div>
              <div className="text-[11px] text-zinc-500">
                現在ログインしている端末からログアウトします
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut size={13} />
              <span>{loggingOut ? "ログアウト中..." : "ログアウト"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
