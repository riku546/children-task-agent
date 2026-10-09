import { NextResponse } from "next/server";
import { z } from "zod";
import { syncApplicationUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const body = loginSchema.parse(await request.json());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "メールアドレスまたはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  const user = await syncApplicationUser(data.user);
  return NextResponse.json({ user });
}
