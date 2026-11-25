"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { JoinPreviewSkeleton } from "@/components/Skeleton";
import { invalidateCache } from "@/lib/client-cache";

type Preview = {
  groupId: string;
  groupName: string;
  alreadyMember: boolean;
  expiresAt: string;
};

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("招待リンクが正しくありません。URLに token が含まれているか確認してください。");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/groups/join?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "招待リンクを確認できませんでした");
        }
        return data.preview as Preview;
      })
      .then((nextPreview) => {
        if (!cancelled) setPreview(nextPreview);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "招待リンクを確認できませんでした");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function join() {
    if (!token || joining) return;
    setJoining(true);
    setError("");
    try {
      const response = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "グループに参加できませんでした");
      }
      invalidateCache("/api/me");
      invalidateCache("/api/groups");
      invalidateCache("/api/tasks");
      setJoined(true);
      router.push("/dashboard");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "グループに参加できませんでした");
    } finally {
      setJoining(false);
    }
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="家族グループに参加"
        description="招待リンクのトークンを確認して、このグループのTODOを共有します"
      />

      <div className="mt-6 space-y-4 border-t border-zinc-200 pt-6">
        {loading ? <JoinPreviewSkeleton /> : null}

        {error ? (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-950">
            {error}
          </div>
        ) : null}

        {preview && !error ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-600">参加するグループ</p>
              <h2 className="break-words text-xl font-bold text-zinc-950">{preview.groupName}</h2>
            </div>

            {preview.alreadyMember || joined ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-950">
                すでにこのグループのメンバーです。ホームで共有TODOを確認できます。
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-zinc-800">
                参加すると、このグループの提出物・持ち物・行事のTODOを家族と一緒に見られます。
              </p>
            )}

            {preview.alreadyMember || joined ? (
              <Link href="/dashboard" className="button-primary min-h-11 w-full">
                ホームへ進む
              </Link>
            ) : (
              <button
                type="button"
                className="button-primary min-h-11 w-full"
                onClick={join}
                disabled={joining}
              >
                {joining ? <Loader2 size={16} className="animate-spin" /> : null}
                このグループに参加する
              </button>
            )}
          </div>
        ) : null}

        {!loading && error ? (
          <Link href="/groups" className="button-secondary mt-4 min-h-11 w-full">
            グループ一覧へ
          </Link>
        ) : null}
      </div>
    </PageShell>
  );
}

export default function JoinGroupPage() {
  return (
    <Suspense
      fallback={
        <PageShell width="narrow">
          <JoinPreviewSkeleton />
        </PageShell>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
