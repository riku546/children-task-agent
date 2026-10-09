"use client";

import { CheckSquare, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const appNavItems = [
  { href: "/dashboard", label: "タスク管理", icon: CheckSquare },
  { href: "/tasks/new", label: "お便り取込", icon: Sparkles },
  { href: "/groups", label: "家族・グループ", icon: Users }
];

export function HeaderNav() {
  const pathname = usePathname();
  const isLandingOrLogin = pathname === "/" || pathname === "/login";

  if (isLandingOrLogin) {
    return (
      <nav className="hidden items-center gap-2 md:flex">
        <Link href="/dashboard" className="button-secondary text-xs">
          タスク管理へ
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {appNavItems.map((item) => {
        const Icon = item.icon;
        // /dashboard または /tasks/* などでパスの先頭一致または完全一致を判定
        const isActive =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
