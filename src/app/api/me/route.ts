import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { prisma, tryDb } from "@/lib/prisma";
import { listGroups } from "@/lib/repository";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await ensureCurrentUser();
  const groups = await listGroups(user);
  return NextResponse.json({ user, groups });
}

export async function PATCH(request: Request) {
  const user = await ensureCurrentUser();
  const body = await request.json();
  const { name } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
  }

  const updatedName = name.trim();

  await tryDb(async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: updatedName }
    });
    await prisma.familyMember.updateMany({
      where: { userId: user.id },
      data: { displayName: updatedName }
    });
  });

  try {
    const supabase = await createClient();
    await supabase.auth.updateUser({
      data: { name: updatedName, full_name: updatedName }
    });
  } catch (err) {
    console.error("Failed to update supabase user metadata", err);
  }

  return NextResponse.json({ ok: true, name: updatedName });
}
