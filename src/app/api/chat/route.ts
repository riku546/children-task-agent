import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCurrentUser, UnauthorizedError } from "@/lib/auth";
import { runChatSession } from "@/lib/chat-agent";
import type { ChatAgentEvent } from "@/lib/chat-agent-shared";
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

function encodeNdjsonEvent(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

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

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const push = (payload: Record<string, unknown>) => {
          controller.enqueue(encodeNdjsonEvent(payload));
        };
        const onEvent = (event: ChatAgentEvent) => {
          push(event);
        };
        try {
          const result = await runChatSession({
            user,
            request,
            messages,
            pendingRemoval: body.pendingRemoval ?? null,
            attachment: body.attachment ?? null,
            onEvent
          });
          push({
            type: "done",
            reply: result.reply,
            actions: result.actions,
            pendingRemoval: result.pendingRemoval ?? null
          });
          controller.close();
        } catch {
          push({ type: "error", error: "チャットの処理に失敗しました" });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache"
      }
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
