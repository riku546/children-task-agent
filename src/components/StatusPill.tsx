import { clsx } from "clsx";
import { formatDateJa } from "@/lib/date";
import type { Priority, TaskStatus } from "@/lib/types";

export function PriorityPill({ priority }: { priority: Priority }) {
  if (priority !== "high") {
    return null;
  }
  return <span className="text-xs font-medium text-rose-700">優先</span>;
}

export function StatusPill({ status }: { status: TaskStatus }) {
  const isDone = status === "DONE";
  return (
    <span className={clsx("text-sm font-medium", isDone ? "text-zinc-500" : "text-emerald-800")}>
      {isDone ? "完了" : "未完了"}
    </span>
  );
}

export function DuePill({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) {
    return <span className="text-xs text-zinc-500">期日未定</span>;
  }
  return <span className="text-xs text-zinc-700">{formatDateJa(dueDate)}</span>;
}
