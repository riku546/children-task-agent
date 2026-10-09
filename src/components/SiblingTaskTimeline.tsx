"use client";

import { Check, Hand, Heart, Layers, Loader2, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DuePill, PriorityPill } from "@/components/StatusPill";
import { invalidateCache } from "@/lib/client-cache";
import type { GroupRecord, TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  group?: GroupRecord | null;
  onAssignToMe?: (taskId: string) => Promise<void> | void;
  onToggleStatus?: (task: TaskRecord) => Promise<void> | void;
  actionLoadingId?: string | null;
  onThankYou?: (task: TaskRecord) => void;
  onChildAdded?: () => void;
};

export function SiblingTaskTimeline({
  tasks,
  group,
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

  return (
    <div className="mb-8">
      {/* セクションヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-2xs">
            <Layers size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900">きょうだい別タスクレーン</h3>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600">
                Multi-Child
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              子どもごとに提出物・持ち物・予定を分離。重複や混同を防止します
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* お子さん追加ボタン */}
          {group && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="button-secondary text-xs"
            >
              <UserPlus size={13} className="text-zinc-500" />
              <span>お子さんを追加</span>
            </button>
          )}

          {/* 子どもフィルターチップ（2人以上いる場合） */}
          {allChildren.length > 1 && (
            <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5">
              <button
                type="button"
                onClick={() => setSelectedChildTab("all")}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  selectedChildTab === "all"
                    ? "bg-white font-semibold text-zinc-900 shadow-2xs"
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
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-white font-semibold text-zinc-900 shadow-2xs"
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
      </div>

      {/* お子さんクイック追加フォーム */}
      {showAddForm && (
        <form
          onSubmit={handleAddChild}
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs animate-in fade-in"
        >
          <span className="text-xs font-semibold text-zinc-700">お子さんの名前:</span>
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
            className="button-primary text-xs py-1.5 px-3"
          >
            {addingChild ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            登録
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="button-secondary text-xs py-1.5 px-2.5"
          >
            閉じる
          </button>
        </form>
      )}

      {/* きょうだい別カードレーン表示 */}
      <div className="mt-4">
        {allChildren.length === 0 ? (
          /* 子どもがまだ1人もいない場合のEmpty State */
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white/60 p-8 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 shadow-2xs">
              <Layers size={20} />
            </span>
            <h4 className="mt-3 text-sm font-bold text-zinc-900">お子さんを登録してください</h4>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
              お子さんを登録すると、お便りから抽出されたタスクが自動で子ども別に分類され、
              個別の持ち物や提出物を管理できるようになります。
            </p>

            <form
              onSubmit={handleAddChild}
              className="mx-auto mt-4 flex max-w-sm items-center gap-2"
            >
              <input
                type="text"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="例: 太郎、花子"
                className="field text-xs py-2"
                required
              />
              <button
                type="submit"
                disabled={addingChild || !newChildName.trim()}
                className="button-primary text-xs shrink-0"
              >
                {addingChild ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                追加
              </button>
            </form>
          </div>
        ) : (
          /* 子どもレーン（横並びグリッド） */
          <div className="grid gap-4 md:grid-cols-2">
            {(selectedChildTab === "all"
              ? allChildren
              : allChildren.filter((c) => c.name === selectedChildTab)
            ).map((child) => {
              const childTasks = tasksByChild.get(child.name) || [];

              return (
                <div
                  key={child.name}
                  className="flex flex-col rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs transition"
                >
                  {/* 子どもレーンヘッダー */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-6 place-items-center rounded-md border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-800">
                        {child.name.charAt(0)}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{child.name}</h4>
                        <p className="text-[10px] font-mono text-zinc-500">
                          未完了 {childTasks.length}件
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/tasks/new`}
                      className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs transition"
                    >
                      <Plus size={12} className="text-zinc-400" />
                      追加
                    </Link>
                  </div>

                  {/* タスクリスト */}
                  <div className="mt-3 flex-1 space-y-2">
                    {childTasks.length === 0 ? (
                      <div className="py-6 text-center text-xs font-medium text-zinc-400">
                        未完了のTODOはありません
                      </div>
                    ) : (
                      childTasks.map((task) => {
                        const isLoading = actionLoadingId === task.id;
                        const isDone = task.status === "DONE";

                        return (
                          <div
                            key={task.id}
                            className="group flex items-start justify-between gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5 transition hover:border-zinc-200 hover:bg-white"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <DuePill dueDate={task.dueDate} />
                                <PriorityPill priority={task.priority} />
                                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 border border-zinc-100">
                                  {task.type}
                                </span>
                              </div>

                              <Link href={`/tasks/${task.id}`} className="block">
                                <p className="mt-1 text-xs font-semibold text-zinc-900 hover:text-zinc-600 truncate">
                                  {task.title}
                                </p>
                              </Link>

                              <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                                <span>
                                  {task.assigneeName ? (
                                    <span className="font-medium text-zinc-700">
                                      担当: {task.assigneeName}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 font-medium">担当未定</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* アクションボタン */}
                            <div className="flex shrink-0 items-center gap-1 pt-0.5">
                              {onToggleStatus && (
                                <button
                                  type="button"
                                  onClick={() => onToggleStatus(task)}
                                  disabled={isLoading}
                                  className="grid size-5 place-items-center rounded border border-zinc-300 bg-white text-transparent hover:border-zinc-400 transition focus-ring"
                                  title="完了にする"
                                >
                                  {isLoading ? (
                                    <Loader2 size={11} className="animate-spin text-zinc-400" />
                                  ) : (
                                    <Check
                                      size={11}
                                      className="text-transparent group-hover:text-zinc-300"
                                    />
                                  )}
                                </button>
                              )}

                              {onAssignToMe && !isDone && (
                                <button
                                  type="button"
                                  onClick={() => onAssignToMe(task.id)}
                                  disabled={isLoading}
                                  className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 transition"
                                  title="私が担当する"
                                >
                                  <Hand size={10} className="inline mr-0.5 text-zinc-500" />
                                  やる
                                </button>
                              )}

                              {onThankYou && !isDone && task.assigneeName && (
                                <button
                                  type="button"
                                  onClick={() => onThankYou(task)}
                                  className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                                  title="感謝を伝える"
                                >
                                  <Heart size={10} className="inline mr-0.5 text-rose-500" />
                                  感謝
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
