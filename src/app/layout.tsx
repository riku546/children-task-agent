import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Home, ListTodo, Users } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "育児事務AIエージェント",
  description: "連絡内容から家族で共有できるTODOを作るWeb MVP"
};

const navItems = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/tasks/new", label: "作成", icon: ClipboardCheck },
  { href: "/groups", label: "家族", icon: Users },
  { href: "/dashboard", label: "TODO", icon: ListTodo }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-30 border-b border-ink/10 bg-cloud/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-normal">
                <span className="grid size-9 place-items-center rounded-md bg-ink text-white">
                  <ClipboardCheck size={19} />
                </span>
                <span>育児タスクAI</span>
              </Link>
              <div className="flex items-center gap-2">
                <nav className="hidden items-center gap-1 md:flex">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href + item.label} href={item.href} className="button-secondary min-h-9 px-3">
                        <Icon size={17} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <UserNav />
              </div>
            </div>
          </header>
          <main>{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-ink/10 bg-cloud/95 px-3 py-2 backdrop-blur md:hidden">
            {navItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold">
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </body>
    </html>
  );
}
