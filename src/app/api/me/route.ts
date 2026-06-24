import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { listGroups } from "@/lib/repository";

export async function GET() {
  const user = await ensureCurrentUser();
  const groups = await listGroups(user);
  return NextResponse.json({ user, groups });
}
