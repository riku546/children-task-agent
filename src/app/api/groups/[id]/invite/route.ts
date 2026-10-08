import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { createInvite, listGroups } from "@/lib/repository";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await ensureCurrentUser();
  const { id } = await context.params;
  const groups = await listGroups(user);
  if (!groups.some((group) => group.id === id)) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const invite = await createInvite(id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({
    invite,
    url: `${baseUrl}/groups/join?token=${invite.token}`
  });
}
