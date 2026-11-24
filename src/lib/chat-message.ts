export type ChatTextSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

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
