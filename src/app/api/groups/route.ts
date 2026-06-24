import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser } from "@/lib/auth";
import { createGroup, listGroups } from "@/lib/repository";

const groupSchema = z.object({
  name: z.string().min(1)
});

export async function GET() {
  const user = await ensureCurrentUser();
  return NextResponse.json({ groups: await listGroups(user) });
}

export async function POST(request: Request) {
  const user = await ensureCurrentUser();
  const body = groupSchema.parse(await request.json());
  const group = await createGroup(user, body.name);
  return NextResponse.json({ group });
}
