import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/url";

export async function POST(request: Request) {
  const origin = getAppOrigin(request);
  let requestedNext: unknown;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (body && typeof body === "object" && "next" in body) {
      requestedNext = body.next;
    }
  }
  const next = sanitizeNextPath(typeof requestedNext === "string" ? requestedNext : null);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ url: data.url });
}
