import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getAppOrigin(request);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
