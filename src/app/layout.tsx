import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { HeaderNav } from "@/components/HeaderNav";
import { UserNav } from "@/components/UserNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "育児タスクAI | 園・学校のお便りをパシャリ。TODOを家族でシェア",
  description:
    "園や学校からのお便り・プリントからAIがTODO・持ち物を自動抽出。きょうだい別管理と夫婦のチーム分担で育児負担を減らすWebアプリ。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-30 border-b border-ink/10 bg-cloud/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-normal">
                <span className="grid size-9 place-items-center rounded-md bg-ink text-white">
                  <ClipboardCheck size={19} />
                </span>
                <span>育児タスクAI</span>
              </Link>
              <div className="flex items-center gap-2">
                <HeaderNav />
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
