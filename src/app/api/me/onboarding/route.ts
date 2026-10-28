import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { completeOnboarding } from "@/lib/repository";

export async function POST() {
  const user = await ensureCurrentUser();
  const saved = await completeOnboarding(user.id);
  if (!saved) {
    return NextResponse.json(
      { error: "オンボーディング状態を保存できませんでした" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
