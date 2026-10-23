"use client";

import { Baby, Check, Copy, Link2, Loader2, Plus, Share2, Undo2, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import { MembershipError, planMemberRemoval } from "@/lib/membership";
import type { GroupRecord, MemberRecord } from "@/lib/types";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-sm font-semibold text-white shadow-2xs transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

type PendingRemoval = {
  memberId: string;
  displayName: string;
  action: "removed" | "left";
  promoteName: string | null;
};

type Notice = { type: "success" | "error"; text: string };

export default function GroupSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cachedGroups = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
  const cachedMe = getCachedData<{ user?: { id: string } }>("/api/me");
  const [groups, setGroups] = useState<GroupRecord[]>(cachedGroups?.groups || []);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(cachedMe?.user?.id);
  const [childName, setChildName] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const inviteInputRef = useRef<HTMLInputElement>(null);

  async function load(force = false) {
    if (!force) {
      const cached = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
      const me = getCachedData<{ user?: { id: string } }>("/api/me");
      if (cached && me) {
        setGroups(cached.groups || []);
        setCurrentUserId(me.user?.id);
        return;
      }
    }
    try {
      const [groupData, meData] = await Promise.all([
        fetchJsonWithCache<{ groups: GroupRecord[] }>("/api/groups", { force }),
        fetchJsonWithCache<{ user?: { id: string } }>("/api/me", { force })
      ]);
      setGroups(groupData.groups || []);
      setCurrentUserId(meData.user?.id);
    } catch (error) {
      console.error("Failed to load groups in settings", error);
    }
  }

  async function addChild() {
    if (!childName.trim()) return;
    await fetch(`/api/groups/${params.id}/children`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: childName })
    });
    setChildName("");
    invalidateCache("/api/groups");
    invalidateCache("/api/me");
    await load(true);
  }

  async function createInvite() {
    setInviteLoading(true);
    setNotice(null);
    setCopied(false);
    try {
      const response = await fetch(`/api/groups/${params.id}/invite`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        setNotice({
          type: "error",
          text: data.error || "招待リンクを発行できませんでした"
        });
        return;
      }
      setInviteUrl(data.url);
      setQrDataUrl(typeof data.qrDataUrl === "string" ? data.qrDataUrl : null);
      setInviteExpiresAt(typeof data.invite?.expiresAt === "string" ? data.invite.expiresAt : "");
    } catch (error) {
      console.error("Failed to create invite", error);
      setNotice({ type: "error", text: "招待リンクを発行できませんでした" });
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      inviteInputRef.current?.focus();
      inviteInputRef.current?.select();
      setNotice({
        type: "error",
        text: "コピーできませんでした。リンクを選択して共有してください。"
      });
    }
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (!navigator.share) {
      await copyInvite();
      return;
    }
    try {
      await navigator.share({
        title: "家族グループへの招待",
        text: "このリンクから参加できます",
        url: inviteUrl
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ type: "error", text: "共有シートを開けませんでした。URLをコピーしてください。" });
    }
  }

  function askRemoval(memberId: string) {
    if (!group || !currentUserId) return;
    setDialogError("");
    try {
      const plan = planMemberRemoval({
        actorUserId: currentUserId,
        members: group.members,
        memberId
      });
      const promoteName = plan.promoteMemberId
        ? (group.members.find((member) => member.id === plan.promoteMemberId)?.displayName ?? null)
        : null;
      setPending({
        memberId: plan.memberId,
        displayName: plan.displayName,
        action: plan.action,
        promoteName
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        setNotice({ type: "error", text: error.message });
        return;
      }
      throw error;
    }
  }

  async function confirmRemoval() {
    if (!pending) return;
    setSubmitting(true);
    setDialogError("");
    try {
      const response = await fetch(`/api/groups/${params.id}/members/${pending.memberId}`, {
        method: "DELETE"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDialogError(data.error || "メンバーを更新できませんでした");
        return;
      }

      invalidateCache("/api/groups");
      invalidateCache("/api/me");
      invalidateCache("/api/tasks");
      const removedName = pending.displayName;
      const action = pending.action;
      const taskNote =
        typeof data.unassignedTaskCount === "number" && data.unassignedTaskCount > 0
          ? `担当だったタスク ${data.unassignedTaskCount}件を未担当に戻しました。`
          : "";
      setPending(null);

      if (action === "left") {
        router.push("/groups");
        return;
      }

      setNotice({
        type: "success",
        text: `${removedName}さんをグループから外しました。${taskNote}`
      });
      await load(true);
    } catch (error) {
      console.error("Failed to remove member", error);
      setDialogError("通信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!pending) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) setPending(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, submitting]);

  const group = useMemo(() => groups.find((item) => item.id === params.id), [groups, params.id]);

  if (!group) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 text-sm text-zinc-500">
        読み込み中...
      </section>
    );
  }

  const actor = group.members.find((member) => member.userId === currentUserId);
  const isOwner = actor?.role === "OWNER";
  const canLeave = Boolean(actor) && group.members.length > 1;

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-12 md:pt-8">
      <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/groups"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition"
            >
              <Undo2 size={14} />
              グループ一覧
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-xs font-mono text-zinc-500">Settings</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            {group.name} の設定
          </h1>
        </div>
        <button
          type="button"
          className={`${primaryButton} w-full sm:w-auto`}
          onClick={createInvite}
          disabled={inviteLoading}
        >
          {inviteLoading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          <span>{inviteLoading ? "発行中..." : "招待リンクを発行"}</span>
        </button>
      </div>

      {notice ? (
        <div
          className={`mt-4 rounded-lg px-3.5 py-3 text-sm font-medium ${
            notice.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
          role="status"
        >
          {notice.text}
        </div>
      ) : null}

      {inviteUrl ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <label className="block text-sm font-semibold text-emerald-950" htmlFor="invite">
            家族を招待するリンク
          </label>
          <p className="mt-1 text-sm leading-relaxed text-emerald-900">
            URLを送るか、相手のスマホのカメラでQRコードを読み取ってください。
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="invite"
              ref={inviteInputRef}
              className="field min-h-11 min-w-0 flex-1 text-sm bg-white"
              readOnly
              value={inviteUrl}
            />
            <button type="button" className={`${primaryButton} shrink-0`} onClick={copyInvite}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "コピーしました" : "URLをコピー"}</span>
            </button>
          </div>

          {qrDataUrl ? (
            <figure className="mt-4 flex flex-col items-center">
              <div className="rounded-xl bg-white p-3 shadow-2xs">
                <img
                  src={qrDataUrl}
                  alt={`${group.name}への招待リンクのQRコード`}
                  width={320}
                  height={320}
                  className="h-64 w-64 max-w-full"
                />
              </div>
              <figcaption className="mt-2 max-w-sm text-center text-sm leading-relaxed text-emerald-950">
                表示中のQRは、上の招待リンクと同じです。
              </figcaption>
            </figure>
          ) : (
            <p className="mt-3 text-sm text-emerald-900">
              QRコードは表示できませんでした。URLをコピーして共有してください。
            </p>
          )}

          {canShare ? (
            <button
              type="button"
              className={`${secondaryButton} mt-4 w-full`}
              onClick={shareInvite}
            >
              <Share2 size={16} />
              <span>スマホの共有シートで送る</span>
            </button>
          ) : null}

          {inviteExpiresAt ? (
            <p className="mt-3 text-center text-xs text-emerald-800">
              このリンクの有効期限: {formatExpiry(inviteExpiresAt)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 pb-1">
            <Users size={15} className="text-zinc-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              所属メンバー ({group.members.length})
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {group.members.length === 1
              ? "いま参加しているのはあなただけです。招待リンクから家族が参加すると、ここから外せます。"
              : isOwner
                ? "管理者は他のメンバーを外せます。外した人の担当タスクは未担当に戻ります。"
                : "他のメンバーを外せるのは管理者だけです。自分はこのグループから抜けられます。"}
          </p>
          <div className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            {group.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isSelf={member.userId === currentUserId}
                showRemove={Boolean(isOwner) && member.userId !== currentUserId}
                showLeave={member.userId === currentUserId && canLeave}
                onAction={() => askRemoval(member.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 pb-1">
            <Baby size={15} className="text-zinc-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              登録中の子ども ({group.children.length})
            </h2>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="field min-h-11 text-sm"
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="子どもの名前を追加 (例: 太郎)"
            />
            <button
              type="button"
              className={`${secondaryButton} shrink-0`}
              onClick={addChild}
              disabled={!childName.trim()}
            >
              <Plus size={16} />
              <span>追加</span>
            </button>
          </div>

          <div className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            {group.children.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500">
                子どもはまだ登録されていません
              </div>
            ) : (
              group.children.map((child) => (
                <div
                  key={child.id}
                  className="p-3.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50/50 transition"
                >
                  {child.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-member-title"
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-lg"
          >
            <h2 id="remove-member-title" className="text-lg font-bold text-zinc-950">
              {pending.action === "left"
                ? "グループを抜けますか？"
                : `${pending.displayName}さんを外しますか？`}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{removalDetail(pending)}</p>
            {dialogError ? (
              <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
                {dialogError}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setPending(null)}
                disabled={submitting}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-rose-600 px-3.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={confirmRemoval}
                disabled={submitting}
              >
                {submitting ? "処理中..." : pending.action === "left" ? "抜ける" : "外す"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MemberRow({
  member,
  isSelf,
  showRemove,
  showLeave,
  onAction
}: {
  member: MemberRecord;
  isSelf: boolean;
  showRemove: boolean;
  showLeave: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">{member.displayName}</span>
          {isSelf ? (
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              あなた
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-xs text-zinc-500">{roleLabel(member.role)}</div>
      </div>
      {showLeave ? (
        <button type="button" className={`${secondaryButton} w-full sm:w-auto`} onClick={onAction}>
          グループを抜ける
        </button>
      ) : null}
      {showRemove ? (
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 active:scale-[0.98] sm:w-auto"
          onClick={onAction}
        >
          外す
        </button>
      ) : null}
    </div>
  );
}

function roleLabel(role: MemberRecord["role"]) {
  return role === "OWNER" ? "管理者" : "メンバー";
}

function removalDetail(pending: PendingRemoval) {
  const taskNote = "担当になっているタスクは削除せず、未担当に戻します。";
  if (pending.action === "removed") {
    return `${pending.displayName}さんをこのグループから外します。アカウント自体は削除されません。${taskNote}`;
  }
  if (pending.promoteName) {
    return `このグループから抜けます。あなたが最後の管理者のため、${pending.promoteName}さんが管理者になります。${taskNote}`;
  }
  return `このグループから抜けます。タスクや子どもの情報はグループに残ります。${taskNote}`;
}

function formatExpiry(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
