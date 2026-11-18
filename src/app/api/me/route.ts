import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { DisplayNameError, updateDisplayName } from "@/lib/display-name";
import { needsOnboarding } from "@/lib/onboarding";
import { isOnboardingComplete, listGroups } from "@/lib/repository";

export async function GET() {
  const user = await ensureCurrentUser();
  const groups = await listGroups(user);
  const completed = await isOnboardingComplete(user.id);
  return NextResponse.json({
    user,
    groups,
    onboardingRequired: needsOnboarding({ completed, groups })
  });
}

export async function PATCH(request: Request) {
  const user = await ensureCurrentUser();
  const body = await request.json();
  const { name } = body;

  if (typeof name !== "string") {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
  }

  try {
    const updatedName = await updateDisplayName(user, name);
    return NextResponse.json({ ok: true, name: updatedName });
  } catch (err) {
    if (err instanceof DisplayNameError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
