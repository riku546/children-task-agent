"use client";

import { ArrowUp, Plus, X } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
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
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    if (!attachMenuOpen) return;
    function onMouseDown(event: MouseEvent) {
      if (attachMenuRef.current?.contains(event.target as Node)) return;
      setAttachMenuOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [attachMenuOpen]);

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

  const sendDisabled = sending || (!draft.trim() && !attachment);
  const showAttachmentError = attachment === null && attachmentName.length > 0;

  return (
    <section className="mx-auto flex h-[calc(100dvh-3.5rem-1px)] max-w-3xl flex-col px-4 sm:px-6">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {turns.length === 0 && !sending ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">メッセージを入力してください</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            {turns.map((turn, index) => (
              <div
                key={`${index}-${turn.kind}`}
                className={`flex flex-col gap-1 ${turn.kind === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    turn.kind === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {turn.text}
                </div>
                {turn.actionSummaries?.map((summary) => (
                  <p key={summary} className="max-w-[85%] text-xs text-zinc-500">
                    {summary}
                  </p>
                ))}
              </div>
            ))}
            {sending ? (
              <div className="flex items-start">
                <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-900">
                  送信しています
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-2 md:pb-4">
        {showAttachmentError ? <p className="mb-1 text-xs text-red-600">{attachmentName}</p> : null}

        <form
          className="rounded-3xl border border-zinc-300 bg-white p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          {attachment ? (
            <div className="mb-1 flex items-center justify-between gap-2 px-2 text-sm text-zinc-700">
              <span className="min-w-0 truncate">{attachmentName}</span>
              <button
                type="button"
                aria-label="添付を外す"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                disabled={sending}
                onClick={() => {
                  setAttachment(null);
                  setAttachmentName("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            id="chat-body"
            rows={1}
            placeholder="メッセージを入力"
            className="max-h-40 w-full resize-none border-none bg-transparent px-2 py-2 text-sm outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (sendDisabled) return;
              void handleSend();
            }}
          />

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

          <div className="flex items-center justify-between">
            <div ref={attachMenuRef} className="relative">
              {attachMenuOpen ? (
                <div className="absolute bottom-11 left-0 z-20 min-w-36 rounded-xl border border-zinc-200 bg-white py-1 shadow-sm">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100"
                    onClick={() => {
                      imageInputRef.current?.click();
                      setAttachMenuOpen(false);
                    }}
                  >
                    画像
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100"
                    onClick={() => {
                      pdfInputRef.current?.click();
                      setAttachMenuOpen(false);
                    }}
                  >
                    PDF
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                aria-label="ファイルを追加"
                className="flex size-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                disabled={sending}
                onClick={() => setAttachMenuOpen((open) => !open)}
              >
                <Plus size={20} />
              </button>
            </div>

            <button
              type="submit"
              aria-label="送信"
              className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-white disabled:opacity-40"
              disabled={sendDisabled}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
