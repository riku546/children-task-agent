import { Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { HeaderNav } from "@/components/HeaderNav";
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
          <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2.5 group">
                  <span className="grid size-7 place-items-center rounded-md bg-zinc-900 text-white shadow-2xs transition group-hover:bg-zinc-800">
                    <Layers size={15} />
                  </span>
                  <span className="text-sm font-bold tracking-tight text-zinc-900">
                    育児タスクAI
                  </span>
                  <span className="hidden sm:inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                    Beta
                  </span>
                </Link>

                <HeaderNav />
              </div>

              <div className="flex items-center gap-3">
                <UserNav />
              </div>
            </div>
          </header>

          <main>{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
