import { NextResponse } from "next/server";
import { toDataURL } from "qrcode";
import { ensureCurrentUser } from "@/lib/auth";
import { createInvite, userCanManageGroup } from "@/lib/repository";
import { getAppOrigin } from "@/lib/url";

function readGroupId(request: Request, raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value) return decodeURIComponent(value);
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = parts.indexOf("groups");
  return index >= 0 ? decodeURIComponent(parts[index + 1] ?? "") : "";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string | string[] }> }
) {
  const user = await ensureCurrentUser();
  const { id } = await context.params;
  const groupId = readGroupId(request, id);
  if (!groupId || !(await userCanManageGroup(user, groupId))) {
    return NextResponse.json(
      { error: "グループが見つかりません。ページを再読み込みしてから、もう一度お試しください。" },
      { status: 404 }
    );
  }

  const invite = await createInvite(groupId);
  const url = `${getAppOrigin(request)}/groups/join?token=${invite.token}`;
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: { dark: "#18181b", light: "#ffffff" }
    });
  } catch {
    console.error("Failed to render invite QR code");
  }

  return NextResponse.json({
    invite,
    url,
    qrDataUrl
  });
}
