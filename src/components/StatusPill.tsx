import { clsx } from "clsx";
import { CalendarDays, CheckCircle2, Circle, Flag } from "lucide-react";
import { formatDateJa } from "@/lib/date";
import type { Priority, TaskStatus } from "@/lib/types";

export function PriorityPill({ priority }: { priority: Priority }) {
  const label = priority === "high" ? "高" : priority === "low" ? "低" : "中";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold border shadow-2xs",
        priority === "high" && "bg-rose-100 border-rose-400 text-rose-950",
        priority === "medium" && "bg-amber-100 border-amber-500 text-amber-950",
        priority === "low" && "bg-slate-200 border-slate-500 text-slate-950"
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
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold border shadow-2xs",
        isDone
          ? "bg-zinc-200 border-zinc-400 text-zinc-800"
          : "bg-emerald-100 border-emerald-500 text-emerald-950"
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
      <span className="inline-flex items-center gap-1 rounded border border-zinc-400 bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">
        期日未定
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-zinc-400 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-900 shadow-2xs">
      <CalendarDays size={12} className="text-zinc-700" />
      {formatDateJa(dueDate)}
    </span>
  );
}
