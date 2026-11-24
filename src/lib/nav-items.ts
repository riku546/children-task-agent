import type { LucideIcon } from "lucide-react";
import { Home, MessageCircle } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const appNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/chat", label: "チャット", icon: MessageCircle }
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/team" || pathname === "/family";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
