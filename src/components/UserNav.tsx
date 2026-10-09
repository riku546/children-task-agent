"use client";

import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type UserData = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

// モジュールレベルキャッシュ（ページ遷移をまたいで再利用）
let cachedUser: UserData | null = null;
let fetchPromise: Promise<UserData | null> | null = null;

async function getCachedUser(): Promise<UserData | null> {
  if (cachedUser) return cachedUser;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        cachedUser = data.user ?? null;
        return cachedUser;
      }
    } catch (e) {
      console.error("Failed to fetch user in UserNav", e);
    } finally {
      fetchPromise = null;
    }
    return null;
  })();

  return fetchPromise;
}

export function UserNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    if (pathname === "/login") return;

    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedUser().then((userData) => {
      if (isMounted) {
        setUser(userData);
        setLoading(false);
      }
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
