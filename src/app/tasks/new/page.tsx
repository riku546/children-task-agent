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
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1 border-b border-zinc-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider uppercase text-zinc-500">
            Task Creation & AI Extraction
          </p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            お便り・連絡からTODO作成
          </h1>
        </div>
        <p className="text-xs text-zinc-500">
          写真やPDFを取り込むとAIが持ち物や提出物を自動抽出します
        </p>
      </div>

      {/* 統合スプリットパネルワークスペース（左右一体型パネル） */}
      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xs grid lg:grid-cols-[380px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
        {/* 左ペイン: 入力ソースパネル */}
        <div className="flex flex-col bg-zinc-50/50 p-5">
          <div className="border-b border-zinc-200 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              1. ソースの選択・取り込み
            </span>
          </div>

          {/* 入力モード切替タブ */}
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-md border border-zinc-200 bg-zinc-100/80 p-0.5">
            {modes.map((item) => {
              const Icon = item.icon;
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                  onClick={() => setMode(item.id)}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* グループ選択 */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-zinc-700" htmlFor="group">
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
          </div>

          {/* ファイル取込・音声入力ボタン群 */}
          <div className="mt-4 grid gap-2">
            <label className="button-secondary cursor-pointer justify-start">
              <Camera size={14} className="text-zinc-500" />
              <span>写真を撮影</span>
              <input
                className="hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImage}
              />
            </label>
            <label className="button-secondary cursor-pointer justify-start">
              <Upload size={14} className="text-zinc-500" />
              <span>画像ファイルを選択</span>
              <input className="hidden" type="file" accept="image/*" onChange={handleImage} />
            </label>
            <label className="button-secondary cursor-pointer justify-start">
              <FileText size={14} className="text-zinc-500" />
              <span>PDFを選択 (複数ページ対応)</span>
              <input className="hidden" type="file" accept="application/pdf" onChange={handlePdf} />
            </label>
            <button type="button" className="button-secondary justify-start" onClick={startVoice}>
              <Mic
                size={14}
                className={listening ? "text-rose-500 animate-pulse" : "text-zinc-500"}
              />
              <span>{listening ? "聞き取り中..." : "音声で入力"}</span>
            </button>
          </div>

          {/* プレビューエリア */}
          {previewUrl ? (
            <div className="mt-4 rounded border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <span className="text-xs font-semibold text-zinc-700">添付プレビュー</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 transition"
                  onClick={clearImage}
                >
                  <Trash2 size={12} />
                  削除
                </button>
              </div>
              <img
                src={previewUrl}
                alt="プレビュー"
                className="mt-2 max-h-56 w-full rounded object-contain bg-zinc-50 border border-zinc-100"
              />
              <button
                type="button"
                className="button-primary mt-3 w-full"
                onClick={generate}
                disabled={Boolean(busyText)}
              >
                {busyText ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>画像からTODOをAI抽出</span>
              </button>
            </div>
          ) : null}

          {selectedGroup ? (
            <div className="mt-auto pt-6 text-[11px] text-zinc-500">
              対象グループ:{" "}
              <span className="font-semibold text-zinc-700">{selectedGroup.name}</span>
            </div>
          ) : null}
        </div>

        {/* 右ペイン: エディタ & TODO候補レビュー */}
        <div className="flex flex-col divide-y divide-zinc-200">
          {/* ソーステキスト確認エリア */}
          <div className="p-5">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-bold uppercase tracking-wider text-zinc-600"
                htmlFor="confirmed-text"
              >
                2. 読み取りテキストの確認・編集
              </label>
              <span className="text-[11px] text-zinc-600">直接編集可能</span>
            </div>
            <textarea
              id="confirmed-text"
              className="field mt-2.5 min-h-36 resize-y font-mono text-xs leading-relaxed"
              value={confirmedText}
              onChange={(event) => setConfirmedText(event.target.value)}
              placeholder="お便りのテキストをここに入力するか、左のメニューから写真・PDFを取り込んでください"
            />
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                className="button-primary"
                onClick={generate}
                disabled={Boolean(busyText) || (!confirmedText.trim() && !previewUrl)}
              >
                {busyText ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>テキストからTODO候補を抽出</span>
              </button>
              {busyText ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Loader2 className="animate-spin" size={13} />
                  {busyText}
                </span>
              ) : null}
            </div>
          </div>

          {/* 抽出結果・ドラフトTODOリスト */}
          {result ? (
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                      3. 生成されたTODO候補
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                      {candidates.length} 件
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{result.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addManualCandidate}
                    className="button-secondary text-xs"
                  >
                    <Plus size={13} />
                    <span>行を追加</span>
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={save}
                    disabled={Boolean(busyText) || candidates.length === 0}
                  >
                    <Save size={14} />
                    <span>確定して一括登録</span>
                  </button>
                </div>
              </div>

              {/* フラットなドラフトリスト（カードではなくボーダー区切りの行） */}
              <div className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
                {candidates.map((candidate, index) => (
                  <div
                    key={`${candidate.title}-${index}`}
                    className="py-4 space-y-3 transition hover:bg-zinc-50/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-zinc-600 font-mono">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-zinc-500 hover:text-rose-600 transition"
                        onClick={() =>
                          setCandidates((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        削除
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Field
                          label="タイトル"
                          value={candidate.title}
                          onChange={(value) => updateCandidate(index, { title: value })}
                        />
                      </div>
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
                      <label className="block text-xs font-semibold text-zinc-700">
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

                    <label className="block text-xs font-semibold text-zinc-700">
                      メモ・補足
                      <input
                        type="text"
                        className="field mt-1"
                        value={candidate.notes}
                        onChange={(event) => updateCandidate(index, { notes: event.target.value })}
                        placeholder="持ち物の個数や注意事項など"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center text-zinc-500">
              <Sparkles size={24} className="text-zinc-500 mb-2" />
              <p className="text-xs font-medium text-zinc-600">
                左側から画像・PDFを取り込むか、上のテキストエリアに入力して「TODO候補を抽出」を押してください。
              </p>
              <button
                type="button"
                onClick={addManualCandidate}
                className="button-secondary mt-4 text-xs"
              >
                <Plus size={13} />
                手動でTODOを入力する
              </button>
            </div>
          )}
        </div>
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
    <label className="block text-xs font-semibold text-zinc-700">
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
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs font-semibold text-zinc-500">
          <Loader2 className="mx-auto animate-spin text-emerald-600" size={20} />
          <p className="mt-2">読み込み中...</p>
        </div>
      }
    >
      <NewTaskContent />
    </Suspense>
  );
}
