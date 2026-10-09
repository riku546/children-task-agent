"use client";

import { Baby, Briefcase } from "lucide-react";
import { DEFAULT_THEME, getChildTheme, WORK_THEME } from "@/lib/child-theme";

type Props = {
  name?: string | null;
  isWork?: boolean;
  size?: "sm" | "md";
  showIcon?: boolean;
};

export function ChildBadge({ name, isWork = false, size = "sm", showIcon = true }: Props) {
  if (isWork) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold ${WORK_THEME.badgeBg} ${WORK_THEME.badgeText} ${WORK_THEME.border} border ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
        }`}
      >
        {showIcon && <Briefcase size={size === "sm" ? 12 : 14} />}
        <span>仕事・勤務</span>
      </span>
    );
  }

  if (!name?.trim()) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium ${DEFAULT_THEME.badgeBg} ${DEFAULT_THEME.badgeText} ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
        }`}
      >
        {showIcon && <Baby size={size === "sm" ? 12 : 14} />}
        <span>子ども</span>
      </span>
    );
  }

  const theme = getChildTheme(name);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${theme.badgeBg} ${theme.badgeText} border ${theme.border} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      <span className={`size-1.5 rounded-full ${theme.dotColor}`} />
      <span>{name}</span>
    </span>
  );
}
