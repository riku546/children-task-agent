"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavItems, isNavItemActive } from "@/lib/nav-items";

export function HeaderNav() {
  const pathname = usePathname();
  const isLandingOrLogin = pathname === "/" || pathname === "/login";

  if (isLandingOrLogin) {
    return (
      <nav className="hidden items-center gap-2 md:flex">
        <Link href="/dashboard" className="button-secondary text-xs">
          ホームへ
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {appNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`inline-flex items-center gap-1.5 border-b-2 px-2.5 pb-2 pt-1.5 text-sm transition ${
              isActive
                ? "border-zinc-900 font-semibold text-zinc-900"
                : "border-transparent font-medium text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Icon size={15} className={isActive ? "text-zinc-900" : "text-zinc-600"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
