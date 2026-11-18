import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser, UnauthorizedError } from "@/lib/auth";
import { runChatSession } from "@/lib/chat-agent";
import { imageUrlSizeError } from "@/lib/image-size";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000)
});

const bodySchema = z.object({
  messages: z.array(messageSchema).max(20),
  pendingRemoval: z
    .object({
      groupId: z.string().min(1),
      memberId: z.string().min(1)
    })
    .nullable()
    .optional(),
  attachment: z
    .object({
      text: z.string().max(15000).optional(),
      imageUrl: z.string().optional()
    })
    .nullable()
    .optional()
});

export async function POST(request: Request) {
  try {
    const user = await ensureCurrentUser();
    const body = bodySchema.parse(await request.json());

    if (body.attachment?.imageUrl) {
      const sizeError = imageUrlSizeError(body.attachment.imageUrl);
      if (sizeError) {
        return NextResponse.json({ error: sizeError.error }, { status: sizeError.status });
      }
    }

    const messages = body.messages.slice(-8);
    const result = await runChatSession({
      user,
      request,
      messages,
      pendingRemoval: body.pendingRemoval ?? null,
      attachment: body.attachment ?? null
    });

    return NextResponse.json({
      reply: result.reply,
      actions: result.actions,
      pendingRemoval: result.pendingRemoval ?? null
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容が不正です" }, { status: 400 });
    }
    return NextResponse.json({ error: "チャットの処理に失敗しました" }, { status: 500 });
  }
}
