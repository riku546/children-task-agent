"use client";

import {
  Briefcase,
  CalendarDays,
  Camera,
  Layers,
  ListTodo,
  Plus,
  RefreshCw,
  Users
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AssigneeTaskColumns } from "@/components/AssigneeTaskColumns";
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

type ViewMode = "siblings" | "assignee" | "list" | "calendar";

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialViewParam = searchParams.get("view");

  const cachedTasks = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
  const cachedMe = getCachedData<any>("/api/me");

  const [tasks, setTasks] = useState<TaskRecord[]>(cachedTasks?.tasks || []);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(
    cachedMe?.user || null
  );
  const [groups, setGroups] = useState<GroupRecord[]>(cachedMe?.groups || []);
  const [loading, setLoading] = useState(!cachedTasks);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (
      initialViewParam === "assignee" ||
      initialViewParam === "list" ||
      initialViewParam === "calendar" ||
      initialViewParam === "siblings"
    ) {
      return initialViewParam;
    }
    return "siblings";
  });

  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);

  const currentGroupId = groups[0]?.id || "";

  // URLクエリパラメータとタブ状態の同期
  function handleViewChange(mode: ViewMode) {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", mode);
      window.history.replaceState(null, "", url.toString());
    }
  }

  // URLパラメータが変わった場合に同期
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "assignee" || view === "list" || view === "calendar" || view === "siblings") {
      setViewMode(view);
    }
  }, [searchParams]);

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

  // 重複・衝突の自動解析
  const conflicts = useMemo(() => {
    return detectAllConflicts(tasks);
  }, [tasks]);

  // 「私がやる」ボタン処理
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
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  assigneeMemberId: member?.id || null,
                  assigneeName: currentUser.name
                }
              : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to assign to me", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  // ステータストグル処理
  async function toggleStatus(task: TaskRecord) {
    setActionLoadingId(task.id);
    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        invalidateCache("/api/tasks");
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
      }
    } catch (err) {
      console.error("Failed to toggle task status", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  // 「ありがとう」リアクション処理
  function handleThankYou(task: TaskRecord) {
    const assignee = task.assigneeName || "パートナー";
    setThankYouMessage(`❤️ ${assignee} さんに「ありがとう！」を伝えました`);
    setTimeout(() => {
      setThankYouMessage(null);
    }, 3000);
  }

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.status !== "DONE" && isSameDate(task.dueDate, 0)),
    [tasks]
  );
  const tomorrowTasks = useMemo(
    () => tasks.filter((task) => task.status !== "DONE" && isSameDate(task.dueDate, 1)),
    [tasks]
  );
  const upcomingTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== "DONE" && !isSameDate(task.dueDate, 0) && !isSameDate(task.dueDate, 1)
      ),
    [tasks]
  );
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "DONE"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((task) => task.status === "DONE"), [tasks]);
  const doneCount = doneTasks.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8">
      {/* ページヘッダー（Linearスタイル） */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-zinc-950 sm:text-xl">
              タスク管理
            </h1>
            <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-600">
              未完了 {openTasks.length}件
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            お便りから抽出されたタスクと提出期限・分担の一元管理
          </p>
        </div>

        {/* コマンドバー・ボタングループ */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="button-icon"
            onClick={() => load(true)}
            title="最新情報に更新"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
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

          <Link href="/tasks/new" className="button-secondary">
            <Plus size={14} />
            <span>新規タスク</span>
          </Link>
        </div>
      </div>

      {/* 1. 予定の重複・衝突アラート（1行インラインバナー） */}
      <ConflictAlerts
        conflicts={conflicts}
        onSelectDate={(dateKey) => {
          handleViewChange("calendar");
          setCalendarSelectedDate(dateKey);
        }}
      />

      {/* 2. ワークロード分析ストリップ（1行インラインバー） */}
      <FamilyTeamMeter tasks={tasks} />

      {/* 3. ツールバー（表示切り替えタブ ＋ ステータスカウント） */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        {/* セグメントコントロール（4つの表示切り替え） */}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5">
          <button
            type="button"
            onClick={() => handleViewChange("siblings")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "siblings"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Layers size={13} />
            <span>きょうだい別</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange("assignee")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "assignee"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Users size={13} />
            <span>担当者別</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "list"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <ListTodo size={13} />
            <span>期限別</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange("calendar")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "calendar"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <CalendarDays size={13} />
            <span>カレンダー</span>
          </button>
        </div>

        {/* サマリーカウンター */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
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

      {/* 4. メインビューコンテンツ */}
      <div className="mt-4">
        {viewMode === "calendar" ? (
          <CalendarView
            tasks={tasks}
            conflicts={conflicts}
            selectedDate={calendarSelectedDate}
            onSelectDate={setCalendarSelectedDate}
          />
        ) : viewMode === "assignee" ? (
          /* 担当者別（チーム分担）ボード */
          <AssigneeTaskColumns
            tasks={tasks}
            currentGroup={groups[0]}
            currentUserId={currentUser?.id}
            onRefresh={() => load(true)}
          />
        ) : viewMode === "siblings" ? (
          /* きょうだい別グルーピングテーブル */
          <SiblingTaskTimeline
            tasks={tasks}
            group={groups[0]}
            currentUserId={currentUser?.id}
            onAssignToMe={assignToMe}
            onToggleStatus={toggleStatus}
            actionLoadingId={actionLoadingId}
            onThankYou={handleThankYou}
            onChildAdded={() => load(true)}
          />
        ) : (
          /* 期限別フラットテーブル（セクション分割） */
          <div className="space-y-6">
            {/* 今日 */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 text-xs font-bold text-zinc-900">
                <div className="flex items-center gap-2">
                  <span>今日のTODO</span>
                  <span className="font-mono text-[11px] text-zinc-400">({todayTasks.length})</span>
                </div>
              </div>
              <TaskList
                tasks={todayTasks}
                emptyText="今日のTODOはありません"
                currentUserId={currentUser?.id}
                onAssignToMe={assignToMe}
                onToggleStatus={toggleStatus}
                actionLoadingId={actionLoadingId}
                onThankYou={handleThankYou}
              />
            </div>

            {/* 明日 */}
            {tomorrowTasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 text-xs font-bold text-zinc-900">
                  <div className="flex items-center gap-2">
                    <span>明日のTODO</span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      ({tomorrowTasks.length})
                    </span>
                  </div>
                </div>
                <TaskList
                  tasks={tomorrowTasks}
                  emptyText="明日のTODOはありません"
                  currentUserId={currentUser?.id}
                  onAssignToMe={assignToMe}
                  onToggleStatus={toggleStatus}
                  actionLoadingId={actionLoadingId}
                  onThankYou={handleThankYou}
                />
              </div>
            )}

            {/* 今後 */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 text-xs font-bold text-zinc-900">
                <div className="flex items-center gap-2">
                  <span>今後のTODO</span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    ({upcomingTasks.length})
                  </span>
                </div>
              </div>
              <TaskList
                tasks={upcomingTasks}
                emptyText="今後予定されているTODOはありません"
                currentUserId={currentUser?.id}
                onAssignToMe={assignToMe}
                onToggleStatus={toggleStatus}
                actionLoadingId={actionLoadingId}
                onThankYou={handleThankYou}
              />
            </div>

            {/* 完了済み */}
            {doneTasks.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 text-xs font-bold text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span>完了済み</span>
                    <span className="font-mono text-[11px]">({doneCount})</span>
                  </div>
                </div>
                <TaskList
                  tasks={doneTasks}
                  emptyText=""
                  currentUserId={currentUser?.id}
                  onAssignToMe={assignToMe}
                  onToggleStatus={toggleStatus}
                  actionLoadingId={actionLoadingId}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 仕事予定モーダル */}
      <QuickWorkScheduleModal
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
        groupId={currentGroupId}
        onSuccess={() => load(true)}
      />

      {/* トースト通知 */}
      {thankYouMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white shadow-soft animate-in fade-in slide-in-from-bottom-2">
          {thankYouMessage}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-xs text-zinc-400">
          読み込み中...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
