import type { LucideIcon } from "lucide-react";
import { Camera, Home, MessageCircle, Users } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const appNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/tasks/new", label: "取込", icon: Camera },
  { href: "/chat", label: "チャット", icon: MessageCircle },
  { href: "/groups", label: "家族", icon: Users }
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/team";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
