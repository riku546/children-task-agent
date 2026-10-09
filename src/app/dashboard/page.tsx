"use client";

import { Briefcase, CalendarDays, Heart, ListTodo, Plus, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { ConflictAlerts } from "@/components/ConflictAlerts";
import { FamilyTeamMeter } from "@/components/FamilyTeamMeter";
import { QuickScanHero } from "@/components/QuickScanHero";
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
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-12">
      {/* ページヘッダー */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-moss">Team Parenting Dashboard</p>
          <h1 className="mt-1 text-3xl font-black tracking-normal md:text-5xl">家族のTODO</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="button-icon"
            onClick={() => load(true)}
            title="更新"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          {/* 仕事予定クイック追加ボタン */}
          <button
            type="button"
            onClick={() => setIsWorkModalOpen(true)}
            className="button-secondary text-xs sm:text-sm"
            title="残業や出張など、仕事の予定を追加して衝突を検知"
          >
            <Briefcase size={16} />
            仕事の予定
          </button>

          <Link href="/family" className="button-secondary text-xs sm:text-sm">
            <Users size={16} />
            家族の分担
          </Link>
          <Link href="/tasks/new" className="button-primary text-xs sm:text-sm">
            <Plus size={16} />
            TODO手動登録
          </Link>
        </div>
      </div>

      {/* 1. お便り・プリントのクイックスキャン Hero（最上部の主役） */}
      <div className="mt-7">
        <QuickScanHero />
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
        onAssignToMe={assignToMe}
        onToggleStatus={toggleStatus}
        actionLoadingId={actionLoadingId}
        onThankYou={handleThankYou}
      />

      {/* 5. 表示切り替え（ToDoリスト ↔ 月間カレンダー） */}
      <div className="mt-10 mb-4 flex items-center justify-between border-b border-ink/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              viewMode === "list"
                ? "bg-moss text-white shadow-2xs"
                : "text-ink/70 hover:bg-cloud hover:text-ink"
            }`}
          >
            <ListTodo size={17} />
            期限別リスト ({openTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              viewMode === "calendar"
                ? "bg-moss text-white shadow-2xs"
                : "text-ink/70 hover:bg-cloud hover:text-ink"
            }`}
          >
            <CalendarDays size={17} />
            カレンダー表示（月間）
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-ink/60">
          <span>今日: {todayTasks.length}件</span>
          <span>明日: {tomorrowTasks.length}件</span>
          <span>完了: {doneCount}件</span>
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
