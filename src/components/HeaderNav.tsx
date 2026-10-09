"use client";

import { CheckSquare, Home, Layers, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const appNavItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: Home },
  { href: "/family", label: "チーム分担", icon: Users },
  { href: "/tasks/new", label: "スキャン・追加", icon: CheckSquare },
  { href: "/groups", label: "設定", icon: Layers }
];

export function HeaderNav() {
  const pathname = usePathname();
  const isLandingOrLogin = pathname === "/" || pathname === "/login";

  if (isLandingOrLogin) {
    return (
      <nav className="hidden items-center gap-2 md:flex">
        <Link href="/dashboard" className="button-secondary text-xs">
          ダッシュボードへ
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {appNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition ${
              isActive
                ? "bg-zinc-100 font-semibold text-zinc-900 shadow-2xs"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            <Icon size={14} className={isActive ? "text-zinc-900" : "text-zinc-400"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
