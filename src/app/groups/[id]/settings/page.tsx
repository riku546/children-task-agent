"use client";

import { Baby, Copy, Link2, Plus, Undo2, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import type { GroupRecord } from "@/lib/types";

export default function GroupSettingsPage() {
  const params = useParams<{ id: string }>();
  const cached = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
  const [groups, setGroups] = useState<GroupRecord[]>(cached?.groups || []);
  const [childName, setChildName] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  async function load(force = false) {
    if (!force) {
      const c = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
      if (c) {
        setGroups(c.groups || []);
        return;
      }
    }
    try {
      const data = await fetchJsonWithCache<{ groups: GroupRecord[] }>("/api/groups", { force });
      setGroups(data.groups || []);
    } catch (e) {
      console.error("Failed to load groups in settings", e);
    }
  }

  async function addChild() {
    if (!childName.trim()) return;
    await fetch(`/api/groups/${params.id}/children`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: childName })
    });
    setChildName("");
    invalidateCache("/api/groups");
    invalidateCache("/api/me");
    await load(true);
  }

  async function createInvite() {
    const response = await fetch(`/api/groups/${params.id}/invite`, { method: "POST" });
    const data = await response.json();
    setInviteUrl(data.url);
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const group = useMemo(() => groups.find((item) => item.id === params.id), [groups, params.id]);

  if (!group) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 text-xs text-zinc-500">
        読み込み中...
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-3 border-b border-zinc-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/groups"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
            >
              <Undo2 size={13} />
              グループ一覧
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-xs font-mono text-zinc-500">Settings</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            {group.name} の設定
          </h1>
        </div>
        <button type="button" className="button-primary text-xs" onClick={createInvite}>
          <Link2 size={14} />
          <span>招待リンクを発行</span>
        </button>
      </div>

      {/* 招待リンク通知 */}
      {inviteUrl ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <label className="block text-xs font-semibold text-emerald-950" htmlFor="invite">
            家族を招待するリンク（URLを共有してください）
          </label>
          <div className="mt-2 flex gap-2">
            <input id="invite" className="field text-xs bg-white" readOnly value={inviteUrl} />
            <button
              type="button"
              className="button-primary shrink-0 text-xs"
              onClick={copyInvite}
              title="コピー"
            >
              <Copy size={13} />
              <span>URLをコピー</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 設定セクション（フラットなボーダー区切りグリッド） */}
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* メンバーセクション */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-zinc-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                所属メンバー ({group.members.length})
              </h2>
            </div>
          </div>
          <div className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 transition"
              >
                <div className="font-semibold text-xs text-zinc-900">{member.displayName}</div>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-mono text-zinc-600">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 子ども情報セクション */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Baby size={15} className="text-zinc-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                登録中の子ども ({group.children.length})
              </h2>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="field text-xs"
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="子どもの名前を追加 (例: 太郎)"
            />
            <button
              type="button"
              className="button-secondary shrink-0 text-xs"
              onClick={addChild}
              disabled={!childName.trim()}
            >
              <Plus size={14} />
              <span>追加</span>
            </button>
          </div>

          <div className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            {group.children.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                子どもはまだ登録されていません
              </div>
            ) : (
              group.children.map((child) => (
                <div
                  key={child.id}
                  className="p-3.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50/50 transition"
                >
                  {child.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
