import { NextResponse } from "next/server";
import { createInvite } from "@/lib/repository";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const invite = await createInvite(id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({
    invite,
    url: `${baseUrl}/groups/join?token=${invite.token}`
  });
}
