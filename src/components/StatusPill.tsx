import { clsx } from "clsx";
import { formatDateJa, isOverdue } from "@/lib/date";
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

export function DuePill({ dueDate, done = false }: { dueDate: string | null; done?: boolean }) {
  if (!dueDate) {
    return <span className="text-xs text-zinc-500">期日未定</span>;
  }
  if (!done && isOverdue(dueDate)) {
    return (
      <span className="text-xs font-medium text-rose-700">
        {formatDateJa(dueDate)}
        <span className="text-rose-600">（期限切れ）</span>
      </span>
    );
  }
  return <span className="text-xs text-zinc-700">{formatDateJa(dueDate)}</span>;
}
