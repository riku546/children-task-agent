import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser } from "@/lib/auth";
import { extractWithOpenRouter } from "@/lib/extraction";
import { saveExtraction } from "@/lib/repository";

const extractSchema = z.object({
  groupId: z.string().optional().nullable(),
  inputType: z.string().default("text"),
  confirmedText: z.string().optional().default(""),
  imageUrl: z.string().optional()
});

export async function POST(request: Request) {
  const user = await ensureCurrentUser();
  const body = extractSchema.parse(await request.json());
  const result = await extractWithOpenRouter({
    text: body.confirmedText,
    imageUrl: body.imageUrl
  });
  const savedText = result.extractedText || body.confirmedText || result.summary;
  await saveExtraction(user, {
    groupId: body.groupId,
    inputType: body.inputType,
    confirmedText: savedText,
    rawJson: result
  });
  return NextResponse.json(result);
}
