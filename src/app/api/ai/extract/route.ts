import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser } from "@/lib/auth";
import { extractWithOpenRouter } from "@/lib/extraction";
import { saveExtraction } from "@/lib/repository";

const extractSchema = z.object({
  groupId: z.string().optional().nullable(),
  inputType: z.string().default("text"),
  confirmedText: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await ensureCurrentUser();
  const body = extractSchema.parse(await request.json());
  const result = await extractWithOpenRouter(body.confirmedText);
  await saveExtraction(user, {
    groupId: body.groupId,
    inputType: body.inputType,
    confirmedText: body.confirmedText,
    rawJson: result
  });
  return NextResponse.json(result);
}
