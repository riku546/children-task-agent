"use client";

import { Loader2, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TaskList } from "@/components/TaskList";
import { invalidateCache } from "@/lib/client-cache";
import type { GroupRecord, TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  group?: GroupRecord | null;
  currentUserId?: string | null;
  onAssignToMe?: (taskId: string) => Promise<void> | void;
  onToggleStatus?: (task: TaskRecord) => Promise<void> | void;
  actionLoadingId?: string | null;
  onThankYou?: (task: TaskRecord) => void;
  onChildAdded?: () => void;
};

export function SiblingTaskTimeline({
  tasks,
  group,
  currentUserId,
  onAssignToMe,
  onToggleStatus,
  actionLoadingId,
  onThankYou,
  onChildAdded
}: Props) {
  const [selectedChildTab, setSelectedChildTab] = useState<string>("all");
  const [newChildName, setNewChildName] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // 家族グループに登録されている子どもたち
  const registeredChildren = useMemo(() => {
    return group?.children || [];
  }, [group]);

  // 子ども一覧（登録済み子ども ＋ タスクのchildNameを重複排除して統合）
  const allChildren = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; taskCount: number }>();

    // 1. 登録済み子ども
    for (const c of registeredChildren) {
      const trimmed = c.name?.trim();
      if (trimmed && trimmed !== "未設定") {
        map.set(trimmed, { id: c.id, name: trimmed, taskCount: 0 });
      }
    }

    // 2. タスクに紐づく子ども
    for (const t of tasks) {
      if (t.status === "DONE") continue;
      const name = t.childName?.trim();
      if (name && name !== "未設定") {
        const item = map.get(name) || { name, taskCount: 0 };
        item.taskCount += 1;
        map.set(name, item);
      }
    }

    return Array.from(map.values());
  }, [registeredChildren, tasks]);

  // 子ども別の未完了タスク
  const tasksByChild = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    for (const t of tasks) {
      if (t.status === "DONE") continue;
      const name = t.childName?.trim() || "未設定";
      const list = map.get(name) || [];
      list.push(t);
      map.set(name, list);
    }
    return map;
  }, [tasks]);

  // お子さんクイック追加処理
  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!newChildName.trim() || !group?.id) return;

    setAddingChild(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChildName.trim() })
      });
      if (res.ok) {
        setNewChildName("");
        setShowAddForm(false);
        invalidateCache("/api/me");
        invalidateCache("/api/groups");
        if (onChildAdded) onChildAdded();
      }
    } catch (err) {
      console.error("Failed to add child", err);
    } finally {
      setAddingChild(false);
    }
  }

  const displayedChildren = useMemo(() => {
    if (selectedChildTab === "all") return allChildren;
    return allChildren.filter((c) => c.name === selectedChildTab);
  }, [allChildren, selectedChildTab]);

  return (
    <div className="w-full">
      {/* ツールバー / フィルター */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          {/* 子どもフィルターチップ（2人以上いる場合） */}
          {allChildren.length > 1 && (
            <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5">
              <button
                type="button"
                onClick={() => setSelectedChildTab("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  selectedChildTab === "all"
                    ? "bg-white font-semibold text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                全員
              </button>
              {allChildren.map((c) => {
                const isSelected = selectedChildTab === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedChildTab(c.name)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-white font-semibold text-zinc-950 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* お子さん追加ボタン */}
        {group && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition"
          >
            <UserPlus size={13} className="text-zinc-400" />
            <span>お子さんを追加</span>
          </button>
        )}
      </div>

      {/* お子さんクイック追加フォーム */}
      {showAddForm && (
        <form
          onSubmit={handleAddChild}
          className="mt-3 flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3"
        >
          <span className="text-xs font-medium text-zinc-700">お子さんの名前:</span>
          <input
            type="text"
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            placeholder="例: 太郎（小1）、花子（年少）"
            className="field text-xs py-1.5 max-w-xs"
            required
          />
          <button
            type="submit"
            disabled={addingChild || !newChildName.trim()}
            className="button-primary text-xs py-1 px-3"
          >
            {addingChild ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            登録
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="button-secondary text-xs py-1 px-2.5"
          >
            キャンセル
          </button>
        </form>
      )}

      {/* きょうだい別グルーピングリスト（カードではなくフラットなセクション） */}
      <div className="mt-4 divide-y divide-zinc-200/80">
        {allChildren.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            <p>登録されたお子さんがいません。</p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="button-secondary mt-3 text-xs"
            >
              <UserPlus size={12} />
              お子さんを登録する
            </button>
          </div>
        ) : (
          displayedChildren.map((child) => {
            const childTasks = tasksByChild.get(child.name) || [];

            return (
              <div key={child.name} className="py-4 first:pt-0 last:pb-0">
                {/* グループセクションヘッダー（Linear風） */}
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded bg-zinc-100 text-[11px] font-bold text-zinc-700">
                      {child.name.charAt(0)}
                    </span>
                    <h3 className="text-xs font-bold text-zinc-900">{child.name}</h3>
                    <span className="font-mono text-[11px] text-zinc-400">
                      ({childTasks.length})
                    </span>
                  </div>

                  <Link
                    href={`/tasks/new`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 transition"
                  >
                    <Plus size={12} />
                    <span>追加</span>
                  </Link>
                </div>

                {/* タスク行リスト（フラット） */}
                <TaskList
                  tasks={childTasks}
                  emptyText="直近の未完了タスクはありません"
                  currentUserId={currentUserId}
                  onAssignToMe={onAssignToMe}
                  onToggleStatus={onToggleStatus}
                  actionLoadingId={actionLoadingId}
                  onThankYou={onThankYou}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
