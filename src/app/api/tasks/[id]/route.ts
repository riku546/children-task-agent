import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser } from "@/lib/auth";
import { getTask, updateTask } from "@/lib/repository";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["TODO", "DONE"]).optional(),
  googleEventId: z.string().nullable().optional()
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await ensureCurrentUser();
  const { id } = await context.params;
  const task = await getTask(user, id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await ensureCurrentUser();
  const { id } = await context.params;
  const body = updateSchema.parse(await request.json());
  const task = await updateTask(user, id, body);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task });
}
