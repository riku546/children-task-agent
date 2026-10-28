import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { ensureCurrentUser } from "@/lib/auth";
import { acceptGroupInvite, InviteJoinError, previewGroupInvite } from "@/lib/invite-join";

const joinSchema = z.object({
  token: z.string().trim().min(1).max(200)
});

function joinErrorResponse(error: unknown) {
  if (error instanceof InviteJoinError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "招待リンクが正しくありません" }, { status: 400 });
  }
  throw error;
}

export async function GET(request: Request) {
  const user = await ensureCurrentUser();
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const preview = await previewGroupInvite(user, token);
    return NextResponse.json({ preview });
  } catch (error) {
    return joinErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await ensureCurrentUser();
  try {
    const body = joinSchema.parse(await request.json());
    const result = await acceptGroupInvite(user, body.token);
    return NextResponse.json({ result });
  } catch (error) {
    return joinErrorResponse(error);
  }
}
