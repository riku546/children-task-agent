import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-md bg-zinc-200", className)} />;
}

function LoadingRegion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">読み込み中</span>
      {children}
    </div>
  );
}

export function TaskRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <LoadingRegion className="divide-y divide-zinc-100">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 py-3">
          <Skeleton className="size-5 shrink-0 rounded" />
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
        </div>
      ))}
    </LoadingRegion>
  );
}

const homeSectionTitles = ["今日", "今後", "完了済み"] as const;

export function HomeSectionsSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      {homeSectionTitles.map((title) => (
        <section key={title}>
          <div className="border-b border-zinc-200 pb-2">
            <h2 className="text-lg font-bold leading-none text-zinc-500">{title}</h2>
          </div>
          <TaskRowsSkeleton rows={title === "完了済み" ? 2 : 3} />
        </section>
      ))}
    </div>
  );
}

export function TeamBoardSkeleton() {
  return (
    <LoadingRegion className="mt-4 space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </LoadingRegion>
  );
}

export function GroupListSkeleton() {
  return (
    <LoadingRegion className="divide-y divide-zinc-200">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center justify-between py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function ListRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <LoadingRegion className="divide-y divide-zinc-200 border-t border-zinc-200">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="py-4">
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function ProfileFieldsSkeleton() {
  return (
    <LoadingRegion className="mt-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-700">お名前（表示名）</p>
        <Skeleton className="mt-1 h-9 w-full" />
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-700">メールアドレス</p>
        <Skeleton className="mt-1 h-9 w-full" />
      </div>
      <div className="border-t border-zinc-200 pt-8">
        <h2 className="text-sm font-bold text-zinc-900">参加中の家族グループ</h2>
        <div className="mt-3">
          <ListRowsSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function TaskDetailSkeleton() {
  return (
    <LoadingRegion className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-zinc-700">タスク名</p>
          <Skeleton className="mt-1.5 h-10 w-full" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-700">詳細・メモ</p>
          <Skeleton className="mt-1.5 h-32 w-full" />
        </div>
      </div>
      <div className="space-y-4 lg:border-l lg:border-zinc-200 lg:pl-6">
        <p className="text-sm font-semibold text-zinc-700">タスクの情報</p>
        {["ステータス", "種別", "期限日", "優先度", "対象の子ども", "現在の担当者"].map((label) => (
          <div key={label}>
            <p className="text-sm font-semibold text-zinc-700">{label}</p>
            <Skeleton className="mt-1 h-9 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function OnboardingChoicesSkeleton() {
  return (
    <LoadingRegion className="space-y-2">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </LoadingRegion>
  );
}

export function JoinPreviewSkeleton() {
  return (
    <LoadingRegion className="space-y-3">
      <p className="text-sm text-zinc-600">参加するグループ</p>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-11 w-full" />
    </LoadingRegion>
  );
}
