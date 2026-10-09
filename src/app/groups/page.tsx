"use client";

import { Plus, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import type { GroupRecord } from "@/lib/types";

export default function GroupsPage() {
  const cached = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
  const [groups, setGroups] = useState<GroupRecord[]>(cached?.groups || []);
  const [name, setName] = useState("わが家");

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
      console.error("Failed to load groups", e);
    }
  }

  async function create() {
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    setName("");
    invalidateCache("/api/groups");
    invalidateCache("/api/me");
    await load(true);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      {/* ページヘッダー */}
      <div className="border-b border-zinc-200/80 pb-4">
        <p className="text-xs font-bold tracking-wider uppercase text-zinc-500">
          Organization & Family Workspace
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
          家族グループ管理
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          タスクを共有する家族グループを作成・管理します
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* グループ作成サイドパネル */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 shadow-2xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            グループ新規作成
          </h2>
          <div className="mt-3">
            <label className="block text-xs font-semibold text-zinc-700" htmlFor="group-name">
              グループ名
            </label>
            <input
              id="group-name"
              className="field mt-1.5 text-xs"
              placeholder="例: 佐藤家, 実家サポート 等"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="button"
              className="button-primary mt-3 w-full text-xs"
              onClick={create}
              disabled={!name.trim()}
            >
              <Plus size={14} />
              <span>グループを作成</span>
            </button>
          </div>
        </div>

        {/* グループ一覧テーブル */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              参加中のグループ ({groups.length})
            </h2>
          </div>
          <div className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            {groups.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                参加しているグループはありません
              </div>
            ) : (
              groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}/settings`}
                  className="flex items-center justify-between p-4 transition hover:bg-zinc-50/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 place-items-center rounded bg-zinc-100 text-zinc-700">
                      <Users size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-900">{group.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        メンバー {group.members.length}名 · 子ども {group.children.length}名
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 group-hover:text-zinc-700">
                    <Settings size={15} />
                    <span>設定</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
