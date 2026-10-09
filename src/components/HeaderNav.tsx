"use client";

import { ClipboardCheck, Home, ListTodo, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const appNavItems = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/family", label: "家族の分担", icon: Users },
  { href: "/tasks/new", label: "作成", icon: ClipboardCheck },
  { href: "/groups", label: "グループ", icon: ListTodo }
];

export function HeaderNav() {
  const pathname = usePathname();
  const isLandingOrLogin = pathname === "/" || pathname === "/login";

  if (isLandingOrLogin) {
    return (
      <nav className="hidden items-center gap-2 md:flex">
        <Link href="/dashboard" className="button-secondary min-h-9 px-3 text-xs font-bold">
          ダッシュボードを開く
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
            className={`min-h-9 px-3 text-xs font-bold transition rounded-lg inline-flex items-center gap-1.5 ${
              isActive
                ? "bg-moss text-white shadow-2xs"
                : "button-secondary text-ink/75 hover:text-ink"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
