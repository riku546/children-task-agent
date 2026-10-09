"use client";

import { CalendarPlus, CheckCircle2, Save, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/StatusPill";
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
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      {/* ナビゲーション & アクションバー */}
      <div className="flex flex-col gap-3 border-b border-zinc-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
          >
            <Undo2 size={13} />
            ダッシュボード
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="font-mono text-xs text-zinc-500">{task.id.slice(0, 8)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={
              task.status === "DONE" ? "button-secondary text-xs" : "button-primary text-xs"
            }
            onClick={toggleDone}
          >
            <CheckCircle2 size={14} />
            <span>{task.status === "DONE" ? "未完了に戻す" : "完了にする"}</span>
          </button>
          <button type="button" className="button-primary text-xs" onClick={() => save()}>
            <Save size={13} />
            <span>変更を保存</span>
          </button>
        </div>
      </div>

      {calendarState ? (
        <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          Googleカレンダー連携: {calendarState}
        </div>
      ) : null}

      {/* GitHub/Linear Issueスタイルの2カラムワークスペース（カードなし、ボーダー分割） */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* メインエディタ領域 */}
        <div className="space-y-6">
          <div>
            <label
              htmlFor="task-title"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-500"
            >
              タスク名
            </label>
            <input
              id="task-title"
              type="text"
              className="mt-1.5 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-lg font-bold tracking-tight text-zinc-950 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={form.title || ""}
              onChange={(e) => setForm((curr) => ({ ...curr, title: e.target.value }))}
              placeholder="タスクのタイトル"
            />
          </div>

          <div>
            <label
              htmlFor="task-desc"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-500"
            >
              詳細・メモ
            </label>
            <textarea
              id="task-desc"
              className="field mt-1.5 min-h-48 resize-y leading-relaxed text-sm"
              value={form.description || ""}
              onChange={(e) => setForm((curr) => ({ ...curr, description: e.target.value }))}
              placeholder="持ち物の内訳、行事の場所、連絡事項などを入力"
            />
          </div>

          {/* カレンダー連携アクション */}
          <div className="border-t border-zinc-200 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">外部連携</h3>
            <div className="mt-3 flex items-center justify-between rounded border border-zinc-200 bg-zinc-50/50 p-3">
              <div className="flex items-center gap-2.5">
                <CalendarPlus size={16} className="text-zinc-600" />
                <div>
                  <div className="text-xs font-semibold text-zinc-900">Google カレンダー</div>
                  <div className="text-[11px] text-zinc-500">
                    {task.googleEventId ? `登録済み (${task.googleEventId})` : "未連携"}
                  </div>
                </div>
              </div>
              <a
                className="button-secondary text-xs"
                href={`/api/calendar/start?taskId=${task.id}`}
              >
                <span>{task.googleEventId ? "再同期する" : "カレンダーに追加"}</span>
              </a>
            </div>
          </div>
        </div>

        {/* 右サイドバー: メタデータ属性パネル */}
        <aside className="space-y-5 lg:border-l lg:border-zinc-200 lg:pl-6">
          <div className="border-b border-zinc-200/80 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              属性・プロパティ
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="block text-xs font-semibold text-zinc-600">ステータス</span>
              <div className="mt-1">
                <StatusPill status={task.status} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600" htmlFor="task-type">
                種別
              </label>
              <input
                id="task-type"
                className="field mt-1 text-xs"
                value={form.type || ""}
                onChange={(e) => setForm((curr) => ({ ...curr, type: e.target.value }))}
                placeholder="提出物, 持ち物, 行事 等"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600" htmlFor="task-due">
                期限日
              </label>
              <input
                id="task-due"
                type="date"
                className="field mt-1 text-xs"
                value={toDateInputValue(form.dueDate)}
                onChange={(e) => setForm((curr) => ({ ...curr, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600" htmlFor="task-priority">
                優先度
              </label>
              <select
                id="task-priority"
                className="field mt-1 text-xs"
                value={form.priority || "medium"}
                onChange={(e) =>
                  setForm((curr) => ({ ...curr, priority: e.target.value as Priority }))
                }
              >
                <option value="low">低 (Low)</option>
                <option value="medium">中 (Medium)</option>
                <option value="high">高 (High)</option>
              </select>
            </div>

            <div className="border-t border-zinc-200 pt-3">
              <span className="block text-xs font-semibold text-zinc-600">対象の子ども</span>
              <span className="mt-1 block text-xs font-medium text-zinc-900">
                {task.childName || "未指定"}
              </span>
            </div>

            <div>
              <span className="block text-xs font-semibold text-zinc-600">現在の担当者</span>
              <span className="mt-1 block text-xs font-medium text-zinc-900">
                {task.assigneeName || "未設定"}
              </span>
            </div>

            <div className="border-t border-zinc-200 pt-3 text-[11px] font-mono text-zinc-600 space-y-1">
              <div>作成日: {new Date(task.createdAt).toLocaleDateString("ja-JP")}</div>
              <div>更新日: {new Date(task.updatedAt).toLocaleDateString("ja-JP")}</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
