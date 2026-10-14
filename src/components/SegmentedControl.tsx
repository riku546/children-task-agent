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
      className={`flex max-w-full items-center overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 ${className}`}
    >
      {segments.map((segment) => {
        const Icon = segment.icon;
        const isActive = value === segment.id;
        return (
          <button
            key={segment.id}
            type="button"
            onClick={() => onChange(segment.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              isActive ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
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
