"use client";

import { ArrowUp, Camera, Mic, Plus, X } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { ChatMessageText } from "@/components/ChatMessageText";
import { buildChatSendPayload, chatSendSizeError } from "@/lib/chat-message";
import { invalidateCache } from "@/lib/client-cache";
import {
  IMAGE_SIZE_LIMIT_MESSAGE,
  imageDataUrlSizeError,
  imageFileSizeError
} from "@/lib/image-size";

type Turn = {
  kind: "user" | "result";
  text: string;
  apiText?: string;
  actionSummaries?: string[];
};

type PendingRemoval = {
  groupId: string;
  memberId: string;
} | null;

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onstart?: () => void;
  onend?: () => void;
  onresult?: (event: { results: SpeechRecognitionResultList }) => void;
  onerror?: (event: { error: string }) => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const USAGE_GUIDE_REPLY = `このチャットでは、文章で次のことができます。

・タスクの確認、作成、更新
・グループの作成、子どもの追加
・招待リンクの発行と、招待への参加
・表示名の変更
・画像やPDF、撮影、音声からタスクを作る

チャットではできないことは、次の画面で行えます。

・招待のQRコード: [グループ一覧](/groups) から各グループの設定
・ログアウト: [プロフィール](/profile)
・作ったタスクの修正: 返答のリンク、または [ホーム](/dashboard)

タスクの削除とグループの削除は、このアプリにはありません。`;

const TASK_CREATE_GUIDE_REPLY = `タスクを作ります。次の内容を、このチャットに返信してください。

・タスク名（必要）
・期限
・子ども
・担当
・種類（提出物、持ち物、行事、集金、仕事、連絡など）
・詳しい内容
・優先度（低、中、高）
・グループ（複数あるとき）

タスク名以外は、分かるものだけで大丈夫です。`;

