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
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-12">
      <p className="text-sm font-bold text-moss">Family Groups</p>
      <h1 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">家族グループ</h1>

      <div className="mt-7 grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">グループ作成</h2>
          <label className="mt-4 block text-sm font-semibold" htmlFor="group-name">
            グループ名
          </label>
          <input
            id="group-name"
            className="field mt-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="button-primary mt-4 w-full" onClick={create} disabled={!name.trim()}>
            <Plus size={18} />
            作成
          </button>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">一覧</h2>
          <div className="grid gap-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}/settings`}
                className="rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:border-moss hover:shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                      <Users size={20} />
                      {group.name}
                    </div>
                    <div className="mt-2 text-sm text-ink/65">
                      メンバー {group.members.length}人 / 子ども {group.children.length}人
                    </div>
                  </div>
                  <Settings className="text-ink/40" size={22} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
