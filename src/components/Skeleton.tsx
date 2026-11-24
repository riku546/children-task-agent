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
    <LoadingRegion className="mt-6 space-y-6">
      <Skeleton className="h-6 w-16" />
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="size-5 shrink-0 rounded" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>
    </LoadingRegion>
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

export function SettingsSkeleton() {
  return (
    <LoadingRegion className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </LoadingRegion>
  );
}

export function ProfileSkeleton() {
  return (
    <LoadingRegion className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-40" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </LoadingRegion>
  );
}

export function TaskDetailSkeleton() {
  return (
    <LoadingRegion className="space-y-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </LoadingRegion>
  );
}

export function OnboardingSkeleton() {
  return (
    <LoadingRegion className="space-y-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </LoadingRegion>
  );
}

export function JoinPreviewSkeleton() {
  return (
    <LoadingRegion className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-11 w-full" />
    </LoadingRegion>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      <TaskRowsSkeleton />
    </div>
  );
}
