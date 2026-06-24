"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, Save, Undo2 } from "lucide-react";
import type { Priority, TaskRecord, TaskStatus } from "@/lib/types";
import { toDateInputValue } from "@/lib/date";
import { DuePill, PriorityPill, StatusPill } from "@/components/StatusPill";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [task, setTask] = useState<TaskRecord | null>(null);
  const [form, setForm] = useState<Partial<TaskRecord>>({});
  const calendarState = searchParams.get("calendar");

  async function load() {
    const response = await fetch(`/api/tasks/${params.id}`, { cache: "no-store" });
    const data = await response.json();
    setTask(data.task);
    setForm(data.task || {});
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
    <section className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:pb-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-moss">
        <Undo2 size={16} />
        戻る
      </Link>

      <div className="mt-5 rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={task.status} />
              <DuePill dueDate={task.dueDate} />
              <PriorityPill priority={task.priority} />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-normal md:text-4xl">{task.title}</h1>
          </div>
          <button className={task.status === "DONE" ? "button-secondary" : "button-primary"} onClick={toggleDone}>
            <CheckCircle2 size={18} />
            {task.status === "DONE" ? "未完了に戻す" : "完了"}
          </button>
        </div>

        {calendarState ? <div className="mt-5 rounded-md bg-mint px-4 py-3 text-sm font-semibold text-moss">カレンダー連携: {calendarState}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="タイトル" value={form.title || ""} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
          <Field label="種別" value={form.type || ""} onChange={(value) => setForm((current) => ({ ...current, type: value }))} />
          <Field label="期限" type="date" value={toDateInputValue(form.dueDate)} onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))} />
          <label className="block text-sm font-semibold">
            重要度
            <select className="field mt-1" value={form.priority || "medium"} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Priority }))}>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold">
          説明
          <textarea className="field mt-1 min-h-28" value={form.description || ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="button-primary" onClick={() => save()}>
            <Save size={18} />
            保存
          </button>
          <a className="button-secondary" href={`/api/calendar/start?taskId=${task.id}`}>
            <CalendarPlus size={18} />
            Googleカレンダーに追加
          </a>
        </div>

        <div className="mt-6 grid gap-3 border-t border-ink/10 pt-5 text-sm text-ink/70 md:grid-cols-2">
          <div>対象: {task.childName || "未設定"}</div>
          <div>担当: {task.assigneeName || "未設定"}</div>
          <div>Calendar ID: {task.googleEventId || "未登録"}</div>
          <div>作成日: {new Date(task.createdAt).toLocaleDateString("ja-JP")}</div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="field mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
