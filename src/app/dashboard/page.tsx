"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Skeleton, TaskRowsSkeleton } from "@/components/Skeleton";
import { TaskList } from "@/components/TaskList";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import { isSameDate } from "@/lib/date";
import type { GroupRecord, TaskRecord } from "@/lib/types";

const HOME_TODAY_PREVIEW = 2;

function DashboardContent() {
  const cachedTasks = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
  const cachedMe = getCachedData<{ user?: { id: string; name: string }; groups?: GroupRecord[] }>(
    "/api/me"
  );
  const [tasks, setTasks] = useState<TaskRecord[]>(cachedTasks?.tasks || []);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(
    cachedMe?.user || null
  );
  const [groups, setGroups] = useState<GroupRecord[]>(cachedMe?.groups || []);
  const [loading, setLoading] = useState(!cachedTasks || !cachedMe);

  const myMemberIds = useMemo(() => {
    if (!currentUser) return [];
    return groups.flatMap((group) =>
      group.members.filter((member) => member.userId === currentUser.id).map((member) => member.id)
    );
  }, [groups, currentUser]);

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.status !== "DONE" && isSameDate(task.dueDate, 0)),
    [tasks]
  );

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
    } catch (error) {
      console.error("Failed to load home", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function assignToMe(taskId: string) {
    if (!currentUser) return;
    const member = groups[0]?.members.find((item) => item.userId === currentUser.id);
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assigneeMemberId: member?.id || null,
        assigneeName: currentUser.name
      })
    });
    if (!response.ok) return;
    invalidateCache("/api/tasks");
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, assigneeMemberId: member?.id || null, assigneeName: currentUser.name }
          : task
      )
    );
  }

  async function toggleStatus(task: TaskRecord) {
    const status = task.status === "DONE" ? "TODO" : "DONE";
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return;
    invalidateCache("/api/tasks");
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status } : item))
    );
  }

  return (
    <PageShell>
      <PageHeader title="ホーム" description="今日の予定、家族、お便りの入口です" />

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="text-lg font-bold leading-none text-zinc-500">今日のタスク</h2>
          {loading ? (
            <div className="mt-3">
              <TaskRowsSkeleton rows={HOME_TODAY_PREVIEW} />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-zinc-600">未完了 {todayTasks.length}件</p>
              <TaskList
                tasks={todayTasks.slice(0, HOME_TODAY_PREVIEW)}
                emptyText="今日のタスクはありません"
                currentUserId={currentUser?.id}
                myMemberIds={myMemberIds}
                onAssignToMe={assignToMe}
                onToggleStatus={toggleStatus}
              />
              <Link
                href="/tasks"
                className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-zinc-800 underline-offset-2 hover:underline"
              >
                タスクを見る
              </Link>
            </>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold leading-none text-zinc-500">家族</h2>
          {loading ? (
            <Skeleton className="mt-3 h-5 w-40" />
          ) : groups.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">まだ家族グループがありません。</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm text-zinc-800">
              {groups.map((group) => (
                <li key={group.id}>{group.name}</li>
              ))}
            </ul>
          )}
          <Link
            href="/groups"
            className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-zinc-800 underline-offset-2 hover:underline"
          >
            家族の設定
          </Link>
        </section>

        <section>
          <h2 className="text-lg font-bold leading-none text-zinc-500">お便り</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            写真やPDFはチャットに送るとタスクになります。
          </p>
          <Link href="/chat" className="button-primary mt-3">
            チャットを開く
          </Link>
        </section>
      </div>
    </PageShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <PageHeader title="ホーム" description="今日の予定、家族、お便りの入口です" />
        </PageShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
