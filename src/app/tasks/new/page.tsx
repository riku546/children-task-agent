"use client";

import { Camera, FileText, Loader2, Mic, Save, Sparkles, Trash2, Type, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import type { ExtractionResult, GroupRecord, TodoCandidate } from "@/lib/types";

type InputMode = "text" | "image" | "pdf" | "voice";

const modes: { id: InputMode; label: string; icon: typeof Type }[] = [
  { id: "text", label: "テキスト", icon: Type },
  { id: "image", label: "画像", icon: Camera },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "voice", label: "音声", icon: Mic }
];

export default function NewTaskPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("text");
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [groupId, setGroupId] = useState("");
  const [confirmedText, setConfirmedText] = useState("明日までに保育園へ雑巾2枚を持っていく");
  const [previewUrl, setPreviewUrl] = useState("");
  const [busyText, setBusyText] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [candidates, setCandidates] = useState<TodoCandidate[]>([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    fetch("/api/groups", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setGroups(data.groups || []);
        setGroupId(data.groups?.[0]?.id || "");
      });
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groups, groupId]
  );

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMode("image");
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function clearImage() {
    setPreviewUrl("");
  }

  async function handlePdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMode("pdf");
    setBusyText("PDFから文字を抽出しています");

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

        // 埋め込みテキストがないスキャンページは画像化してAIに送信できるように保持
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

      if (firstPageDataUrl && chunks.length === 0) {
        setPreviewUrl(firstPageDataUrl);
      }
      if (chunks.length > 0) {
        setConfirmedText(chunks.join("\n\n").trim());
      }
    } finally {
      setBusyText("");
    }
  }

  function startVoice() {
    setMode("voice");
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setConfirmedText((current) =>
        `${current}\n音声認識に対応していないため、ここに直接入力してください。`.trim()
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript)
        .join("");
      setConfirmedText(transcript);
    };
    recognition.start();
  }

  async function generate() {
    const hasText = Boolean(confirmedText.trim());
    const hasImage = Boolean(previewUrl?.startsWith("data:image"));
    if (!hasText && !hasImage) return;

    setBusyText("AIが解析してTODO候補を生成しています");
    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          inputType: mode,
          confirmedText,
          imageUrl: hasImage ? previewUrl : undefined
        })
      });
      const data = (await response.json()) as ExtractionResult;
      setResult(data);
      setCandidates(data.tasks);
      if (
        data.extractedText &&
        (!confirmedText.trim() || confirmedText === "明日までに保育園へ雑巾2枚を持っていく")
      ) {
        setConfirmedText(data.extractedText);
      }
    } finally {
      setBusyText("");
    }
  }

  async function save() {
    if (candidates.length === 0) return;
    setBusyText("TODOを登録しています");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        sourceText: confirmedText,
        tasks: candidates.map((candidate) => ({
          title: candidate.title,
          description: candidate.notes,
          type: candidate.type,
          dueDate: candidate.dueDate,
          childName: candidate.childName,
          assigneeName: candidate.assigneeSuggestion,
          priority: candidate.priority
        }))
      })
    });
    const data = await response.json();
    const firstTaskId = data.tasks?.[0]?.id;
    router.push(firstTaskId ? `/tasks/${firstTaskId}` : "/dashboard");
  }

  function updateCandidate(index: number, patch: Partial<TodoCandidate>) {
    setCandidates((current) =>
      current.map((candidate, currentIndex) =>
        currentIndex === index ? { ...candidate, ...patch } : candidate
      )
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-12">
      <p className="text-sm font-bold text-moss">New Task</p>
      <h1 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">連絡からTODO作成</h1>

      <div className="mt-7 grid gap-7 lg:grid-cols-[420px_1fr]">
        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={mode === item.id ? "button-primary" : "button-secondary"}
                  onClick={() => setMode(item.id)}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <label className="mt-5 block text-sm font-semibold" htmlFor="group">
            共有先
          </label>
          <select
            id="group"
            className="field mt-2"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <div className="mt-5 grid gap-3">
            <label className="button-secondary cursor-pointer">
              <Camera size={18} />
              写真を撮影
              <input
                className="hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImage}
              />
            </label>
            <label className="button-secondary cursor-pointer">
              <Upload size={18} />
              画像を選択
              <input className="hidden" type="file" accept="image/*" onChange={handleImage} />
            </label>
            <label className="button-secondary cursor-pointer">
              <FileText size={18} />
              PDFを選択
              <input className="hidden" type="file" accept="application/pdf" onChange={handlePdf} />
            </label>
            <button className="button-secondary" onClick={startVoice}>
              <Mic size={18} />
              {listening ? "聞き取り中" : "音声入力"}
            </button>
          </div>

          {previewUrl ? (
            <div className="mt-5 rounded-md border border-ink/10 bg-cloud/50 p-3">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-ink/70">画像プレビュー</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                  onClick={clearImage}
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
              <img
                src={previewUrl}
                alt="プレビュー"
                className="max-h-64 w-full rounded-md object-contain bg-white"
              />
              <div className="mt-3">
                <button
                  type="button"
                  className="button-primary w-full"
                  onClick={generate}
                  disabled={Boolean(busyText)}
                >
                  {busyText ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}
                  画像からTODO候補を生成
                </button>
              </div>
            </div>
          ) : null}
          {selectedGroup ? (
            <p className="mt-5 text-sm text-ink/60">対象: {selectedGroup.name}</p>
          ) : null}
        </section>

        <section className="grid gap-6">
          <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold" htmlFor="confirmed-text">
              確認済みテキスト
            </label>
            <textarea
              id="confirmed-text"
              className="field mt-2 min-h-52 resize-y leading-7"
              value={confirmedText}
              onChange={(event) => setConfirmedText(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="button-primary"
                onClick={generate}
                disabled={Boolean(busyText) || (!confirmedText.trim() && !previewUrl)}
              >
                {busyText ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                TODO候補生成
              </button>
              {busyText ? (
                <span className="inline-flex items-center text-sm font-semibold text-moss">
                  {busyText}
                </span>
              ) : null}
            </div>
          </div>

          {result ? (
            <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-bold text-moss">AI候補</p>
                  <h2 className="text-xl font-bold">{result.summary}</h2>
                </div>
                <button className="button-primary" onClick={save} disabled={Boolean(busyText)}>
                  <Save size={18} />
                  確定して登録
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                {candidates.map((candidate, index) => (
                  <div
                    key={`${candidate.title}-${index}`}
                    className="rounded-md border border-ink/10 bg-cloud p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field
                        label="タイトル"
                        value={candidate.title}
                        onChange={(value) => updateCandidate(index, { title: value })}
                      />
                      <Field
                        label="種別"
                        value={candidate.type}
                        onChange={(value) => updateCandidate(index, { type: value })}
                      />
                      <Field
                        label="期限"
                        type="date"
                        value={candidate.dueDate || ""}
                        onChange={(value) => updateCandidate(index, { dueDate: value || null })}
                      />
                      <Field
                        label="担当候補"
                        value={candidate.assigneeSuggestion}
                        onChange={(value) => updateCandidate(index, { assigneeSuggestion: value })}
                      />
                      <Field
                        label="対象の子ども"
                        value={candidate.childName}
                        onChange={(value) => updateCandidate(index, { childName: value })}
                      />
                      <label className="block text-sm font-semibold">
                        重要度
                        <select
                          className="field mt-1"
                          value={candidate.priority}
                          onChange={(event) =>
                            updateCandidate(index, {
                              priority: event.target.value as TodoCandidate["priority"]
                            })
                          }
                        >
                          <option value="low">低</option>
                          <option value="medium">中</option>
                          <option value="high">高</option>
                        </select>
                      </label>
                    </div>
                    <label className="mt-3 block text-sm font-semibold">
                      メモ
                      <textarea
                        className="field mt-1 min-h-20"
                        value={candidate.notes}
                        onChange={(event) => updateCandidate(index, { notes: event.target.value })}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className="field mt-1"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
