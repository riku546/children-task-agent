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

  if (!loading && !user) {
    return (
      <Link href="/login" className="button-primary min-h-9 px-3.5 text-xs font-bold">
        ログイン
      </Link>
    );
  }

  const displayName = user?.name || "ユーザー";
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <Link
      href="/profile"
      className="group relative flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 transition hover:border-zinc-300 hover:shadow-2xs focus-ring"
      title={`${displayName} の設定・プロフィール`}
    >
      {user?.image ? (
        <img
          src={user.image}
          alt={displayName}
          className="size-7 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
          {initial || <CircleUserRound size={16} />}
        </span>
      )}
      <span className="hidden pr-2 text-xs font-medium text-zinc-700 group-hover:text-zinc-900 md:inline">
        {loading ? "..." : displayName}
      </span>
    </Link>
  );
}
