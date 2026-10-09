import { clsx } from "clsx";
import { CalendarDays, CheckCircle2, Circle, Flag } from "lucide-react";
import { formatDateJa } from "@/lib/date";
import type { Priority, TaskStatus } from "@/lib/types";

export function PriorityPill({ priority }: { priority: Priority }) {
  const label = priority === "high" ? "高" : priority === "low" ? "低" : "中";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
        priority === "high" && "bg-coral/15 text-[#9f3f34]",
        priority === "medium" && "bg-butter/25 text-[#786126]",
        priority === "low" && "bg-mint text-moss"
      )}
    >
      <Flag size={13} />
      {label}
    </span>
  );
}

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
        status === "DONE" ? "bg-mint text-moss" : "bg-white text-ink"
      )}
    >
      {status === "DONE" ? <CheckCircle2 size={13} /> : <Circle size={13} />}
      {status === "DONE" ? "完了" : "未完了"}
    </span>
  );
}

export function DuePill({ dueDate }: { dueDate: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink">
      <CalendarDays size={13} />
      {formatDateJa(dueDate)}
    </span>
  );
}
