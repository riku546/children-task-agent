"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";

type UserData = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

export function UserNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchUser() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setUser(data.user);
        }
      } catch (e) {
        console.error("Failed to fetch user in UserNav", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (pathname !== "/login") {
      fetchUser();
    }
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  if (pathname === "/login") {
    return null;
  }

  const displayName = user?.name || "ユーザー";
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <Link
      href="/profile"
      className="group relative flex items-center gap-2 rounded-full border border-ink/15 bg-white p-1 transition hover:border-moss hover:shadow-sm focus-ring"
      title={`${displayName} の設定・プロフィール`}
    >
      {user?.image ? (
        <img
          src={user.image}
          alt={displayName}
          className="size-8 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-mint text-xs font-bold text-moss">
          {initial || <CircleUserRound size={18} />}
        </span>
      )}
      <span className="hidden pr-2 text-xs font-semibold text-ink/80 group-hover:text-ink md:inline">
        {loading ? "..." : displayName}
      </span>
    </Link>
  );
}
