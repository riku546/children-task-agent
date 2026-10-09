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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold tracking-tight text-zinc-950 sm:text-lg">
            {currentMonthDate.getFullYear()}年 {currentMonthDate.getMonth() + 1}月
          </h2>
          <div className="flex items-center rounded border border-zinc-200 bg-zinc-100 p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="grid size-6 place-items-center rounded text-zinc-600 hover:bg-white hover:text-zinc-950 transition"
              title="前月"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="grid size-6 place-items-center rounded text-zinc-600 hover:bg-white hover:text-zinc-950 transition"
              title="翌月"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
          >
            今月
          </button>
        </div>

        {/* きょうだい・仕事フィルター */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-zinc-500">
            <Filter size={12} />
            表示:
          </span>
          <button
            type="button"
            onClick={() => setSelectedChild("all")}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
              selectedChild === "all"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
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
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                  isSelected
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span className={`size-1.5 rounded-full ${theme.dotColor}`} />
                <span>{name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedChild("work")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
              selectedChild === "work"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <Briefcase size={11} />
            仕事
          </button>
        </div>
      </div>

      {/* カレンダーグリッド本体 */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xs">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-xs font-medium text-zinc-500">
          <span className="py-2 text-rose-600 font-semibold">日</span>
          <span className="py-2">月</span>
          <span className="py-2">火</span>
          <span className="py-2">水</span>
          <span className="py-2">木</span>
          <span className="py-2">金</span>
          <span className="py-2 text-sky-600 font-semibold">土</span>
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200">
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
                  !day.isCurrentMonth
                    ? "bg-zinc-50/40 text-zinc-300"
                    : "bg-white hover:bg-zinc-50/70"
                } ${isSelected ? "ring-2 ring-emerald-500 ring-inset bg-emerald-50/20" : ""}`}
              >
                {/* 日付ヘッダー */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-grid size-5 place-items-center rounded-full text-xs font-semibold ${
                      day.isToday
                        ? "bg-zinc-950 text-white font-bold"
                        : dayOfWeek === 0
                          ? "text-rose-600"
                          : dayOfWeek === 6
                            ? "text-sky-600"
                            : "text-zinc-700"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {/* 重複・衝突アイコン */}
                  {hasConflict && (
                    <span
                      className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                      title="予定の重複・衝突あり"
                    >
                      <AlertTriangle size={10} className="text-amber-600" />
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
                        className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${theme.badgeBg} ${theme.badgeText} ${
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
                    <p className="text-[10px] font-semibold text-zinc-400 pl-1">
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
        <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                選択した日
              </p>
              <h3 className="text-sm font-bold text-zinc-950">{formatDateJa(selectedDate)}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/tasks/new?date=${selectedDate}`} className="button-primary text-xs">
                <Plus size={13} />
                <span>この日にTODOを追加</span>
              </Link>
              <button
                type="button"
                onClick={() => handleDateClick(selectedDate)}
                className="button-secondary text-xs"
              >
                閉じる
              </button>
            </div>
          </div>

          <div className="mt-3">
            {selectedDateTasks.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">この日のタスクはありません</p>
            ) : (
              <div className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
                {selectedDateTasks.map((task) => {
                  const isWork = isWorkTask(task);
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="group flex items-center justify-between p-3 transition hover:bg-zinc-50/70 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChildBadge name={task.childName} isWork={isWork} size="sm" />
                        <span
                          className={`font-semibold text-zinc-900 group-hover:text-emerald-700 transition truncate ${
                            task.status === "DONE" ? "line-through text-zinc-400" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] text-zinc-400">
                        {task.assigneeName ? `担当: ${task.assigneeName}` : "担当未定"}
                      </span>
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
