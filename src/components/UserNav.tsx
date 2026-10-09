"use client";

import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchJsonWithCache, getCachedData } from "@/lib/client-cache";

type UserData = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

export function UserNav() {
  const pathname = usePathname();
  const cached = getCachedData<{ user: UserData }>("/api/me");
  const [user, setUser] = useState<UserData | null>(cached?.user || null);
  const [loading, setLoading] = useState(!cached?.user);

  useEffect(() => {
    if (pathname === "/login") return;

    const currentCached = getCachedData<{ user: UserData }>("/api/me");
    if (currentCached?.user) {
      setUser(currentCached.user);
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchJsonWithCache<{ user: UserData }>("/api/me")
      .then((data) => {
        if (isMounted && data?.user) {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user in UserNav", err);
        if (isMounted) setLoading(false);
      });

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
