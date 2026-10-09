"use client";

import { Briefcase } from "lucide-react";
import { getChildTheme } from "@/lib/child-theme";

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
        className={`inline-flex items-center gap-1 rounded font-medium border border-zinc-200 bg-zinc-100 text-zinc-700 shadow-2xs ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
        }`}
      >
        {showIcon && <Briefcase size={size === "sm" ? 11 : 13} />}
        <span>仕事</span>
      </span>
    );
  }

  if (!name?.trim() || name.trim() === "未設定") {
    return null;
  }

  const theme = getChildTheme(name);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium border ${theme.border} ${theme.badgeBg} ${theme.badgeText} shadow-2xs ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      <span className={`size-1.5 rounded-full ${theme.dotColor}`} />
      <span>{name}</span>
    </span>
  );
}
