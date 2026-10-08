import { NextResponse } from "next/server";
import { z } from "zod";
import { syncApplicationUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
});

export async function POST(request: Request) {
  const body = signupSchema.parse(await request.json());
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        name: body.name?.trim() || body.email.split("@")[0]
      },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`
    }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.session) {
    return NextResponse.json({
      message: "確認メールを送信しました。メール内のリンクから登録を完了してください。",
      needsEmailConfirmation: true
    });
  }

  if (!data.user) {
    return NextResponse.json({ error: "登録後のユーザー情報を確認できませんでした" }, { status: 401 });
  }

  const user = await syncApplicationUser(data.user);
  return NextResponse.json({ user });
}
