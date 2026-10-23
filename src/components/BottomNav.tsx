"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavItems, isNavItemActive } from "@/lib/nav-items";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/onboarding") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-zinc-200/80 bg-white/95 px-2 py-2 backdrop-blur-md md:hidden">
      {appNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = isNavItemActive(pathname, item.href);
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
