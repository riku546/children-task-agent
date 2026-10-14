"use client";

import { Undo2 } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { AssigneeTaskColumns } from "@/components/AssigneeTaskColumns";
import { FamilyTeamMeter } from "@/components/FamilyTeamMeter";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { fetchJsonWithCache, getCachedData } from "@/lib/client-cache";
import type { GroupRecord, TaskRecord } from "@/lib/types";

function TeamContent() {
  const cachedTasks = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
  const cachedMe = getCachedData<{ user?: { id: string }; groups?: GroupRecord[] }>("/api/me");

  const [tasks, setTasks] = useState<TaskRecord[]>(cachedTasks?.tasks || []);
  const [groups, setGroups] = useState<GroupRecord[]>(cachedMe?.groups || []);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(cachedMe?.user?.id);
  const [loading, setLoading] = useState(!cachedTasks);

  async function load(force = false) {
    if (!force) {
      const t = getCachedData<{ tasks: TaskRecord[] }>("/api/tasks");
      const me = getCachedData<{ user?: { id: string }; groups?: GroupRecord[] }>("/api/me");
      if (t && me) {
        setTasks(t.tasks || []);
        setGroups(me.groups || []);
        setCurrentUserId(me.user?.id);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const [tasksData, meData] = await Promise.all([
        fetchJsonWithCache<{ tasks: TaskRecord[] }>("/api/tasks", { force }),
        fetchJsonWithCache<{ user?: { id: string }; groups?: GroupRecord[] }>("/api/me", { force })
      ]);
      setTasks(tasksData.tasks || []);
      setGroups(meData.groups || []);
      setCurrentUserId(meData.user?.id);
    } catch (e) {
      console.error("Failed to load team data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PageShell>
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition"
      >
        <Undo2 size={14} />
        ホーム
      </Link>

      <PageHeader
        title="分担"
        description="未担当のタスクを埋め、家族の担当のばらつきを調整します"
      />

      {loading && tasks.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">読み込み中...</p>
      ) : (
        <div className="mt-4 space-y-4">
          <FamilyTeamMeter tasks={tasks} variant="team" />
          <AssigneeTaskColumns
            tasks={tasks}
            currentGroup={groups[0]}
            currentUserId={currentUserId}
            onRefresh={() => load(true)}
          />
        </div>
      )}
    </PageShell>
  );
}

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="py-16 text-center text-sm text-zinc-400">読み込み中...</p>
        </PageShell>
      }
    >
      <TeamContent />
    </Suspense>
  );
}
