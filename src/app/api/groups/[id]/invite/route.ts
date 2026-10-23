import { NextResponse } from "next/server";
import { toDataURL } from "qrcode";
import { ensureCurrentUser } from "@/lib/auth";
import { createInvite, listGroups } from "@/lib/repository";
import { getAppOrigin } from "@/lib/url";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await ensureCurrentUser();
  const { id } = await context.params;
  const groups = await listGroups(user);
  if (!groups.some((group) => group.id === id)) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const invite = await createInvite(id);
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
