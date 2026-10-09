"use client";

import { Baby, Circle, Hand, Loader2, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DuePill, PriorityPill } from "@/components/StatusPill";
import { getChildTheme } from "@/lib/child-theme";
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-800 shadow-2xs">
            <Baby size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-ink">きょうだい別の予定・持ち物</h3>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800">
                二人目の壁を解消
              </span>
            </div>
            <p className="text-xs text-ink/65">
              子どもごとに持ち物・提出物をレーン分け。情報が混ざらずダブルブッキングを防ぎます
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* お子さん追加ボタン */}
          {group && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 rounded-lg border border-ink/15 bg-white px-2.5 py-1 text-xs font-bold text-ink transition hover:bg-cloud"
            >
              <UserPlus size={13} className="text-moss" />
              <span>子どもを登録</span>
            </button>
          )}

          {/* 子どもフィルターチップ（2人以上いる場合） */}
          {allChildren.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedChildTab("all")}
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                  selectedChildTab === "all"
                    ? "bg-moss text-white shadow-xs"
                    : "border border-ink/15 bg-white text-ink/70 hover:bg-cloud"
                }`}
              >
                全員
              </button>
              {allChildren.map((c) => {
                const theme = getChildTheme(c.name);
                const isSelected = selectedChildTab === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedChildTab(c.name)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                      isSelected
                        ? `${theme.badgeBg} ${theme.badgeText} border ${theme.border} ring-2 ring-moss/30`
                        : "border border-ink/15 bg-white text-ink/70 hover:bg-cloud"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${theme.dotColor}`} />
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
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3 shadow-2xs animate-in fade-in"
        >
          <span className="text-xs font-bold text-violet-900">お子さんの名前:</span>
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
          /* 子どもがまだ1人もいない場合の案内カード */
          <div className="rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50/50 to-cloud p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-violet-600 shadow-xs">
              <Baby size={24} />
            </span>
            <h4 className="mt-3 text-base font-black text-ink">
              お子さん（きょうだい）を登録しましょう
            </h4>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink/70">
              お子さんを登録すると、園や学校から届いたお便りのTODOが自動で子ども別に分類され、
              行事や提出物の重なり（ダブルブッキング）を事前に防げるようになります。
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
                className="field text-sm"
                required
              />
              <button
                type="submit"
                disabled={addingChild || !newChildName.trim()}
                className="button-primary text-sm shrink-0"
              >
                {addingChild ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                追加する
              </button>
            </form>
          </div>
        ) : (
          /* 子どもレーン（横並びグリッド） */
          <div className="grid gap-5 md:grid-cols-2">
            {(selectedChildTab === "all"
              ? allChildren
              : allChildren.filter((c) => c.name === selectedChildTab)
            ).map((child) => {
              const theme = getChildTheme(child.name);
              const childTasks = tasksByChild.get(child.name) || [];

              return (
                <div
                  key={child.name}
                  className={`flex flex-col rounded-2xl border ${theme.border} ${theme.bg}/40 p-4.5 shadow-xs transition`}
                >
                  {/* 子どもレーンヘッダー */}
                  <div className="flex items-center justify-between border-b border-ink/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`grid size-7 place-items-center rounded-full ${theme.badgeBg} ${theme.badgeText} text-xs font-black shadow-2xs`}
                      >
                        {child.name.charAt(0)}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-ink">{child.name} のタスク</h4>
                        <p className="text-[11px] text-ink/60">未完了 {childTasks.length}件</p>
                      </div>
                    </div>

                    <Link
                      href={`/tasks/new`}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-ink/80 hover:bg-cloud hover:text-ink shadow-2xs transition"
                    >
                      <Plus size={13} />
                      TODO追加
                    </Link>
                  </div>

                  {/* タスクリスト */}
                  <div className="mt-3 flex-1 space-y-2.5">
                    {childTasks.length === 0 ? (
                      <div className="py-6 text-center text-xs font-semibold text-ink/40">
                        直近の未完了TODOはありません 🎉
                      </div>
                    ) : (
                      childTasks.map((task) => {
                        const isLoading = actionLoadingId === task.id;
                        return (
                          <div
                            key={task.id}
                            className="group flex items-start justify-between gap-2.5 rounded-xl border border-ink/10 bg-white p-3 shadow-2xs transition hover:border-moss/50"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <DuePill dueDate={task.dueDate} />
                                <PriorityPill priority={task.priority} />
                                <span className="rounded bg-cloud px-1.5 py-0.5 text-[10px] font-semibold text-ink/60">
                                  {task.type}
                                </span>
                              </div>

                              <Link href={`/tasks/${task.id}`} className="block">
                                <p className="mt-1.5 text-sm font-bold text-ink hover:text-moss truncate">
                                  {task.title}
                                </p>
                              </Link>

                              <div className="mt-1.5 flex items-center gap-2 text-xs text-ink/60">
                                <span>
                                  {task.assigneeName ? (
                                    <span className="font-semibold text-ink/80">
                                      担当: {task.assigneeName}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 font-semibold">担当未定</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* アクションボタン */}
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              {onToggleStatus && (
                                <button
                                  type="button"
                                  onClick={() => onToggleStatus(task)}
                                  disabled={isLoading}
                                  className="grid size-7 place-items-center rounded-full text-ink/30 hover:text-moss transition"
                                  title="完了にする"
                                >
                                  {isLoading ? (
                                    <Loader2 size={16} className="animate-spin text-moss" />
                                  ) : (
                                    <Circle size={18} />
                                  )}
                                </button>
                              )}

                              {onAssignToMe && !task.assigneeName && (
                                <button
                                  type="button"
                                  onClick={() => onAssignToMe(task.id)}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-1 rounded-full border border-moss/40 bg-mint/50 px-2 py-0.5 text-[11px] font-bold text-moss shadow-2xs hover:bg-moss hover:text-white transition"
                                >
                                  <Hand size={11} />
                                  <span>私がやる</span>
                                </button>
                              )}

                              {onThankYou && task.assigneeName && (
                                <button
                                  type="button"
                                  onClick={() => onThankYou(task)}
                                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                                  title="担当してくれてありがとう！"
                                >
                                  <span>❤️ ありがとう</span>
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
