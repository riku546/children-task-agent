"use client";

import type { LucideIcon } from "lucide-react";

export type SegmentOption<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  segments: SegmentOption<T>[];
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  className = ""
}: Props<T>) {
  return (
    <div
      className={`flex max-w-full items-center gap-1 overflow-x-auto border-b border-zinc-200 ${className}`}
      role="tablist"
    >
      {segments.map((segment) => {
        const Icon = segment.icon;
        const isActive = value === segment.id;
        return (
          <button
            key={segment.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(segment.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition -mb-px ${
              isActive
                ? "border-zinc-900 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {Icon ? <Icon size={15} /> : null}
            <span>{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
