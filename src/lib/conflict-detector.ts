import { formatDateJa, toDateInputValue } from "@/lib/date";
import type { TaskRecord } from "@/lib/types";

export type SiblingConflict = {
  dateKey: string;
  formattedDate: string;
  tasks: TaskRecord[];
  childNames: string[];
  summary: string;
};

export type WorkConflict = {
  dateKey: string;
  formattedDate: string;
  workTasks: TaskRecord[];
  childcareTasks: TaskRecord[];
  summary: string;
};

export type ConflictAnalysisResult = {
  siblingConflicts: SiblingConflict[];
  workConflicts: WorkConflict[];
  hasAnyConflict: boolean;
};

/**
 * タスクが仕事・勤務に関連するものか判定
 */
export function isWorkTask(task: TaskRecord): boolean {
  const typeLower = (task.type || "").toLowerCase();
  const titleLower = (task.title || "").toLowerCase();
  return (
    typeLower === "work" ||
    typeLower === "仕事" ||
    typeLower === "勤務" ||
    titleLower.includes("出張") ||
    titleLower.includes("残業") ||
    titleLower.includes("会議") ||
    titleLower.includes("夜勤") ||
    titleLower.includes("当直")
  );
}

/**
 * きょうだいの予定重複（機能2）および仕事と子育ての予定衝突（機能4）を検出
 */
export function detectAllConflicts(tasks: TaskRecord[]): ConflictAnalysisResult {
  // 未完了かつ期限が設定されているタスクを日付ごとにグループ化
  const tasksByDate = new Map<string, TaskRecord[]>();

  for (const task of tasks) {
    if (task.status === "DONE" || !task.dueDate) continue;

    const dateKey = toDateInputValue(task.dueDate);
    if (!dateKey) continue;

    const existing = tasksByDate.get(dateKey) || [];
    existing.push(task);
    tasksByDate.set(dateKey, existing);
  }

  const siblingConflicts: SiblingConflict[] = [];
  const workConflicts: WorkConflict[] = [];

  // 日付順にソート
  const sortedDates = Array.from(tasksByDate.keys()).sort();

  for (const dateKey of sortedDates) {
    const dayTasks = tasksByDate.get(dateKey) || [];
    const formattedDate = formatDateJa(dateKey);

    // 1. 仕事タスクと育児タスクの分離
    const workList: TaskRecord[] = [];
    const childcareList: TaskRecord[] = [];

    for (const task of dayTasks) {
      if (isWorkTask(task)) {
        workList.push(task);
      } else {
        childcareList.push(task);
      }
    }

    // 機能4: 仕事と子育ての予定衝突の判定
    if (workList.length > 0 && childcareList.length > 0) {
      const workTitles = workList.map((t) => t.title).join(", ");
      const childNames = Array.from(
        new Set(childcareList.map((t) => t.childName || "子ども").filter(Boolean))
      );
      const childInfo = childNames.length > 0 ? `（${childNames.join("・")}）` : "";

      workConflicts.push({
        dateKey,
        formattedDate,
        workTasks: workList,
        childcareTasks: childcareList,
        summary: `【仕事】${workTitles} と 【育児${childInfo}】${childcareList.length}件の予定が衝突しています`
      });
    }

    // 機能2: きょうだいの予定・提出期限の重複判定
    // 異なる子どものタスクが同日に存在するか、または同日に2件以上の育児タスクが存在する場合
    const distinctChildNames = Array.from(
      new Set(
        childcareList
          .map((t) => t.childName?.trim())
          .filter((name): name is string => Boolean(name && name.length > 0))
      )
    );

    if (distinctChildNames.length >= 2) {
      siblingConflicts.push({
        dateKey,
        formattedDate,
        tasks: childcareList,
        childNames: distinctChildNames,
        summary: `${distinctChildNames.join(" と ")} の予定・提出期限が同日に重なっています`
      });
    } else if (childcareList.length >= 2 && distinctChildNames.length === 1) {
      // 同じ子どもでも同日に2件以上の行事・提出物がある場合も注意として含める
      siblingConflicts.push({
        dateKey,
        formattedDate,
        tasks: childcareList,
        childNames: distinctChildNames,
        summary: `${distinctChildNames[0]} の予定・提出期限が同日に${childcareList.length}件重なっています`
      });
    }
  }

  return {
    siblingConflicts,
    workConflicts,
    hasAnyConflict: siblingConflicts.length > 0 || workConflicts.length > 0
  };
}
