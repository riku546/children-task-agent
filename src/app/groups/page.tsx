"use client";

import { Settings, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { GroupListSkeleton } from "@/components/Skeleton";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import type { GroupRecord } from "@/lib/types";

export default function GroupsPage() {
  const cached = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
  const [groups, setGroups] = useState<GroupRecord[]>(cached?.groups || []);
  const [loading, setLoading] = useState(!cached);
  const [name, setName] = useState("わが家");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState("");
  const groupNameInputRef = useRef<HTMLInputElement>(null);

  async function load(force = false) {
    if (!force) {
      const c = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
      if (c) {
        setGroups(c.groups || []);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const data = await fetchJsonWithCache<{ groups: GroupRecord[] }>("/api/groups", { force });
      setGroups(data.groups || []);
    } catch (e) {
      console.error("Failed to load groups", e);
    } finally {
      setLoading(false);
    }
  }

  function closeCreateModal() {
    setShowCreateForm(false);
    setCreateError("");
  }

  function openCreateModal() {
    setCreateError("");
    setShowCreateForm(true);
  }

  async function create() {
    setCreateError("");
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCreateError(
          typeof data.error === "string" ? data.error : "グループを作成できませんでした"
        );
        return;
      }
      closeCreateModal();
      setName("わが家");
      invalidateCache("/api/groups");
      invalidateCache("/api/me");
      await load(true);
    } catch (e) {
      console.error("Failed to create group", e);
      setCreateError("グループを作成できませんでした");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showCreateForm) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeCreateModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCreateForm]);

  useEffect(() => {
    if (!showCreateForm) return;
    const frame = requestAnimationFrame(() => {
      groupNameInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [showCreateForm]);

  return (
    <PageShell>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">家族</h1>
          <button
            type="button"
            className="button-primary shrink-0 text-sm"
            onClick={openCreateModal}
          >
            新しいグループ
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          グループ・メンバー・お子さんの登録と招待を管理します
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm font-bold text-zinc-900">
            参加中のグループ{loading ? "" : `（${groups.length}）`}
          </h2>
        </div>
        <div className="mt-3 divide-y divide-zinc-200 border-t border-zinc-200">
          {loading && groups.length === 0 ? (
            <GroupListSkeleton />
          ) : groups.length === 0 ? (
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

      {showCreateForm ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/40"
            aria-label="閉じる"
            onClick={closeCreateModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-group-dialog-title"
            className="absolute left-1/2 top-[50svh] z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-[calc(50%+2.25rem)] rounded-lg border border-zinc-200 bg-white p-5 shadow-lg md:-translate-y-1/2"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="create-group-dialog-title" className="text-lg font-bold text-zinc-950">
                新しいグループ
              </h2>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={closeCreateModal}
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="group-name">
              グループ名
              <input
                ref={groupNameInputRef}
                id="group-name"
                className="field mt-1.5 text-sm"
                placeholder="例: 佐藤家, 実家サポート 等"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            {createError ? (
              <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
                {createError}
              </p>
            ) : null}

            <button
              type="button"
              className="button-primary mt-5 w-full text-sm"
              onClick={create}
              disabled={!name.trim()}
            >
              作成
            </button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
