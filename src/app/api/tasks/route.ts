import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser } from "@/lib/auth";
import { createTasks, listTasks } from "@/lib/repository";

const taskSchema = z.object({
  groupId: z.string().optional().nullable(),
  sourceText: z.string().optional().nullable(),
  tasks: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      type: z.string().optional(),
      dueDate: z.string().optional().nullable(),
      childName: z.string().optional().nullable(),
      assigneeName: z.string().optional().nullable(),
      priority: z.enum(["low", "medium", "high"]).optional()
    })
  )
});

export async function GET() {
  const user = await ensureCurrentUser();
  return NextResponse.json({ tasks: await listTasks(user) });
}

export async function POST(request: Request) {
  const user = await ensureCurrentUser();
  const body = taskSchema.parse(await request.json());
  const tasks = await createTasks(user, body);
  return NextResponse.json({ tasks });
}
