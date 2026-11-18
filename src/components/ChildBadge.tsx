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
  const textClass = size === "sm" ? "text-xs" : "text-sm";

  if (isWork) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium text-zinc-600 ${textClass}`}>
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
    <span className={`inline-flex items-center gap-1.5 font-medium text-zinc-700 ${textClass}`}>
      <span className={`size-2 shrink-0 rounded-full ${theme.dotColor}`} />
      <span className="max-w-full break-words">{name}</span>
    </span>
  );
}
