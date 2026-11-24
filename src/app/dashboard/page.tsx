"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { TaskList } from "@/components/TaskList";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import { isSameDate } from "@/lib/date";
import type { GroupRecord, TaskRecord } from "@/lib/types";

const TODAY_LIMIT = 4;
const UPCOMING_LIMIT = 4;
const DONE_LIMIT = 3;

type SectionId = "today" | "upcoming" | "done";

function compareDueDate(a: TaskRecord, b: TaskRecord) {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    today: false,
    upcoming: false,
    done: false
  });

  const myMemberIds = useMemo(() => {
    if (!currentUser) return [];
    return groups.flatMap((group) =>
      group.members.filter((member) => member.userId === currentUser.id).map((member) => member.id)
    );
  }, [groups, currentUser]);

  useEffect(() => {
    if (searchParams.get("view") === "assignee") {
      router.replace("/team");
    }
  }, [searchParams, router]);

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

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.status !== "DONE" && isSameDate(task.dueDate, 0)),
    [tasks]
  );
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "DONE" && !isSameDate(task.dueDate, 0))
        .sort(compareDueDate),
    [tasks]
  );
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "DONE"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((task) => task.status === "DONE"), [tasks]);

  function toggleSection(id: SectionId) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <PageShell>
      <PageHeader
        title="ホーム"
        description="今日やることと、そのあとの予定を確認します"
        badge={
          <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
            未完了 {openTasks.length}件
          </span>
        }
        actions={
          <Link
            href="/team"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
          >
            <span>分担</span>
            <ArrowUpRight size={14} />
          </Link>
        }
      />

      {loading && tasks.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">読み込み中...</p>
      ) : (
        <div className="mt-6 space-y-6">
          <TaskSection
            id="today"
            title="今日"
            tasks={todayTasks}
            limit={TODAY_LIMIT}
            expanded={expanded.today}
            onToggle={toggleSection}
            emptyText="今日のTODOはありません"
            currentUserId={currentUser?.id}
            myMemberIds={myMemberIds}
            onAssignToMe={assignToMe}
            onToggleStatus={toggleStatus}
            actionLoadingId={actionLoadingId}
          />
          <TaskSection
            id="upcoming"
            title="今後"
            tasks={upcomingTasks}
            limit={UPCOMING_LIMIT}
            expanded={expanded.upcoming}
            onToggle={toggleSection}
            emptyText="今後のTODOはありません"
            currentUserId={currentUser?.id}
            myMemberIds={myMemberIds}
            onAssignToMe={assignToMe}
            onToggleStatus={toggleStatus}
            actionLoadingId={actionLoadingId}
          />
          {doneTasks.length > 0 ? (
            <TaskSection
              id="done"
              title="完了済み"
              tasks={doneTasks}
              limit={DONE_LIMIT}
              expanded={expanded.done}
              onToggle={toggleSection}
              emptyText=""
              currentUserId={currentUser?.id}
              myMemberIds={myMemberIds}
              onAssignToMe={assignToMe}
              onToggleStatus={toggleStatus}
              actionLoadingId={actionLoadingId}
            />
          ) : null}
        </div>
      )}
    </PageShell>
  );
}

function TaskSection({
  id,
  title,
  tasks,
  limit,
  expanded,
  onToggle,
  emptyText,
  currentUserId,
  myMemberIds,
  onAssignToMe,
  onToggleStatus,
  actionLoadingId
}: {
  id: SectionId;
  title: string;
  tasks: TaskRecord[];
  limit: number;
  expanded: boolean;
  onToggle: (id: SectionId) => void;
  emptyText: string;
  currentUserId?: string | null;
  myMemberIds: string[];
  onAssignToMe: (taskId: string) => Promise<void> | void;
  onToggleStatus: (task: TaskRecord) => Promise<void> | void;
  actionLoadingId: string | null;
}) {
  const hiddenCount = Math.max(0, tasks.length - limit);
  const visibleTasks = expanded || hiddenCount === 0 ? tasks : tasks.slice(0, limit);

  return (
    <section>
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-900">
        <div className="flex items-center gap-2">
          <h2>{title}</h2>
          <span className="font-mono text-xs font-semibold text-zinc-700">({tasks.length})</span>
        </div>
      </div>
      <TaskList
        tasks={visibleTasks}
        emptyText={emptyText}
        currentUserId={currentUserId}
        myMemberIds={myMemberIds}
        onAssignToMe={onAssignToMe}
        onToggleStatus={onToggleStatus}
        actionLoadingId={actionLoadingId}
      />
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-zinc-700 underline-offset-2 hover:text-zinc-950 hover:underline"
          aria-expanded={expanded}
          onClick={() => onToggle(id)}
        >
          {expanded ? "閉じる" : `ほか ${hiddenCount}件`}
        </button>
      ) : null}
    </section>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="py-16 text-center text-sm font-medium text-zinc-600">読み込み中...</p>
        </PageShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
