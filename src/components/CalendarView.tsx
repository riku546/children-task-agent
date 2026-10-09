"use client";

import { AlertTriangle, Briefcase, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChildBadge } from "@/components/ChildBadge";
import { getChildTheme, WORK_THEME } from "@/lib/child-theme";
import { type ConflictAnalysisResult, isWorkTask } from "@/lib/conflict-detector";
import { formatDateJa, toDateInputValue } from "@/lib/date";
import type { TaskRecord } from "@/lib/types";

type Props = {
  tasks: TaskRecord[];
  conflicts: ConflictAnalysisResult;
  selectedDate?: string | null;
  onSelectDate?: (dateKey: string | null) => void;
};

export function CalendarView({
  tasks,
  conflicts,
  selectedDate: controlledSelectedDate,
  onSelectDate
}: Props) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>("all");

  const selectedDate =
    controlledSelectedDate !== undefined ? controlledSelectedDate : internalSelectedDate;

  // 子ども名一覧を取得
  const allChildren = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.childName?.trim()) {
        set.add(t.childName.trim());
      }
    }
    return Array.from(set);
  }, [tasks]);

  // 重複・衝突がある日付キーのセット
  const conflictDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const sc of conflicts.siblingConflicts) keys.add(sc.dateKey);
    for (const wc of conflicts.workConflicts) keys.add(wc.dateKey);
    return keys;
  }, [conflicts]);

  // タスクを日付ごとにマップ
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = toDateInputValue(task.dueDate);
      if (!key) continue;

      if (selectedChild !== "all") {
        if (selectedChild === "work") {
          if (!isWorkTask(task)) continue;
        } else if (task.childName !== selectedChild) {
          continue;
        }
      }

      const list = map.get(key) || [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks, selectedChild]);

  // カレンダーグリッドの日付配列（6週間分）
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0: 日曜
    const startDate = new Date(year, month, 1 - startDayOfWeek);

    const days: {
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const todayKey = toDateInputValue(new Date());

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const dateKey = toDateInputValue(d);
      days.push({
        date: d,
        dateKey,
        isCurrentMonth: d.getMonth() === month,
        isToday: dateKey === todayKey
      });
    }
    return days;
  }, [currentMonthDate]);

  function prevMonth() {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    );
  }

  function goToday() {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    handleDateClick(toDateInputValue(now));
  }

  function handleDateClick(dateKey: string) {
    if (onSelectDate) {
      onSelectDate(dateKey === selectedDate ? null : dateKey);
    } else {
      setInternalSelectedDate(dateKey === selectedDate ? null : dateKey);
    }
  }

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((t) => t.dueDate && toDateInputValue(t.dueDate) === selectedDate);
  }, [tasks, selectedDate]);

  return (
    <div className="space-y-4">
      {/* カレンダー上部ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-ink">
            {currentMonthDate.getFullYear()}年 {currentMonthDate.getMonth() + 1}月
          </h2>
          <div className="flex items-center rounded-lg border border-ink/15 bg-cloud p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="grid size-7 place-items-center rounded text-ink/70 hover:bg-white hover:text-ink"
              title="前月"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="grid size-7 place-items-center rounded text-ink/70 hover:bg-white hover:text-ink"
              title="翌月"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs font-bold text-ink hover:bg-cloud"
          >
            今月
          </button>
        </div>

        {/* きょうだい・仕事フィルター */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-bold text-ink/60">
            <Filter size={13} />
            表示:
          </span>
          <button
            type="button"
            onClick={() => setSelectedChild("all")}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
              selectedChild === "all"
                ? "bg-moss text-white shadow-xs"
                : "border border-ink/15 bg-white text-ink/70 hover:bg-cloud"
            }`}
          >
            全員
          </button>
          {allChildren.map((name) => {
            const theme = getChildTheme(name);
            const isSelected = selectedChild === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedChild(name)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  isSelected
                    ? `${theme.badgeBg} ${theme.badgeText} border ${theme.border} ring-2 ring-moss/30`
                    : "border border-ink/15 bg-white text-ink/70 hover:bg-cloud"
                }`}
              >
                <span className={`size-1.5 rounded-full ${theme.dotColor}`} />
                {name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedChild("work")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
              selectedChild === "work"
                ? "bg-slate-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Briefcase size={12} />
            仕事
          </button>
        </div>
      </div>

      {/* カレンダーグリッド本体 */}
      <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-xs">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-ink/10 bg-cloud text-center text-xs font-bold text-ink/70">
          <span className="py-2 text-rose-600">日</span>
          <span className="py-2">月</span>
          <span className="py-2">火</span>
          <span className="py-2">水</span>
          <span className="py-2">木</span>
          <span className="py-2">金</span>
          <span className="py-2 text-sky-600">土</span>
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7 divide-x divide-y divide-ink/10">
          {calendarDays.map((day, _idx) => {
            const dayTasks = tasksByDate.get(day.dateKey) || [];
            const hasConflict = conflictDateKeys.has(day.dateKey);
            const isSelected = selectedDate === day.dateKey;
            const dayOfWeek = day.date.getDay();

            return (
              <button
                type="button"
                key={day.dateKey}
                onClick={() => handleDateClick(day.dateKey)}
                className={`group relative min-h-[96px] p-1.5 transition text-left cursor-pointer md:min-h-[110px] ${
                  !day.isCurrentMonth ? "bg-cloud/40 text-ink/30" : "bg-white hover:bg-cloud/50"
                } ${isSelected ? "ring-2 ring-moss ring-inset bg-mint/10" : ""}`}
              >
                {/* 日付ヘッダー */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-grid size-6 place-items-center rounded-full text-xs font-bold ${
                      day.isToday
                        ? "bg-moss text-white shadow-xs"
                        : dayOfWeek === 0
                          ? "text-rose-600"
                          : dayOfWeek === 6
                            ? "text-sky-600"
                            : "text-ink/80"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {/* 重複・衝突アイコン */}
                  {hasConflict && (
                    <span
                      className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800"
                      title="予定の重複・衝突あり"
                    >
                      <AlertTriangle size={11} className="text-amber-600" />
                      <span className="hidden md:inline">重複</span>
                    </span>
                  )}
                </div>

                {/* タスク一覧（子ども色分けバッジ付き） */}
                <div className="mt-1 space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const isWork = isWorkTask(task);
                    const theme = isWork ? WORK_THEME : getChildTheme(task.childName);

                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-semibold ${theme.badgeBg} ${theme.badgeText} ${
                          task.status === "DONE" ? "line-through opacity-50" : ""
                        }`}
                        title={`${task.childName ? `[${task.childName}] ` : ""}${task.title}`}
                      >
                        <span className={`size-1.5 shrink-0 rounded-full ${theme.dotColor}`} />
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] font-bold text-ink/50 pl-1">
                      +{dayTasks.length - 3} 件
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択した日の詳細パネル（展開時） */}
      {selectedDate && (
        <section className="rounded-xl border border-moss/30 bg-mint/10 p-4 shadow-sm animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-moss/20 pb-3">
            <div>
              <p className="text-xs font-bold text-moss uppercase tracking-wider">選択した日</p>
              <h3 className="text-lg font-black text-ink">{formatDateJa(selectedDate)}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/tasks/new?date=${selectedDate}`}
                className="button-primary text-xs py-1.5 px-3"
              >
                <Plus size={14} />
                この日にTODOを追加
              </Link>
              <button
                type="button"
                onClick={() => handleDateClick(selectedDate)}
                className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs font-bold text-ink/70 hover:bg-cloud"
              >
                閉じる
              </button>
            </div>
          </div>

          <div className="mt-3">
            {selectedDateTasks.length === 0 ? (
              <p className="py-4 text-center text-xs font-semibold text-ink/50">
                この日のタスクはありません
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {selectedDateTasks.map((task) => {
                  const isWork = isWorkTask(task);
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="group block rounded-lg border border-ink/10 bg-white p-3 shadow-2xs transition hover:border-moss hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <ChildBadge name={task.childName} isWork={isWork} size="sm" />
                        <span className="text-[11px] font-semibold text-ink/50">
                          {task.assigneeName ? `担当: ${task.assigneeName}` : "担当未定"}
                        </span>
                      </div>
                      <p
                        className={`mt-2 font-bold text-ink group-hover:text-moss ${
                          task.status === "DONE" ? "line-through opacity-50" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-ink/60">{task.description}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
