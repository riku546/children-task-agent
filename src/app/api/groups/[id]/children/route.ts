import { NextResponse } from "next/server";
import { z } from "zod";
import { addChild } from "@/lib/repository";

const childSchema = z.object({
  name: z.string().min(1)
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = childSchema.parse(await request.json());
  const child = await addChild(id, body.name);
  return NextResponse.json({ child });
}
