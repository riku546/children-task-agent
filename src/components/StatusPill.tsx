import { clsx } from "clsx";
import { CalendarDays, CheckCircle2, Circle, Flag } from "lucide-react";
import { formatDateJa } from "@/lib/date";
import type { Priority, TaskStatus } from "@/lib/types";

export function PriorityPill({ priority }: { priority: Priority }) {
  const label = priority === "high" ? "高" : priority === "low" ? "低" : "中";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border shadow-2xs",
        priority === "high" && "bg-rose-50 border-rose-200 text-rose-700",
        priority === "medium" && "bg-amber-50 border-amber-200 text-amber-700",
        priority === "low" && "bg-zinc-50 border-zinc-200 text-zinc-600"
      )}
    >
      <Flag size={11} />
      {label}
    </span>
  );
}

export function StatusPill({ status }: { status: TaskStatus }) {
  const isDone = status === "DONE";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border shadow-2xs",
        isDone
          ? "bg-zinc-100 border-zinc-200 text-zinc-600"
          : "bg-emerald-50 border-emerald-200 text-emerald-700"
      )}
    >
      {isDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
      {isDone ? "完了" : "未完了"}
    </span>
  );
}

export function DuePill({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-zinc-50 border border-zinc-200/60 px-2 py-0.5 text-xs font-mono text-zinc-400">
        期日未定
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 text-xs font-mono text-zinc-600 shadow-2xs">
      <CalendarDays size={12} className="text-zinc-400" />
      {formatDateJa(dueDate)}
    </span>
  );
}
