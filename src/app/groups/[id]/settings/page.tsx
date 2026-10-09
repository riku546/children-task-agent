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
    return <section className="mx-auto max-w-5xl px-4 py-12">読み込み中</section>;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:pb-12">
      <Link
        href="/groups"
        className="inline-flex items-center gap-2 text-sm font-semibold text-moss"
      >
        <Undo2 size={16} />
        戻る
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-moss">Group Settings</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">{group.name}</h1>
        </div>
        <button className="button-primary" onClick={createInvite}>
          <Link2 size={18} />
          招待リンク作成
        </button>
      </div>

      {inviteUrl ? (
        <div className="mt-6 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold" htmlFor="invite">
            招待リンク
          </label>
          <div className="mt-2 flex gap-2">
            <input id="invite" className="field" readOnly value={inviteUrl} />
            <button className="button-icon shrink-0" onClick={copyInvite} title="コピー">
              <Copy size={18} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Users size={20} />
            メンバー
          </h2>
          <div className="mt-4 grid gap-3">
            {group.members.map((member) => (
              <div key={member.id} className="rounded-md bg-cloud px-4 py-3">
                <div className="font-semibold">{member.displayName}</div>
                <div className="text-sm text-ink/60">{member.role}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Baby size={20} />
            子ども情報
          </h2>
          <div className="mt-4 flex gap-2">
            <input
              className="field"
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="名前"
            />
            <button className="button-icon shrink-0" onClick={addChild} title="追加">
              <Plus size={18} />
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {group.children.map((child) => (
              <div key={child.id} className="rounded-md bg-cloud px-4 py-3 font-semibold">
                {child.name}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
