"use client";

import { CheckSquare, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "タスク管理", icon: CheckSquare },
  { href: "/tasks/new", label: "お便り取込", icon: Sparkles },
  { href: "/groups", label: "家族・グループ", icon: Users }
];

export function BottomNav() {
  const pathname = usePathname();

  // LPトップとログイン画面ではボトムナビを非表示
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-zinc-200/80 bg-white/95 px-2 py-2 backdrop-blur-md md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-xs transition ${
              isActive ? "font-bold text-zinc-950" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Icon size={18} className={isActive ? "text-zinc-950" : "text-zinc-400"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
