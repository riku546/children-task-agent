"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { shouldEnforceOnboarding } from "@/lib/onboarding";

let onboardingRequiredCache: boolean | null = null;

export function setOnboardingRequiredCache(required: boolean) {
  onboardingRequiredCache = required;
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get("from");
  const enforce = shouldEnforceOnboarding(pathname, from);
  const [ready, setReady] = useState(() => !enforce || onboardingRequiredCache === false);

  useEffect(() => {
    if (!enforce || onboardingRequiredCache === false) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    fetch("/api/me")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.onboardingRequired) {
          onboardingRequiredCache = true;
          router.replace("/onboarding");
          return;
        }
        onboardingRequiredCache = false;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enforce, pathname, router]);

  if (!enforce || ready) return children;

  return <p className="py-16 text-center text-sm text-zinc-400">読み込み中...</p>;
}
