"use client";

import {
  Camera,
  FileText,
  Loader2,
  Mic,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
  Upload
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, Suspense, useEffect, useMemo, useState } from "react";
import { fetchJsonWithCache, getCachedData, invalidateCache } from "@/lib/client-cache";
import type { ExtractionResult, GroupRecord, TodoCandidate } from "@/lib/types";

type InputMode = "text" | "image" | "pdf" | "voice";

const modes: { id: InputMode; label: string; icon: typeof Type }[] = [
  { id: "text", label: "テキスト", icon: Type },
  { id: "image", label: "画像", icon: Camera },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "voice", label: "音声", icon: Mic }
];

function NewTaskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryDate = searchParams.get("date") || "";
  const [mode, setMode] = useState<InputMode>("text");
  const cachedGroups = getCachedData<{ groups: GroupRecord[] }>("/api/groups");
  const [groups, setGroups] = useState<GroupRecord[]>(cachedGroups?.groups || []);
  const [groupId, setGroupId] = useState(cachedGroups?.groups?.[0]?.id || "");
  const [confirmedText, setConfirmedText] = useState("明日までに保育園へ雑巾2枚を持っていく");
  const [previewUrl, setPreviewUrl] = useState("");
  const [busyText, setBusyText] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [candidates, setCandidates] = useState<TodoCandidate[]>([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    fetchJsonWithCache<{ groups: GroupRecord[] }>("/api/groups")
      .then((data) => {
        setGroups(data.groups || []);
        if (!groupId) {
          setGroupId(data.groups?.[0]?.id || "");
        }
      })
      .catch((e) => console.error("Failed to load groups", e));
  }, [groupId]);

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
    invalidateCache("/api/tasks");
    const firstTaskId = data.tasks?.[0]?.id;
    router.push(firstTaskId ? `/tasks/${firstTaskId}` : "/dashboard");
  }

  function addManualCandidate() {
    const newCandidate: TodoCandidate = {
      title: "",
      type: "提出物",
      dueDate: queryDate || null,
      assigneeSuggestion: "",
      childName: "",
      place: "",
      priority: "medium",
      notes: ""
    };
    setCandidates((current) => [...current, newCandidate]);
    if (!result) {
      setResult({
        summary: "手動作成TODO",
        tasks: [newCandidate]
      });
    }
  }

  function updateCandidate(index: number, patch: Partial<TodoCandidate>) {
    setCandidates((current) =>
      current.map((candidate, currentIndex) =>
        currentIndex === index ? { ...candidate, ...patch } : candidate
      )
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8">
      <div className="border-b border-zinc-200/80 pb-4">
        <p className="text-xs font-bold tracking-wider uppercase text-zinc-500">
          New Task Extraction
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
          お便り・連絡からTODO作成
        </h1>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[400px_1fr]">
        <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
          <div className="grid grid-cols-2 gap-2">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={mode === item.id ? "button-primary" : "button-secondary"}
                  onClick={() => setMode(item.id)}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <label className="mt-5 block text-xs font-semibold text-zinc-700" htmlFor="group">
            共有先ファミリー
          </label>
          <select
            id="group"
            className="field mt-1.5"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <div className="mt-5 grid gap-2.5">
            <label className="button-secondary cursor-pointer">
              <Camera size={14} />
              <span>写真を撮影</span>
              <input
                className="hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImage}
              />
            </label>
            <label className="button-secondary cursor-pointer">
              <Upload size={14} />
              <span>画像を選択</span>
              <input className="hidden" type="file" accept="image/*" onChange={handleImage} />
            </label>
            <label className="button-secondary cursor-pointer">
              <FileText size={14} />
              <span>PDFを選択</span>
              <input className="hidden" type="file" accept="application/pdf" onChange={handlePdf} />
            </label>
            <button type="button" className="button-secondary" onClick={startVoice}>
              <Mic size={14} />
              <span>{listening ? "聞き取り中..." : "音声入力"}</span>
            </button>
          </div>

          {previewUrl ? (
            <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-zinc-700">画像プレビュー</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 transition hover:text-rose-700"
                  onClick={clearImage}
                >
                  <Trash2 size={13} />
                  削除
                </button>
              </div>
              <img
                src={previewUrl}
                alt="プレビュー"
                className="max-h-64 w-full rounded-md object-contain bg-white border border-zinc-200"
              />
              <div className="mt-3">
                <button
                  type="button"
                  className="button-primary w-full"
                  onClick={generate}
                  disabled={Boolean(busyText)}
                >
                  {busyText ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  <span>画像からTODO候補を生成</span>
                </button>
              </div>
            </div>
          ) : null}
          {selectedGroup ? (
            <p className="mt-4 text-xs text-zinc-500">対象: {selectedGroup.name}</p>
          ) : null}
        </section>

        <section className="grid gap-6">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
            <label className="block text-xs font-semibold text-zinc-700" htmlFor="confirmed-text">
              確認済みテキスト
            </label>
            <textarea
              id="confirmed-text"
              className="field mt-2 min-h-52 resize-y leading-relaxed font-mono text-xs"
              value={confirmedText}
              onChange={(event) => setConfirmedText(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="button-primary"
                onClick={generate}
                disabled={Boolean(busyText) || (!confirmedText.trim() && !previewUrl)}
              >
                {busyText ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>TODO候補生成</span>
              </button>
              {busyText ? (
                <span className="inline-flex items-center text-xs font-medium text-zinc-600">
                  {busyText}
                </span>
              ) : null}
            </div>
          </div>

          {result ? (
            <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    AI抽出サマリー
                  </p>
                  <h2 className="text-base font-bold text-zinc-950">{result.summary}</h2>
                </div>
                <button
                  type="button"
                  className="button-primary"
                  onClick={save}
                  disabled={Boolean(busyText)}
                >
                  <Save size={14} />
                  <span>確定して登録</span>
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
                        list="type-presets"
                        onChange={(value) => updateCandidate(index, { type: value })}
                      />
                      <datalist id="type-presets">
                        <option value="提出物" />
                        <option value="持ち物" />
                        <option value="行事" />
                        <option value="集金" />
                        <option value="仕事・勤務" />
                        <option value="連絡・手紙" />
                      </datalist>
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

              <div className="mt-4">
                <button
                  type="button"
                  onClick={addManualCandidate}
                  className="button-secondary text-xs"
                >
                  <Plus size={14} />
                  さらにTODOを1件追加
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ink/20 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-ink/60">
                お便りや写真を読み取ってAIで自動抽出するか、手動で直接TODOを作成できます。
              </p>
              <button
                type="button"
                onClick={addManualCandidate}
                className="button-secondary mt-4 inline-flex text-xs"
              >
                <Plus size={15} />
                手動でTODOを作成する
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  list
}: {
  label: string;
  value: string;
  type?: string;
  list?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className="field mt-1"
        type={type}
        list={list}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm font-semibold text-ink/60">
          <Loader2 className="mx-auto animate-spin text-moss" size={24} />
          <p className="mt-2">読み込み中...</p>
        </div>
      }
    >
      <NewTaskContent />
    </Suspense>
  );
}
