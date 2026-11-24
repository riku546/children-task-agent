"use client";

import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/Skeleton";
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 transition hover:border-zinc-300 focus-ring"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${displayName}のメニュー`}
        onClick={() => setOpen((current) => !current)}
      >
        {user?.image ? (
          <img
            src={user.image}
            alt=""
            className="size-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className={`grid size-7 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 ${
              loading ? "animate-pulse" : ""
            }`}
          >
            {loading ? null : initial || <CircleUserRound size={16} />}
          </span>
        )}
        <span className="hidden pr-2 text-xs font-medium text-zinc-700 group-hover:text-zinc-900 md:inline">
          {loading ? <Skeleton className="h-3 w-14" /> : displayName}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href="/profile"
            className="block px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            onClick={() => setOpen(false)}
          >
            プロフィール
          </Link>
          <Link
            role="menuitem"
            href="/groups"
            className="block px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            onClick={() => setOpen(false)}
          >
            家族の設定
          </Link>
        </div>
      ) : null}
    </div>
  );
}
