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
  extractedText: z.string().optional(),
  tasks: z.array(candidateSchema).min(1)
});

export function normalizeExtraction(input: unknown): ExtractionResult {
  const parsed = extractionSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return createFallbackExtraction(typeof input === "string" ? input : JSON.stringify(input || ""));
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
    extractedText: normalized,
    tasks: [candidate]
  };
}

export type ExtractInput =
  | string
  | {
      text?: string;
      imageUrl?: string;
    };

export async function extractWithOpenRouter(input: ExtractInput) {
  const text = typeof input === "string" ? input : input.text || "";
  const imageUrl = typeof input === "object" ? input.imageUrl : undefined;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return createFallbackExtraction(text);

  const systemInstructions = [
    "あなたは園や学校のお便り・連絡から家庭のTODOを抽出する育児タスク支援AIです。",
    "画像またはテキストから、必要なタスク（提出物、持ち物、集金、行事、受診など）を漏れなく具体的に抽出してください。",
    "出力は必ずJSON形式のみとし、マークダウンのコードブロック等は含めないでください。",
    "スキーマ形式:",
    "{",
    '  "summary": "連絡全体の要約（1行）",',
    '  "extractedText": "画像または入力から読み取った全文章テキスト",',
    '  "tasks": [',
    "    {",
    '      "title": "タスク名（例: 雑巾2枚を持参する）",',
    '      "type": "提出 / 持参 / 支払い / 予約 / 参加 / 確認",',
    '      "dueDate": "YYYY-MM-DD または null",',
    '      "assigneeSuggestion": "担当の提案（例: お母さん、お父さん、保護者）",',
    '      "childName": "対象の子どもの名前（不明なら未設定）",',
    '      "place": "保育園 / 学校 / 児童館 などの場所（不明なら空文字）",',
    '      "priority": "low / medium / high",',
    '      "notes": "補足説明や詳細メモ"',
    "    }",
    "  ]",
    "}"
  ].join("\n");

  const userContent: any[] = [];
  if (text) {
    userContent.push({
      type: "text",
      text: `入力テキスト:\n${text}`
    });
  } else if (!imageUrl) {
    userContent.push({
      type: "text",
      text: "連絡内容からTODOを抽出してください。"
    });
  }

  if (imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: imageUrl
      }
    });
  }

  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Childcare Task Agent"
    },
    body: JSON.stringify({
      model,
      // openrouter-security-setting-guide.md 準拠:
      // ZDR（Zero Data Retention）を強制し、データ学習を拒否
      provider: {
        data_collection: "deny",
        zdr: true
      },
      messages: [
        { role: "system", content: systemInstructions },
        {
          role: "user",
          content:
            userContent.length === 1 && userContent[0].type === "text"
              ? userContent[0].text
              : userContent
        }
      ],
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

  const match = text.match(/(\d{1,2})[/月](\d{1,2})日?/);
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
