import { ArrowRight, CheckCircle2, UserRound } from "lucide-react";
import Link from "next/link";
import { DuePill, PriorityPill, StatusPill } from "@/components/StatusPill";
import type { TaskRecord } from "@/lib/types";

export function TaskList({ tasks, emptyText }: { tasks: TaskRecord[]; emptyText: string }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink/20 bg-white/70 px-4 py-8 text-center text-sm text-ink/60">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/tasks/${task.id}`}
          className="group rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-moss hover:shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={task.status} />
                <DuePill dueDate={task.dueDate} />
                <PriorityPill priority={task.priority} />
              </div>
              <h3 className="mt-3 text-base font-bold leading-snug text-ink">{task.title}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink/65">
                <span>{task.type}</span>
                <span className="inline-flex items-center gap-1">
                  <UserRound size={15} />
                  {task.assigneeName || "担当未設定"}
                </span>
                <span>{task.childName || "対象未設定"}</span>
              </div>
            </div>
            {task.status === "DONE" ? (
              <CheckCircle2 className="shrink-0 text-moss" size={22} />
            ) : (
              <ArrowRight
                className="shrink-0 text-ink/35 transition group-hover:text-moss"
                size={22}
              />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
