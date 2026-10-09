"use client";

import { Plus, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TaskList } from "@/components/TaskList";
import { isSameDate } from "@/lib/date";
import type { TaskRecord } from "@/lib/types";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/tasks", { cache: "no-store" });
    const data = await response.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.status !== "DONE" && isSameDate(task.dueDate, 0)),
    [tasks]
  );
  const tomorrowTasks = useMemo(
    () => tasks.filter((task) => task.status !== "DONE" && isSameDate(task.dueDate, 1)),
    [tasks]
  );
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "DONE"), [tasks]);
  const doneCount = tasks.filter((task) => task.status === "DONE").length;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-moss">Dashboard</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">家族のTODO</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="button-icon" onClick={load} title="更新">
            <RefreshCw size={18} />
          </button>
          <Link href="/family" className="button-secondary">
            <Users size={18} />
            家族の分担
          </Link>
          <Link href="/tasks/new" className="button-primary">
            <Plus size={18} />
            新規作成
          </Link>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Metric label="今日" value={todayTasks.length} />
        <Metric label="明日" value={tomorrowTasks.length} />
        <Metric label="完了" value={doneCount} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <section>
          <h2 className="mb-3 text-lg font-bold">今日のTODO</h2>
          <TaskList
            tasks={todayTasks}
            emptyText={loading ? "読み込み中" : "今日のTODOはありません"}
          />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">明日のTODO</h2>
          <TaskList
            tasks={tomorrowTasks}
            emptyText={loading ? "読み込み中" : "明日のTODOはありません"}
          />
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">未完了TODO</h2>
        <TaskList tasks={openTasks} emptyText={loading ? "読み込み中" : "未完了TODOはありません"} />
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white px-5 py-4 shadow-sm">
      <div className="text-sm font-semibold text-ink/60">{label}</div>
      <div className="mt-1 text-3xl font-black">{value}</div>
    </div>
  );
}
