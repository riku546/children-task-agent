import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser } from "@/lib/auth";
import { addChild, listGroups } from "@/lib/repository";

const childSchema = z.object({
  name: z.string().min(1)
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await ensureCurrentUser();
  const { id } = await context.params;
  const groups = await listGroups(user);
  if (!groups.some((group) => group.id === id)) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const body = childSchema.parse(await request.json());
  const child = await addChild(id, body.name);
  return NextResponse.json({ child });
}
