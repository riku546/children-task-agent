"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { invalidateCache } from "@/lib/client-cache";
import { imageDataUrlSizeError, imageFileSizeError } from "@/lib/image-size";

type Turn = {
  kind: "user" | "result";
  text: string;
  actionSummaries?: string[];
};

type PendingRemoval = {
  groupId: string;
  memberId: string;
} | null;

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachment, setAttachment] = useState<{ text?: string; imageUrl?: string } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  function buildMessages(nextTurns: Turn[]) {
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const turn of nextTurns) {
      if (turn.kind === "user") {
        messages.push({ role: "user", content: turn.text });
      } else {
        messages.push({ role: "assistant", content: turn.text });
      }
    }
    return messages.slice(-8);
  }

  async function handlePdf(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setAttachmentName(file.name);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      const pageLimit = Math.min(pdf.numPages, 3);
      const chunks: string[] = [];
      let firstPageDataUrl = "";

      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(" ");
        if (text.trim().length > 10) {
          chunks.push(text);
          continue;
        }

        if (!firstPageDataUrl) {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            firstPageDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          }
        }
      }

      if (chunks.length > 0) {
        setAttachment({ text: chunks.join("\n\n").trim() });
        setAttachmentName(file.name);
        return;
      }

      if (firstPageDataUrl) {
        const sizeError = imageDataUrlSizeError(firstPageDataUrl);
        if (sizeError) {
          setAttachment(null);
          setAttachmentName(sizeError);
        } else {
          setAttachment({ imageUrl: firstPageDataUrl });
        }
      }
    } catch {
      setAttachment(null);
      setAttachmentName("PDFを読み取れませんでした");
    }
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const sizeError = imageFileSizeError(file.size);
    if (sizeError) {
      setAttachment(null);
      setAttachmentName(sizeError);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const dataError = imageDataUrlSizeError(result);
      if (dataError) {
        setAttachment(null);
        setAttachmentName(dataError);
        return;
      }
      setAttachment({ imageUrl: result });
      setAttachmentName(file.name);
    };
    reader.onerror = () => {
      setAttachment(null);
      setAttachmentName("画像を読み取れませんでした");
    };
    reader.readAsDataURL(file);
  }

  async function handleSend() {
    const text = draft.trim();
    if (sending) return;
    if (!text && !attachment) return;

    const userText = text || "（添付を確認してください）";
    const nextTurns: Turn[] = [...turns, { kind: "user", text: userText }];
    setTurns(nextTurns);
    setDraft("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildMessages(nextTurns),
          pendingRemoval,
          attachment
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setTurns((prev) => [...prev, { kind: "result", text: data.error || "送信に失敗しました" }]);
        return;
      }

      const summaries = (data.actions || []).map((a: { summary: string }) => a.summary);
      setTurns((prev) => [
        ...prev,
        {
          kind: "result",
          text: data.reply || "完了しました。",
          actionSummaries: summaries.length > 0 ? summaries : undefined
        }
      ]);

      if (data.pendingRemoval) {
        setPendingRemoval(data.pendingRemoval);
      } else if (pendingRemoval) {
        setPendingRemoval(null);
      }

      if (summaries.length > 0) {
        invalidateCache("/api/tasks");
        invalidateCache("/api/groups");
        invalidateCache("/api/me");
      }

      setAttachment(null);
      setAttachmentName("");
    } catch {
      setTurns((prev) => [...prev, { kind: "result", text: "通信に失敗しました" }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell width="narrow">
      <PageHeader title="チャット" description="タスクや家族の操作を文章で任せます" />

      <div className="mt-6 divide-y divide-zinc-200 border-t border-zinc-200">
        {turns.length === 0 && !sending ? (
          <p className="py-6 text-center text-sm text-zinc-500">まだやり取りはありません</p>
        ) : (
          turns.map((turn, index) => (
            <div key={`${index}-${turn.kind}`} className="py-3">
              <div className="text-[11px] font-semibold text-zinc-500">
                {turn.kind === "user" ? "あなた" : "結果"}
              </div>
              <p className="mt-1 text-sm text-zinc-900 whitespace-pre-wrap">{turn.text}</p>
              {turn.actionSummaries?.map((summary) => (
                <p key={summary} className="mt-1 text-xs text-zinc-600">
                  {summary}
                </p>
              ))}
            </div>
          ))
        )}
        {sending ? (
          <div className="py-3">
            <div className="text-[11px] font-semibold text-zinc-500">結果</div>
            <p className="mt-1 text-sm text-zinc-600">送信しています</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-2">
        <label className="text-xs font-semibold text-zinc-700" htmlFor="chat-body">
          内容
        </label>
        <textarea
          id="chat-body"
          className="field min-h-[120px] resize-y"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
        />
        {attachmentName ? <p className="text-xs text-zinc-600">{attachmentName}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImage}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePdf}
          />
          <button
            type="button"
            className="button-secondary"
            disabled={sending}
            onClick={() => imageInputRef.current?.click()}
          >
            画像
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={sending}
            onClick={() => pdfInputRef.current?.click()}
          >
            PDF
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={sending || (!draft.trim() && !attachment)}
            onClick={handleSend}
          >
            送信
          </button>
        </div>
      </div>
    </PageShell>
  );
}
