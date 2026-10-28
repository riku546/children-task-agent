"use client";

import { Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { invalidateCache } from "@/lib/client-cache";
import { formatDateJa } from "@/lib/date";
import type { TaskRecord } from "@/lib/types";

const TASK_TYPES = ["確認", "提出", "持参", "支払い", "参加", "予約"];

type ChildOption = {
  id: string;
  name: string;
};

type Props = {
  isOpen: boolean;
  date: string;
  groupId: string;
  children: ChildOption[];
  onClose: () => void;
  onCreated: (task: TaskRecord) => void;
};

export function QuickDueTaskForm({ isOpen, date, groupId, children, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("確認");
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const namedChildren = useMemo(
    () => children.filter((child) => child.name.trim() && child.name.trim() !== "未設定"),
    [children]
  );

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setTaskType("確認");
    setChildName("");
    setError("");
  }, [date, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !groupId) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          sourceText: "カレンダーから追加",
          tasks: [
            {
              title: trimmed,
              description: null,
              type: taskType,
              dueDate: date,
              childName: childName || null,
              assigneeName: null,
              priority: "medium"
            }
          ]
        })
      });
      const data = await response.json();
      if (!response.ok || !data.tasks?.[0]) {
        setError("TODOを追加できませんでした。もう一度お試しください。");
        return;
      }
      invalidateCache("/api/tasks");
      onCreated(data.tasks[0]);
      onClose();
    } catch (err) {
      console.error("Failed to create task from calendar", err);
      setError("TODOを追加できませんでした。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-task-dialog-title"
        className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <h2 id="calendar-task-dialog-title" className="text-sm font-bold text-zinc-950">
              この日のTODOを追加
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">期限は {formatDateJa(date)} です</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        {groupId ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label
              className="block text-xs font-semibold text-zinc-700"
              htmlFor="calendar-task-title"
            >
              やること
              <input
                id="calendar-task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="field mt-1 min-h-11"
                placeholder="例: 体操服を持っていく"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className="block text-xs font-semibold text-zinc-700"
                htmlFor="calendar-task-child"
              >
                子ども
                <select
                  id="calendar-task-child"
                  value={childName}
                  onChange={(event) => setChildName(event.target.value)}
                  className="field mt-1 min-h-11"
                >
                  <option value="">指定しない</option>
                  {namedChildren.map((child) => (
                    <option key={child.id} value={child.name}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="block text-xs font-semibold text-zinc-700"
                htmlFor="calendar-task-type"
              >
                種類
                <select
                  id="calendar-task-type"
                  value={taskType}
                  onChange={(event) => setTaskType(event.target.value)}
                  className="field mt-1 min-h-11"
                >
                  {TASK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
              <button type="button" onClick={onClose} className="button-secondary min-h-11 text-sm">
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="button-primary min-h-11 text-sm"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                <span>この日に追加</span>
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-zinc-600">
            家族グループがまだありません。
            <Link href="/groups" className="ml-1 font-semibold text-zinc-950 underline">
              グループを作成
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