const GUIDANCE_BUTTON_CLASS =
  "rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-40";

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attachmentLabel, setAttachmentLabel] = useState("");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentOversized, setAttachmentOversized] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ text?: string; imageUrl?: string } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval>(null);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const [awaitingTaskAnswers, setAwaitingTaskAnswers] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const draftBeforeSpeechRef = useRef("");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, sending, streamStatus, streamText]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  function buildMessages(nextTurns: Turn[]) {
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const turn of nextTurns) {
      if (turn.kind === "user") {
        messages.push({ role: "user", content: turn.apiText ?? turn.text });
      } else {
        messages.push({ role: "assistant", content: turn.text });
      }
    }
    return messages.slice(-8);
  }

  function clearAttachmentChip() {
    setAttachment(null);
    setAttachmentLabel("");
    setAttachmentOversized(false);
    setAttachmentError(null);
  }

  async function handlePdf(file: File) {
    setSendError(null);
    setAttachmentError(null);
    setAttachmentOversized(false);
    setAttachment(null);
    setAttachmentLabel(file.name);
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
        const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
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
        setAttachmentLabel(file.name);
        return;
      }

      if (firstPageDataUrl) {
        const sizeError = imageDataUrlSizeError(firstPageDataUrl);
        if (sizeError === IMAGE_SIZE_LIMIT_MESSAGE) {
          setAttachment(null);
          setAttachmentOversized(true);
        } else if (sizeError) {
          clearAttachmentChip();
          setAttachmentError(sizeError);
        } else {
          setAttachment({ imageUrl: firstPageDataUrl });
        }
        return;
      }

      clearAttachmentChip();
      setAttachmentError("PDFを読み取れませんでした");
    } catch {
      clearAttachmentChip();
      setAttachmentError("PDFを読み取れませんでした");
    }
  }

  function handleImage(file: File) {
    setSendError(null);
    setAttachmentError(null);
    setAttachmentOversized(false);
    setAttachment(null);
    const label = file.name || "写真";
    setAttachmentLabel(label);

    const sizeError = imageFileSizeError(file.size);
    if (sizeError === IMAGE_SIZE_LIMIT_MESSAGE) {
      setAttachment(null);
      setAttachmentOversized(true);
      return;
    }
    if (sizeError) {
      clearAttachmentChip();
      setAttachmentError(sizeError);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        clearAttachmentChip();
        setAttachmentError("画像を読み取れませんでした");
        return;
      }
      setAttachmentOversized(false);
      setAttachment({ imageUrl: result });
    };
    reader.onerror = () => {
      clearAttachmentChip();
      setAttachmentError("画像を読み取れませんでした");
    };
    reader.readAsDataURL(file);
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      void handlePdf(file);
    } else {
      handleImage(file);
    }
  }

  function showUsageGuide() {
    setAwaitingTaskAnswers(false);
    setTurns((prev) => [
      ...prev,
      { kind: "user", text: "使い方を教えて" },
      { kind: "result", text: USAGE_GUIDE_REPLY }
    ]);
  }

  function startCreateTaskFlow() {
    setTurns((prev) => [
      ...prev,
      { kind: "user", text: "タスクを作りたい" },
      { kind: "result", text: TASK_CREATE_GUIDE_REPLY }
    ]);
    setAwaitingTaskAnswers(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleInvite() {
    setAwaitingTaskAnswers(false);
    void handleSend("招待リンクを出して");
  }

  type SendOptions = {
    overrideText?: string;
    overrideApiText?: string;
    attachmentOverride?: { text?: string; imageUrl?: string } | null;
  };

  async function handleSend(options?: SendOptions | string) {
    const opts: SendOptions =
      typeof options === "string" ? { overrideText: options } : (options ?? {});
    const { overrideText, overrideApiText, attachmentOverride } = opts;

    const activeAttachment = attachmentOverride !== undefined ? attachmentOverride : attachment;

    if (sending) return;

    const taskAnswersMode = awaitingTaskAnswers && overrideText === undefined;

    const hasChip = Boolean(activeAttachment) || Boolean(attachmentLabel) || attachmentOversized;

    const payload = buildChatSendPayload({
      draft,
      mode: taskAnswersMode ? "task_answers" : null,
      hasAttachment: Boolean(activeAttachment) || attachmentOversized,
      overrideText,
      overrideApiText
    });
    if (payload === null && overrideText === undefined && !hasChip) return;

    if (attachmentOverride === undefined && attachmentOversized) {
      setSendError(IMAGE_SIZE_LIMIT_MESSAGE);
      return;
    }

    const limitMessage = payload === null ? "" : (payload.apiText ?? payload.displayText);
    const sizeError = chatSendSizeError({
      message: limitMessage,
      attachment: activeAttachment
    });
    if (sizeError) {
      setSendError(sizeError);
      return;
    }

    if (payload === null) return;

    setSendError(null);

    if (awaitingTaskAnswers) {
      setAwaitingTaskAnswers(false);
    }

    speechRecognitionRef.current?.stop();

    const userText = payload.displayText;
    const apiText = payload.apiText;

    const nextTurns: Turn[] = [...turns, { kind: "user", text: userText, apiText }];
    setTurns(nextTurns);

    if (overrideText === undefined) {
      setDraft("");
    }
    setSending(true);
    setStreamStatus(null);
    setStreamText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildMessages(nextTurns),
          pendingRemoval,
          attachment: activeAttachment
        })
      });

      const contentType = res.headers.get("Content-Type") || "";
      const isJson = contentType.includes("application/json");

      if (isJson || !res.ok) {
        const data = await res.json();
        if (!res.ok) {
          setTurns((prev) => [
            ...prev,
            { kind: "result", text: data.error || "送信に失敗しました" }
          ]);
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

        clearAttachmentChip();
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setTurns((prev) => [...prev, { kind: "result", text: "通信に失敗しました" }]);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      type ChatDoneEvent = {
        reply?: string;
        actions?: { summary: string }[];
        pendingRemoval?: PendingRemoval;
      };
      let doneEvent: ChatDoneEvent | null = null;
      let streamError: string | null = null;
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (event.type === "status" && typeof event.text === "string") {
            setStreamStatus(event.text);
          } else if (event.type === "delta" && typeof event.text === "string") {
            accumulated += event.text;
            setStreamStatus(null);
            setStreamText(accumulated);
          } else if (event.type === "done") {
            doneEvent = event as unknown as ChatDoneEvent;
          } else if (event.type === "error" && typeof event.error === "string") {
            streamError = event.error;
          }
        }
      }

      if (streamError !== null) {
        setTurns((prev) => [...prev, { kind: "result", text: streamError }]);
        return;
      }

      if (!doneEvent) {
        const fallback =
          accumulated.trim().length > 0 ? accumulated : streamText.trim() || "通信に失敗しました";
        if (!accumulated.trim() && !streamText.trim()) {
          setTurns((prev) => [...prev, { kind: "result", text: "通信に失敗しました" }]);
        } else {
          setTurns((prev) => [...prev, { kind: "result", text: fallback }]);
        }
        return;
      }

      const summaries = (doneEvent.actions || []).map((a) => a.summary);
      const replyText =
        (doneEvent.reply && doneEvent.reply.length > 0 ? doneEvent.reply : accumulated) ||
        "完了しました。";

      setTurns((prev) => [
        ...prev,
        {
          kind: "result",
          text: replyText,
          actionSummaries: summaries.length > 0 ? summaries : undefined
        }
      ]);

      if (doneEvent.pendingRemoval) {
        setPendingRemoval(doneEvent.pendingRemoval);
      } else if (pendingRemoval) {
        setPendingRemoval(null);
      }

      if (summaries.length > 0) {
        invalidateCache("/api/tasks");
        invalidateCache("/api/groups");
        invalidateCache("/api/me");
      }

      clearAttachmentChip();
    } catch {
      setTurns((prev) => [...prev, { kind: "result", text: "通信に失敗しました" }]);
    } finally {
      setSending(false);
      setStreamStatus(null);
      setStreamText("");
    }
  }

  function handleCameraCapture(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    handleImage(file);
    if (!file.name.trim()) {
      setAttachmentLabel("写真");
    }
  }

  function toggleSpeech() {
    if (listening) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("このブラウザは音声入力に対応していません。文字で入力してください。");
      return;
    }

    setSpeechError(null);
    draftBeforeSpeechRef.current = draft;

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      const base = draftBeforeSpeechRef.current;
      const combined = base ? `${base}${transcript}` : transcript;
      setDraft(combined);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      setSpeechError("音声を取得できませんでした。文字で入力してください。");
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  }

  const hasChip = Boolean(attachment) || Boolean(attachmentLabel);
  const sendDisabled = sending || (!draft.trim() && !hasChip);

  return (
    <section className="fixed inset-x-0 top-[calc(3.5rem+1px)] bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6 md:bottom-0">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                  {turn.kind === "user" ? turn.text : <ChatMessageText text={turn.text} />}
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
                <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm whitespace-pre-wrap text-zinc-900">
                  {streamText ? (
                    <ChatMessageText text={streamText} />
                  ) : (
                    <span className="block space-y-2 py-1" aria-busy="true">
                      <span className="sr-only">処理中です</span>
                      <span
                        aria-hidden
                        className="block h-3 w-40 animate-pulse rounded bg-zinc-300"
                      />
                      <span
                        aria-hidden
                        className="block h-3 w-24 animate-pulse rounded bg-zinc-300"
                      />
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 pb-2 pt-2 md:pb-4">
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={GUIDANCE_BUTTON_CLASS}
            disabled={sending}
            onClick={showUsageGuide}
          >
            使い方
          </button>
          <button
            type="button"
            className={GUIDANCE_BUTTON_CLASS}
            disabled={sending}
            onClick={startCreateTaskFlow}
          >
            タスクを作成
          </button>
          <button
            type="button"
            className={GUIDANCE_BUTTON_CLASS}
            disabled={sending}
            onClick={handleInvite}
          >
            人を招待
          </button>
        </div>

        {sendError ? <p className="mb-1 text-xs text-red-600">{sendError}</p> : null}
        {attachmentError ? <p className="mb-1 text-xs text-red-600">{attachmentError}</p> : null}
        {speechError ? <p className="mb-1 text-xs text-red-600">{speechError}</p> : null}

        <form
          className="rounded-3xl border border-zinc-300 bg-white p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          {hasChip ? (
            <div className="mb-1 flex items-center justify-between gap-2 px-2 text-sm text-zinc-700">
              <span className="min-w-0 truncate">{attachmentLabel}</span>
              <button
                type="button"
                aria-label="添付を外す"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                disabled={sending}
                onClick={() => {
                  clearAttachmentChip();
                  setSendError(null);
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
            onChange={(e) => {
              setDraft(e.target.value);
              setSendError(null);
            }}
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
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="ファイルを追加"
                className="flex size-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                disabled={sending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={20} />
              </button>
              <button
                type="button"
                aria-label="写真を撮影"
                className="flex size-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                disabled={sending}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={20} />
              </button>
              <button
                type="button"
                aria-label={listening ? "音声入力を止める" : "音声入力"}
                aria-pressed={listening}
                className={`flex size-9 items-center justify-center rounded-full disabled:opacity-40 ${
                  listening ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
                disabled={sending}
                onClick={toggleSpeech}
              >
                <Mic size={20} />
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
