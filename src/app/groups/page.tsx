"use client";

import { Plus, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
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
    <PageShell>
      <PageHeader title="家族" description="グループ・メンバー・お子さんの登録と招待を管理します" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* グループ作成サイドパネル */}
        <div className="border-b border-zinc-200 pb-6">
          <h2 className="text-sm font-bold text-zinc-900">グループを新しく作る</h2>
          <div className="mt-3">
            <label className="block text-sm font-semibold text-zinc-700" htmlFor="group-name">
              グループ名
            </label>
            <input
              id="group-name"
              className="field mt-1.5 text-sm"
              placeholder="例: 佐藤家, 実家サポート 等"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="button"
              className="button-primary mt-3 w-full text-sm"
              onClick={create}
              disabled={!name.trim()}
            >
              <Plus size={15} />
              <span>グループを作成</span>
            </button>
          </div>
        </div>

        {/* グループ一覧テーブル */}
        <div>
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-zinc-900">参加中のグループ（{groups.length}）</h2>
          </div>
          <div className="mt-3 divide-y divide-zinc-200 border-t border-zinc-200">
            {groups.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
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
                    <Users size={16} className="shrink-0 text-zinc-500" />
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
    </PageShell>
  );
}
