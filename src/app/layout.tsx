import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { HeaderNav } from "@/components/HeaderNav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { PageSkeleton } from "@/components/Skeleton";
import { UserNav } from "@/components/UserNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Childcare Task Agent | お便りからTODOを自動分解する育児タスクSaaS",
  description:
    "園や学校のお便り・連絡をAIがTODOに自動構造化。きょうだい別レーンとチーム分担で育児負荷を軽減するモダンタスク管理ツール。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
                  育児タスクAI
                </Link>

                <HeaderNav />
              </div>

              <div className="flex items-center gap-3">
                <UserNav />
              </div>
            </div>
          </header>

          <main>
            <Suspense fallback={<PageSkeleton />}>
              <OnboardingGate>{children}</OnboardingGate>
            </Suspense>
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
