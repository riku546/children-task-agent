"use client";

import { CalendarPlus, CheckCircle2, Save, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DuePill, PriorityPill, StatusPill } from "@/components/StatusPill";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import { toDateInputValue } from "@/lib/date";
import type { Priority, TaskRecord, TaskStatus } from "@/lib/types";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const cached = params.id ? getCachedData<{ task: TaskRecord }>(`/api/tasks/${params.id}`) : null;
  const [task, setTask] = useState<TaskRecord | null>(cached?.task || null);
  const [form, setForm] = useState<Partial<TaskRecord>>(cached?.task || {});
  const calendarState = searchParams.get("calendar");

  async function load(force = false) {
    if (!params.id) return;
    try {
      const data = await fetchJsonWithCache<{ task: TaskRecord }>(`/api/tasks/${params.id}`, {
        force
      });
      setTask(data.task);
      setForm(data.task || {});
    } catch (e) {
      console.error("Failed to load task", e);
    }
  }

  async function save(patch?: Partial<TaskRecord>) {
    const payload = patch || form;
    const response = await fetch(`/api/tasks/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        type: payload.type,
        dueDate: payload.dueDate ? toDateInputValue(payload.dueDate) : null,
        priority: payload.priority,
        status: payload.status
      })
    });
    const data = await response.json();
    invalidateCache("/api/tasks");
    setTask(data.task);
    setForm(data.task);
  }

  async function toggleDone() {
    if (!task) return;
    const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    await save({ ...task, status: nextStatus });
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!task) {
    return <section className="mx-auto max-w-4xl px-4 py-12">読み込み中</section>;
  }

  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition"
      >
        <Undo2 size={14} />
        ダッシュボードへ戻る
      </Link>

      <div className="mt-4 rounded-xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill status={task.status} />
              <DuePill dueDate={task.dueDate} />
              <PriorityPill priority={task.priority} />
            </div>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
              {task.title}
            </h1>
          </div>
          <button
            type="button"
            className={task.status === "DONE" ? "button-secondary" : "button-primary"}
            onClick={toggleDone}
          >
            <CheckCircle2 size={15} />
            <span>{task.status === "DONE" ? "未完了に戻す" : "完了にする"}</span>
          </button>
        </div>

        {calendarState ? (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-800">
            カレンダー連携: {calendarState}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field
            label="タイトル"
            value={form.title || ""}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />
          <Field
            label="種別"
            value={form.type || ""}
            onChange={(value) => setForm((current) => ({ ...current, type: value }))}
          />
          <Field
            label="期限"
            type="date"
            value={toDateInputValue(form.dueDate)}
            onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))}
          />
          <label className="block text-xs font-semibold text-zinc-700">
            重要度
            <select
              className="field mt-1"
              value={form.priority || "medium"}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value as Priority }))
              }
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-xs font-semibold text-zinc-700">
          説明
          <textarea
            className="field mt-1 min-h-28"
            value={form.description || ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="button-primary" onClick={() => save()}>
            <Save size={14} />
            <span>保存</span>
          </button>
          <a className="button-secondary" href={`/api/calendar/start?taskId=${task.id}`}>
            <CalendarPlus size={14} />
            <span>Googleカレンダーに追加</span>
          </a>
        </div>

        <div className="mt-6 grid gap-3 border-t border-zinc-100 pt-4 text-xs text-zinc-500 md:grid-cols-2 font-mono">
          <div>対象: {task.childName || "未設定"}</div>
          <div>担当: {task.assigneeName || "未設定"}</div>
          <div>Calendar ID: {task.googleEventId || "未登録"}</div>
          <div>作成日: {new Date(task.createdAt).toLocaleDateString("ja-JP")}</div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className="field mt-1"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
