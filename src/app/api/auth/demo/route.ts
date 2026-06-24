import { NextResponse } from "next/server";
import { z } from "zod";
import { setDemoSession, ensureCurrentUser } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional()
});

export async function POST(request: Request) {
  const body = loginSchema.parse(await request.json());
  await setDemoSession(body.email);
  const user = await ensureCurrentUser();
  return NextResponse.json({ user });
}
