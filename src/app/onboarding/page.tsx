"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { setOnboardingRequiredCache } from "@/components/OnboardingGate";
import { PageShell } from "@/components/PageShell";
import { invalidateCache } from "@/lib/client-cache";
import { hasNamedChild } from "@/lib/onboarding";
import type { GroupRecord } from "@/lib/types";

const ONBOARDING_ACTIVE_KEY = "onboarding-active";

const steps = [
  { id: 1, label: "グループ" },
  { id: 2, label: "子ども" },
  { id: 3, label: "読み取り" },
  { id: 4, label: "TODO" }
];

function namedChildrenOf(group: GroupRecord | undefined) {
  return (group?.children || []).filter((child) => {
    const name = child.name.trim();
    return name.length > 0 && name !== "未設定";
  });
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStep = Number(searchParams.get("step") || "1");
  const [step, setStep] = useState(requestedStep >= 1 && requestedStep <= 4 ? requestedStep : 1);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [childName, setChildName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login?next=/onboarding");
          return null;
        }
        if (!response.ok) throw new Error("failed");
        return response.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        const active = window.sessionStorage.getItem(ONBOARDING_ACTIVE_KEY) === "1";
        if (!data.onboardingRequired && !active) {
          setOnboardingRequiredCache(false);
          router.replace("/dashboard");
          return;
        }
        if (data.onboardingRequired) {
          window.sessionStorage.setItem(ONBOARDING_ACTIVE_KEY, "1");
        }
        const nextGroups = (data.groups || []) as GroupRecord[];
        setGroups(nextGroups);
        setSelectedGroupId(nextGroups[0]?.id || "");
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("読み込みに失敗しました。もう一度お試しください。");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || groups[0],
    [groups, selectedGroupId]
  );
  const namedChildren = namedChildrenOf(selectedGroup);

  function goToStep(next: number) {
    setError("");
    setStep(next);
    router.replace(`/onboarding?step=${next}`);
  }

  async function finish(nextPath: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/me/onboarding", { method: "POST" });
      if (!response.ok) {
        setError("案内を完了できませんでした。もう一度お試しください。");
        return;
      }
      setOnboardingRequiredCache(false);
      window.sessionStorage.removeItem(ONBOARDING_ACTIVE_KEY);
      invalidateCache("/api/me");
      router.push(nextPath);
    } catch (err) {
      console.error("Failed to complete onboarding", err);
      setError("案内を完了できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    const name = groupName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      if (!response.ok || !data.group) {
        setError("グループを作成できませんでした。");
        return;
      }
      setGroups((current) => [...current, data.group]);
      setSelectedGroupId(data.group.id);
      setGroupName("");
      invalidateCache("/api/groups");
      invalidateCache("/api/me");
    } catch (err) {
      console.error("Failed to create group", err);
      setError("グループを作成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function addChild() {
    const name = childName.trim();
    const groupId = selectedGroup?.id;
    if (!name || !groupId) return;
    if (name === "未設定") {
      setError("お子さんの名前を入力してください。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/groups/${groupId}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      if (!response.ok || !data.child) {
        setError("子どもを追加できませんでした。");
        return;
      }
      setGroups((current) =>
        current.map((group) =>
          group.id === groupId ? { ...group, children: [...group.children, data.child] } : group
        )
      );
      setChildName("");
      invalidateCache("/api/groups");
      invalidateCache("/api/me");
    } catch (err) {
      console.error("Failed to add child", err);
      setError("子どもを追加できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageShell width="narrow">
        <p className="py-16 text-center text-sm text-zinc-400">読み込み中...</p>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">はじめに</p>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
        家族のTODOを始める
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        共有グループ、お子さん、お便りの読み取りの順に設定します。あとからでも変更できます。
      </p>

      <ol className="mt-5 grid grid-cols-4 gap-2">
        {steps.map((item) => {
          const active = item.id === step;
          const done = item.id < step;
          return (
            <li key={item.id}>
              <div
                className={`flex min-h-11 flex-col items-center justify-center rounded-lg border px-1 text-center text-[11px] font-semibold sm:text-xs ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-zinc-200 bg-white text-zinc-500"
                }`}
              >
                <span className="flex items-center gap-1">
                  {done ? <Check size={12} /> : <span>{item.id}</span>}
                  <span>{item.label}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs sm:p-5">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">共有するグループを選ぶ</h2>
              <p className="mt-1 text-sm text-zinc-600">
                家族で同じTODOを見るグループです。すでにあるものを選ぶか、新しく作れます。
              </p>
            </div>
            <div className="space-y-2">
              {groups.map((group) => {
                const selected = group.id === selectedGroup?.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    aria-pressed={selected}
                    className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      selected
                        ? "border-zinc-900 bg-zinc-50 font-semibold text-zinc-950"
                        : "border-zinc-200 bg-white text-zinc-700"
                    }`}
                  >
                    <span>{group.name}</span>
                    <span className="text-xs text-zinc-500">
                      子ども {namedChildrenOf(group).length}人
                    </span>
                  </button>
                );
              })}
              {groups.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  まだグループがありません。下から作成してください。
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="field min-h-11"
                placeholder="新しいグループ名 例: 佐藤家"
                aria-label="新しいグループ名"
              />
              <button
                type="button"
                onClick={createGroup}
                disabled={busy || !groupName.trim()}
                className="button-secondary min-h-11"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                作成
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">お子さんを追加する</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {selectedGroup ? `「${selectedGroup.name}」` : "グループ"}
                のTODOを、誰の予定か分かるようにします。
              </p>
            </div>
            {namedChildren.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {namedChildren.map((child) => (
                  <li
                    key={child.id}
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-800"
                  >
                    {child.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">まだ名前が登録されていません。</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                className="field min-h-11"
                placeholder="例: はな"
                aria-label="お子さんの名前"
              />
              <button
                type="button"
                onClick={addChild}
                disabled={busy || !childName.trim() || !selectedGroup}
                className="button-secondary min-h-11"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                追加
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">お便りを読み取る</h2>
              <p className="mt-1 text-sm text-zinc-600">
                園や学校のプリントを写真かPDFで取り込むと、TODOの候補ができます。今はやらなくても大丈夫です。
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/tasks/new?from=onboarding")}
              className="button-primary min-h-11 w-full"
            >
              お便りを読み取る
            </button>
            <button
              type="button"
              onClick={() => goToStep(4)}
              className="button-secondary min-h-11 w-full"
            >
              読み取りはあとで
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">TODOリストへ</h2>
              <p className="mt-1 text-sm text-zinc-600">
                今日やることと、家族の担当がホームに並びます。♡の「引き受ける」で自分の担当にできます。
              </p>
            </div>
            <ul className="space-y-1 text-sm text-zinc-700">
              <li>グループ: {selectedGroup?.name || "未作成"}</li>
              <li>
                子ども:{" "}
                {namedChildren.length > 0
                  ? namedChildren.map((child) => child.name).join("、")
                  : "未登録"}
              </li>
            </ul>
            <button
              type="button"
              onClick={() => finish("/dashboard")}
              disabled={busy}
              className="button-primary min-h-11 w-full"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              TODOリストを開く
            </button>
          </div>
        )}

        {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => finish("/dashboard")}
            disabled={busy}
            className="min-h-11 text-sm font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
          >
            スキップしてTODO一覧へ
          </button>
          <div className="flex gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="button-secondary min-h-11 flex-1 sm:flex-none"
              >
                戻る
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !selectedGroup) {
                    setError("グループを選ぶか、新しく作成してください。");
                    return;
                  }
                  if (step === 2 && !hasNamedChild(selectedGroup ? [selectedGroup] : [])) {
                    setError("お子さんを1人以上追加してください。スキップもできます。");
                    return;
                  }
                  goToStep(step + 1);
                }}
                className="button-primary min-h-11 flex-1 sm:flex-none"
              >
                次へ
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <PageShell width="narrow">
          <p className="py-16 text-center text-sm text-zinc-400">読み込み中...</p>
        </PageShell>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
