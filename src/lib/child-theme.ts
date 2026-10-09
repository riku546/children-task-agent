// 子ども・タスク種別ごとのカラーテーマ管理

export type ColorTheme = {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  accentBg: string;
};

const CHILD_COLOR_PALETTES: ColorTheme[] = [
  {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
    dotColor: "bg-rose-500",
    accentBg: "bg-rose-500"
  },
  {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    dotColor: "bg-sky-500",
    accentBg: "bg-sky-500"
  },
  {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    dotColor: "bg-emerald-500",
    accentBg: "bg-emerald-500"
  },
  {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-800",
    dotColor: "bg-violet-500",
    accentBg: "bg-violet-500"
  },
  {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    dotColor: "bg-amber-500",
    accentBg: "bg-amber-500"
  },
  {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-800",
    dotColor: "bg-teal-500",
    accentBg: "bg-teal-500"
  }
];

// 仕事（WORK）予定専用のカラー
export const WORK_THEME: ColorTheme = {
  bg: "bg-slate-50",
  text: "text-slate-700",
  border: "border-slate-300",
  badgeBg: "bg-slate-200",
  badgeText: "text-slate-800",
  dotColor: "bg-slate-600",
  accentBg: "bg-slate-700"
};

// 子ども未設定用のデフォルトカラー
export const DEFAULT_THEME: ColorTheme = {
  bg: "bg-cloud",
  text: "text-ink/80",
  border: "border-ink/15",
  badgeBg: "bg-ink/10",
  badgeText: "text-ink/80",
  dotColor: "bg-ink/40",
  accentBg: "bg-ink/60"
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 子どもの名前またはIDから安定した固有カラーテーマを取得
 */
export function getChildTheme(identifier?: string | null): ColorTheme {
  if (!identifier?.trim()) {
    return DEFAULT_THEME;
  }
  const index = hashString(identifier.trim()) % CHILD_COLOR_PALETTES.length;
  return CHILD_COLOR_PALETTES[index];
}
