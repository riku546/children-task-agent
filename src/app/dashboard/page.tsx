"use client";

import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  Camera,
  Layers,
  ListTodo,
  MoreHorizontal,
  RefreshCw,
  Type
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { ConflictAlerts } from "@/components/ConflictAlerts";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { QuickWorkScheduleModal } from "@/components/QuickWorkScheduleModal";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SiblingTaskTimeline } from "@/components/SiblingTaskTimeline";
import { TaskList } from "@/components/TaskList";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import { detectAllConflicts } from "@/lib/conflict-detector";
import { isSameDate } from "@/lib/date";
import type { GroupRecord, TaskRecord } from "@/lib/types";

type ViewMode = "list" | "siblings" | "calendar";

const homeSegments = [
  { id: "list" as const, label: "期限", icon: ListTodo },
  { id: "siblings" as const, label: "子ども", icon: Layers },
  { id: "calendar" as const, label: "カレンダー", icon: CalendarDays }
];

function parseViewMode(raw: string | null): ViewMode {
  if (raw === "siblings" || raw === "calendar" || raw === "list") {
    return raw;
  }
  return "list";
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialViewParam = searchParams.get("view");

  const cachedTasks = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
  const cachedMe = getCachedData<{ user?: { id: string; name: string }; groups?: GroupRecord[] }>(
    "/api/me"
  );

  const [tasks, setTasks] = useState<TaskRecord[]>(cachedTasks?.tasks || []);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(
    cachedMe?.user || null
  );
  const [groups, setGroups] = useState<GroupRecord[]>(cachedMe?.groups || []);
  const [loading, setLoading] = useState(!cachedTasks);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => parseViewMode(initialViewParam));

  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);

  const currentGroup = groups[0];
  const currentGroupId = currentGroup?.id || "";
  const myMemberIds = useMemo(() => {
    if (!currentUser) return [];
    return groups.flatMap((group) =>
      group.members.filter((member) => member.userId === currentUser.id).map((member) => member.id)
    );
  }, [groups, currentUser]);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "assignee") {
      router.replace("/team");
      return;
    }
    setViewMode(parseViewMode(view));
  }, [searchParams, router]);

  function handleViewChange(mode: ViewMode) {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", mode);
      window.history.replaceState(null, "", url.toString());
    }
  }

  async function load(force = false) {
    if (!force) {
      const t = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
      const me = getCachedData<{ user?: { id: string; name: string }; groups?: GroupRecord[] }>(
        "/api/me"
      );
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
        fetchJsonWithCache<{ user?: { id: string; name: string }; groups?: GroupRecord[] }>(
          "/api/me",
          { force }
        )
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

  const conflicts = useMemo(() => detectAllConflicts(tasks), [tasks]);

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

  function handleTaskCreated(task: TaskRecord) {
    invalidateCache("/api/tasks");
    setTasks((prev) => [task, ...prev.filter((item) => item.id !== task.id)]);
  }

  function handleThankYou(task: TaskRecord) {
    const assignee = task.assigneeName || "パートナー";
    setThankYouMessage(`❤️ ${assignee} さんに「ありがとう！」を伝えました`);
    setTimeout(() => setThankYouMessage(null), 3000);
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

  const listSections = (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-900">
          <div className="flex items-center gap-2">
            <span>今日のTODO</span>
            <span className="font-mono text-xs text-zinc-400">({todayTasks.length})</span>
          </div>
        </div>
        <TaskList
          tasks={todayTasks}
          emptyText="今日のTODOはありません"
          currentUserId={currentUser?.id}
          myMemberIds={myMemberIds}
          onAssignToMe={assignToMe}
          onToggleStatus={toggleStatus}
          actionLoadingId={actionLoadingId}
          onThankYou={handleThankYou}
        />
      </div>

      {tomorrowTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-900">
            <div className="flex items-center gap-2">
              <span>明日のTODO</span>
              <span className="font-mono text-xs text-zinc-400">({tomorrowTasks.length})</span>
            </div>
          </div>
          <TaskList
            tasks={tomorrowTasks}
            emptyText="明日のTODOはありません"
            currentUserId={currentUser?.id}
            myMemberIds={myMemberIds}
            onAssignToMe={assignToMe}
            onToggleStatus={toggleStatus}
            actionLoadingId={actionLoadingId}
            onThankYou={handleThankYou}
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-900">
          <div className="flex items-center gap-2">
            <span>今後のTODO</span>
            <span className="font-mono text-xs text-zinc-400">({upcomingTasks.length})</span>
          </div>
        </div>
        <TaskList
          tasks={upcomingTasks}
          emptyText="今後予定されているTODOはありません"
          currentUserId={currentUser?.id}
          myMemberIds={myMemberIds}
          onAssignToMe={assignToMe}
          onToggleStatus={toggleStatus}
          actionLoadingId={actionLoadingId}
          onThankYou={handleThankYou}
        />
      </div>

      {doneTasks.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-400">
            <div className="flex items-center gap-2">
              <span>完了済み</span>
              <span className="font-mono text-xs">({doneCount})</span>
            </div>
          </div>
          <TaskList
            tasks={doneTasks}
            emptyText=""
            currentUserId={currentUser?.id}
            myMemberIds={myMemberIds}
            onAssignToMe={assignToMe}
            onToggleStatus={toggleStatus}
            actionLoadingId={actionLoadingId}
          />
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <PageHeader
        title="ホーム"
        description="今日やることと提出期限を確認します"
        badge={
          <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
            未完了 {openTasks.length}件
          </span>
        }
        actions={
          <>
            <Link href="/tasks/new" className="button-primary">
              <Camera size={15} />
              <span>お便りを取込</span>
            </Link>
            <details className="relative group">
              <summary className="button-icon cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <MoreHorizontal size={15} />
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  onClick={() => load(true)}
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  最新に更新
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  onClick={() => setIsWorkModalOpen(true)}
                >
                  <Briefcase size={14} />
                  仕事の予定
                </button>
                <Link
                  href="/tasks/new"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  onClick={(e) => {
                    const details = e.currentTarget.closest("details") as HTMLDetailsElement | null;
                    if (details) details.open = false;
                  }}
                >
                  <Type size={14} />
                  手動でタスク追加
                </Link>
              </div>
            </details>
          </>
        }
      />

      <ConflictAlerts
        conflicts={conflicts}
        onSelectDate={(dateKey) => {
          handleViewChange("calendar");
          setCalendarSelectedDate(dateKey);
        }}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl value={viewMode} onChange={handleViewChange} segments={homeSegments} />
        <Link
          href="/team"
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition shrink-0"
        >
          <span>分担ボード</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {viewMode === "list" && (
        <div className="mt-2 flex items-center gap-4 text-sm font-mono text-zinc-600">
          <span>
            今日: <strong className="text-zinc-950">{todayTasks.length}</strong>
          </span>
          <span>
            明日: <strong className="text-zinc-950">{tomorrowTasks.length}</strong>
          </span>
          <span>
            完了: <strong className="text-zinc-950">{doneCount}</strong>
          </span>
        </div>
      )}

      <div className="mt-4">
        {viewMode === "calendar" ? (
          <CalendarView
            tasks={tasks}
            conflicts={conflicts}
            selectedDate={calendarSelectedDate}
            onSelectDate={setCalendarSelectedDate}
            groupId={currentGroupId}
            children={currentGroup?.children || []}
            onTaskCreated={handleTaskCreated}
          />
        ) : viewMode === "siblings" ? (
          <SiblingTaskTimeline
            tasks={tasks}
            group={groups[0]}
            currentUserId={currentUser?.id}
            myMemberIds={myMemberIds}
            onAssignToMe={assignToMe}
            onToggleStatus={toggleStatus}
            actionLoadingId={actionLoadingId}
            onThankYou={handleThankYou}
            onChildAdded={() => load(true)}
          />
        ) : (
          listSections
        )}
      </div>

      <QuickWorkScheduleModal
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
        groupId={currentGroupId}
        onSuccess={() => load(true)}
      />

      {thankYouMessage && (
        <div className="fixed bottom-20 right-4 z-50 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-soft md:bottom-6 md:right-6">
          {thankYouMessage}
        </div>
      )}
    </PageShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="py-16 text-center text-sm text-zinc-400">読み込み中...</p>
        </PageShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
