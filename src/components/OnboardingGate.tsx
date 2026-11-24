"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect } from "react";
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

  useEffect(() => {
    if (!enforce) return;
    if (onboardingRequiredCache === true) {
      router.replace("/onboarding");
      return;
    }
    if (onboardingRequiredCache === false) return;

    let cancelled = false;
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
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enforce, pathname, router]);

  return children;
}
