export type ChatTextSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const ATTACHMENT_PLACEHOLDER = "（添付を確認してください）";

export const TASK_ANSWERS_INSTRUCTION =
  "これはタスク作成への回答です。回答にタスク名があるときは、その内容で create_task を1件呼んでください。期限、子ども、担当、種類、詳しい内容、優先度、グループは、回答に書いてあるものだけ入れてください。書いていない項目は空のままで、聞き返さないでください。タスク名が読み取れないとき、または作成をやめる依頼のときは create_task を呼ばず、タスク名が無いときだけタスク名を聞き返してください。タイトルを「タスク」や「新しいタスク」にしないでください。優先度は低を low、中を medium、高を high にしてください。";

export function buildChatSendPayload(input: {
  draft: string;
  mode: "task_answers" | null;
  hasAttachment: boolean;
  overrideText?: string;
  overrideApiText?: string;
}): { displayText: string; apiText?: string } | null {
  if (input.overrideText !== undefined) {
    return {
      displayText: input.overrideText,
      apiText: input.overrideApiText
    };
  }

  const trimmed = input.draft.trim();
  if (!trimmed && !input.hasAttachment) {
    return null;
  }

  if (input.mode === "task_answers") {
    if (trimmed) {
      return {
        displayText: trimmed,
        apiText: `${TASK_ANSWERS_INSTRUCTION}\n${trimmed}`
      };
    }
    return {
      displayText: ATTACHMENT_PLACEHOLDER,
      apiText: ATTACHMENT_PLACEHOLDER
    };
  }

  return {
    displayText: trimmed || ATTACHMENT_PLACEHOLDER
  };
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>"'`]+/g;

function isSafeRelativePath(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  if (href.includes("..") || href.includes("\\") || /\s/.test(href)) return false;
  const lower = href.toLowerCase();
  if (lower.startsWith("javascript:")) return false;
  return true;
}

export function splitChatText(input: string): ChatTextSegment[] {
  const segments: ChatTextSegment[] = [];
  let lastIndex = 0;

  const mdMatches: Array<{ start: number; end: number; label: string; href: string }> = [];
  MARKDOWN_LINK_RE.lastIndex = 0;
  let mdMatch: RegExpExecArray | null = MARKDOWN_LINK_RE.exec(input);
  while (mdMatch !== null) {
    mdMatches.push({
      start: mdMatch.index,
      end: mdMatch.index + mdMatch[0].length,
      label: mdMatch[1],
      href: mdMatch[2]
    });
    mdMatch = MARKDOWN_LINK_RE.exec(input);
  }

  const urlMatches: Array<{ start: number; end: number; href: string }> = [];
  BARE_URL_RE.lastIndex = 0;
  let urlMatch: RegExpExecArray | null = BARE_URL_RE.exec(input);
  while (urlMatch !== null) {
    const current = urlMatch;
    const insideMd = mdMatches.some((m) => current.index >= m.start && current.index < m.end);
    if (!insideMd) {
      urlMatches.push({
        start: current.index,
        end: current.index + current[0].length,
        href: current[0]
      });
    }
    urlMatch = BARE_URL_RE.exec(input);
  }

  type Marker = { start: number; end: number; segment: ChatTextSegment };
  const markers: Marker[] = [];

  for (const m of mdMatches) {
    if (isSafeRelativePath(m.href)) {
      markers.push({
        start: m.start,
        end: m.end,
        segment: { type: "link", text: m.label, href: m.href }
      });
    } else {
      markers.push({
        start: m.start,
        end: m.end,
        segment: { type: "text", text: input.slice(m.start, m.end) }
      });
    }
  }

  for (const u of urlMatches) {
    markers.push({
      start: u.start,
      end: u.end,
      segment: { type: "link", text: u.href, href: u.href }
    });
  }

  markers.sort((a, b) => a.start - b.start);

  for (const marker of markers) {
    if (marker.start < lastIndex) continue;
    if (marker.start > lastIndex) {
      segments.push({ type: "text", text: input.slice(lastIndex, marker.start) });
    }
    segments.push(marker.segment);
    lastIndex = marker.end;
  }

  if (lastIndex < input.length) {
    segments.push({ type: "text", text: input.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ type: "text", text: input }];
  }

  return segments;
}
