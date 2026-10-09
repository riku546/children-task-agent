"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FamilyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?view=assignee");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-zinc-500">
      <Loader2 className="mb-2 animate-spin text-zinc-400" size={24} />
      <p className="text-xs">タスク管理（担当者別）へ移動しています...</p>
    </div>
  );
}
