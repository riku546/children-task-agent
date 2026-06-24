import { z } from "zod";
import type { ExtractionResult, Priority, TodoCandidate } from "@/lib/types";

const prioritySchema = z.enum(["low", "medium", "high"]).catch("medium");

const candidateSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1).catch("確認"),
  dueDate: z.string().nullable().catch(null),
  assigneeSuggestion: z.string().catch("保護者"),
  childName: z.string().catch("未設定"),
  place: z.string().catch(""),
  priority: prioritySchema,
  notes: z.string().catch("")
});

const extractionSchema = z.object({
  summary: z.string().catch("連絡内容からTODO候補を作成しました"),
  tasks: z.array(candidateSchema).min(1)
});

export function normalizeExtraction(input: unknown): ExtractionResult {
  const parsed = extractionSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return createFallbackExtraction(String(input || ""));
}

export function createFallbackExtraction(text: string): ExtractionResult {
  const normalized = text.replace(/\s+/g, " ").trim();
  const dueDate = inferDueDate(normalized);
  const type = inferType(normalized);
  const priority: Priority = /至急|必ず|重要|締切|期限/.test(normalized) ? "high" : "medium";
  const title = buildTitle(normalized, type);

  const candidate: TodoCandidate = {
    title,
    type,
    dueDate,
    assigneeSuggestion: "保護者",
    childName: inferChildName(normalized),
    place: inferPlace(normalized),
    priority,
    notes: normalized.slice(0, 180)
  };

  return {
    summary: normalized ? normalized.slice(0, 80) : "入力内容を確認してTODO候補を作成してください",
    tasks: [candidate]
  };
}

export async function extractWithOpenRouter(text: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return createFallbackExtraction(text);

  const prompt = [
    "あなたは育児事務を支援するTODO抽出エンジンです。",
    "ユーザー確認済みテキストだけを入力として扱い、元ファイルや確認前テキストは存在しない前提です。",
    "出力はJSONのみ。summaryとtasksを返してください。",
    "tasksの各要素は title,type,dueDate,assigneeSuggestion,childName,place,priority,notes を持ちます。",
    "dueDateはYYYY-MM-DDまたはnull。priorityはlow/medium/high。",
    "",
    `確認済みテキスト:\n${text}`
  ].join("\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Childcare Task Agent"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) return createFallbackExtraction(text);

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  try {
    return normalizeExtraction(JSON.parse(content));
  } catch {
    return createFallbackExtraction(text);
  }
}

function inferDueDate(text: string) {
  const today = new Date();
  const makeDate = (offset: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  if (/今日|本日/.test(text)) return makeDate(0);
  if (/明日/.test(text)) return makeDate(1);
  if (/明後日/.test(text)) return makeDate(2);

  const match = text.match(/(\d{1,2})[\/月](\d{1,2})日?/);
  if (!match) return null;
  const year = today.getFullYear();
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inferType(text: string) {
  if (/提出|申込|出す/.test(text)) return "提出";
  if (/持参|持って|持ち物|用意/.test(text)) return "持参";
  if (/支払|集金|振込|料金/.test(text)) return "支払い";
  if (/予約|面談|申し込み/.test(text)) return "予約";
  if (/参加|出席|行事/.test(text)) return "参加";
  return "確認";
}

function inferPlace(text: string) {
  const places = ["保育園", "幼稚園", "学校", "小学校", "習い事", "病院", "児童館"];
  return places.find((place) => text.includes(place)) || "";
}

function inferChildName(text: string) {
  const match = text.match(/対象[:：]\s*([^\s、。]+)/);
  return match?.[1] || "未設定";
}

function buildTitle(text: string, type: string) {
  if (!text) return "連絡内容を確認する";
  const head = text.slice(0, 34);
  if (type === "持参") return `${head}を用意する`;
  if (type === "提出") return `${head}を提出する`;
  return `${head}を確認する`;
}
