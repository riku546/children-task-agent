"use client";

import {
  Briefcase,
  CalendarDays,
  Camera,
  Heart,
  ListTodo,
  Plus,
  RefreshCw,
  Upload,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { ConflictAlerts } from "@/components/ConflictAlerts";
import { FamilyTeamMeter } from "@/components/FamilyTeamMeter";
import { QuickWorkScheduleModal } from "@/components/QuickWorkScheduleModal";
import { SiblingTaskTimeline } from "@/components/SiblingTaskTimeline";
import { TaskList } from "@/components/TaskList";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import { detectAllConflicts } from "@/lib/conflict-detector";
import { isSameDate } from "@/lib/date";
import type { GroupRecord, TaskRecord } from "@/lib/types";

type ViewMode = "list" | "calendar";

export default function DashboardPage() {
  const cachedTasks = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
  const cachedMe = getCachedData<any>("/api/me");

  const [tasks, setTasks] = useState<TaskRecord[]>(cachedTasks?.tasks || []);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(
    cachedMe?.user || null
  );
  const [groups, setGroups] = useState<GroupRecord[]>(cachedMe?.groups || []);
  const [loading, setLoading] = useState(!cachedTasks);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);

  const currentGroupId = groups[0]?.id || "";

  async function load(force = false) {
    if (!force) {
      const t = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
      const me = getCachedData<any>("/api/me");
      if (t && me) {
        setTasks(t.tasks || []);
        setCurrentUser(me.user || null);
        setGroups(me.groups || []);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const [tasksData, meData] = await Promise.all([
        fetchJsonWithCache<{ tasks: TaskRecord[] }>("/api/tasks", { force }),
        fetchJsonWithCache<any>("/api/me", { force })
      ]);
      setTasks(tasksData.tasks || []);
      setCurrentUser(meData.user || null);
      setGroups(meData.groups || []);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 重複・衝突の自動解析（機能2 ＆ 機能4）
  const conflicts = useMemo(() => {
    return detectAllConflicts(tasks);
  }, [tasks]);

  // 機能3: 「私がやる」ボタン処理
  async function assignToMe(taskId: string) {
    if (!currentUser) return;
    setActionLoadingId(taskId);
    try {
      const targetGroup = groups[0];
      const member = targetGroup?.members.find((m) => m.userId === currentUser.id);
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeMemberId: member?.id || null,
          assigneeName: currentUser.name
        })
      });
      if (res.ok) {
        invalidateCache("/api/tasks");
        await load(true);
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  // ステータストグル処理
  async function toggleStatus(task: TaskRecord) {
    setActionLoadingId(task.id);
    try {
      const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        invalidateCache("/api/tasks");
        await load(true);
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  // 「ありがとう❤️」リアクション処理
  function handleThankYou(task: TaskRecord) {
    const assignee = task.assigneeName || "パートナー";
    setThankYouMessage(
      `❤️ ${assignee} さんに「ありがとう！」を伝えました！チーム育児スコアがアップしました ✨`
    );
    setTimeout(() => {
      setThankYouMessage(null);
    }, 3500);
  }

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
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      {/* ページヘッダー */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200/80 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
              家族のTODO
            </h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-medium text-zinc-600">
              未完了 {openTasks.length}件
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            お便りから抽出されたタスクときょうだいの予定を一覧管理
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="button-icon"
            onClick={() => load(true)}
            title="最新情報に更新"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <Link href="/tasks/new" className="button-primary">
            <Camera size={14} />
            <span>お便りをスキャン</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsWorkModalOpen(true)}
            className="button-secondary"
            title="残業や出張など、仕事の予定を追加して衝突を検知"
          >
            <Briefcase size={14} />
            <span>仕事の予定</span>
          </button>

          <Link href="/family" className="button-secondary">
            <Users size={14} />
            <span>チーム分担</span>
          </Link>

          <Link href="/tasks/new" className="button-secondary">
            <Plus size={14} />
            <span>手動追加</span>
          </Link>
        </div>
      </div>

      {/* 1. お便りスキャン・アクションバー（SaaS風インジェストバー） */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-3.5 sm:px-4 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
            <Camera size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-zinc-900 truncate">
                新しいお便りや予定をスキャン
              </h2>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-700">
                AI Auto-Extract
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              写真撮影・PDF・画像から提出物や持ち物を自動抽出
            </p>
          </div>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
          <Link
            href="/tasks/new"
            className="inline-flex min-h-8 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-2xs transition hover:bg-zinc-800"
          >
            <Camera size={13} />
            <span>撮影・スキャン</span>
          </Link>
          <Link
            href="/tasks/new"
            className="inline-flex min-h-8 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs transition hover:bg-zinc-50"
          >
            <Upload size={13} className="text-zinc-500" />
            <span>ファイル選択</span>
          </Link>
        </div>
      </div>

      {/* 2. チーム育児メーター（夫婦の協働スコア・偏り解消） */}
      <FamilyTeamMeter tasks={tasks} />

      {/* 3. 予定の重複・衝突アラート（きょうだい重複・仕事衝突） */}
      <ConflictAlerts
        conflicts={conflicts}
        onSelectDate={(dateKey) => {
          setViewMode("calendar");
          setCalendarSelectedDate(dateKey);
        }}
      />

      {/* 4. きょうだい別の予定・持ち物タイムライン（二人目の壁打破） */}
      <SiblingTaskTimeline
        tasks={tasks}
        group={groups[0]}
        onAssignToMe={assignToMe}
        onToggleStatus={toggleStatus}
        actionLoadingId={actionLoadingId}
        onThankYou={handleThankYou}
        onChildAdded={() => load(true)}
      />

      {/* 5. 表示切り替え（ToDoリスト ↔ 月間カレンダー） */}
      <div className="mt-10 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
        <div className="flex items-center rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "list"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <ListTodo size={14} />
            <span>リスト表示 ({openTasks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "calendar"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <CalendarDays size={14} />
            <span>カレンダー</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
          <span>
            今日: <strong className="text-zinc-900">{todayTasks.length}</strong>
          </span>
          <span>
            明日: <strong className="text-zinc-900">{tomorrowTasks.length}</strong>
          </span>
          <span>
            完了: <strong className="text-zinc-900">{doneCount}</strong>
          </span>
        </div>
      </div>

      {/* ビューコンテンツ */}
      {viewMode === "calendar" ? (
        <CalendarView
          tasks={tasks}
          conflicts={conflicts}
          selectedDate={calendarSelectedDate}
          onSelectDate={setCalendarSelectedDate}
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <section>
              <h2 className="mb-3 text-lg font-bold">今日のTODO ({todayTasks.length})</h2>
              <TaskList
                tasks={todayTasks}
                emptyText={loading ? "読み込み中" : "今日のTODOはありません 🎉"}
                currentUserId={currentUser?.id}
                onAssignToMe={assignToMe}
                onToggleStatus={toggleStatus}
                actionLoadingId={actionLoadingId}
                onThankYou={handleThankYou}
              />
            </section>
            <section>
              <h2 className="mb-3 text-lg font-bold">明日のTODO ({tomorrowTasks.length})</h2>
              <TaskList
                tasks={tomorrowTasks}
                emptyText={loading ? "読み込み中" : "明日のTODOはありません"}
                currentUserId={currentUser?.id}
                onAssignToMe={assignToMe}
                onToggleStatus={toggleStatus}
                actionLoadingId={actionLoadingId}
                onThankYou={handleThankYou}
              />
            </section>
          </div>

          <section>
            <h2 className="mb-3 text-lg font-bold">すべての未完了TODO ({openTasks.length})</h2>
            <TaskList
              tasks={openTasks}
              emptyText={loading ? "読み込み中" : "未完了のTODOはありません"}
              currentUserId={currentUser?.id}
              onAssignToMe={assignToMe}
              onToggleStatus={toggleStatus}
              actionLoadingId={actionLoadingId}
              onThankYou={handleThankYou}
            />
          </section>
        </div>
      )}

      {/* 仕事予定クイック登録モーダル */}
      <QuickWorkScheduleModal
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
        groupId={currentGroupId}
        defaultDate={calendarSelectedDate}
        onSuccess={() => load(true)}
      />

      {/* 「ありがとう」トースト演出 */}
      {thankYouMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-800 shadow-xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Heart size={18} className="fill-rose-500 text-rose-500 animate-bounce" />
            <span>{thankYouMessage}</span>
          </div>
        </div>
      )}
    </section>
  );
}
