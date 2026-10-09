"use client";

import { ClipboardCheck, Home, ListTodo, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/family", label: "家族の分担", icon: Users },
  { href: "/tasks/new", label: "作成", icon: ClipboardCheck },
  { href: "/groups", label: "グループ", icon: ListTodo }
];

export function BottomNav() {
  const pathname = usePathname();

  // LPトップとログイン画面ではボトムナビを非表示
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-200/80 bg-white/95 px-2 py-2 backdrop-blur-md md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-xs transition ${
              isActive ? "text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
