"use client";

import { Loader2, Plus } from "lucide-react";
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
  date: string;
  groupId: string;
  children: ChildOption[];
  onCreated: (task: TaskRecord) => void;
};

export function QuickDueTaskForm({ date, groupId, children, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("確認");
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedTitle, setSavedTitle] = useState("");

  const namedChildren = useMemo(
    () => children.filter((child) => child.name.trim() && child.name.trim() !== "未設定"),
    [children]
  );

  useEffect(() => {
    setTitle("");
    setTaskType("確認");
    setChildName("");
    setError("");
    setSavedTitle("");
  }, [date]);

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
      setSavedTitle(trimmed);
      setTitle("");
    } catch (err) {
      console.error("Failed to create task from calendar", err);
      setError("TODOを追加できませんでした。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (!groupId) {
    return (
      <p className="mt-3 text-sm text-zinc-600">
        家族グループがまだありません。
        <Link href="/groups" className="ml-1 font-semibold text-zinc-950 underline">
          グループを作成
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-zinc-900">この日のTODOを追加</p>
        <p className="mt-0.5 text-xs text-zinc-500">期限は {formatDateJa(date)} になります</p>
      </div>

      <label className="block text-xs font-semibold text-zinc-700" htmlFor="calendar-task-title">
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
        <label className="block text-xs font-semibold text-zinc-700" htmlFor="calendar-task-child">
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
        <label className="block text-xs font-semibold text-zinc-700" htmlFor="calendar-task-type">
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
      {savedTitle ? (
        <p className="text-xs font-medium text-emerald-700">「{savedTitle}」を追加しました</p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="button-primary min-h-11 w-full sm:w-auto"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        <span>この日に追加</span>
      </button>
    </form>
  );
}
