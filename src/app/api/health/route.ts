import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    vercelRegion: process.env.VERCEL_REGION || "local",
    nodeEnv: process.env.NODE_ENV
  };

  // 1. DATABASE_URLの解析（パスワードは隠す）
  const rawDbUrl = process.env.DATABASE_URL;
  if (!rawDbUrl) {
    diagnostics.databaseConfig = { configured: false, error: "DATABASE_URL is not set" };
  } else {
    try {
      const parsed = new URL(rawDbUrl);
      diagnostics.databaseConfig = {
        configured: true,
        protocol: parsed.protocol,
        host: parsed.hostname,
        port: parsed.port,
        username: parsed.username,
        hasProjectRefInUsername: parsed.username.includes("."),
        hasPgBouncerParam: parsed.searchParams.get("pgbouncer") === "true",
        connectionLimit: parsed.searchParams.get("connection_limit"),
        database: parsed.pathname
      };
    } catch (e: any) {
      diagnostics.databaseConfig = { configured: true, parseError: e.message };
    }
  }

  // 2. Prisma DB接続テスト（所要時間の計測）
  const dbStart = Date.now();
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected, NOW() as server_time`;
    diagnostics.databaseConnection = {
      status: "connected",
      latencyMs: Date.now() - dbStart,
      result
    };
  } catch (error: any) {
    diagnostics.databaseConnection = {
      status: "failed",
      latencyMs: Date.now() - dbStart,
      errorCode: error.code,
      errorMessage: error.message
    };
  }

  // 3. Supabase Auth API 疎通テスト
  const authStart = Date.now();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    diagnostics.supabaseAuth = {
      status: error ? "error" : "ok",
      latencyMs: Date.now() - authStart,
      hasSession: Boolean(data?.session),
      errorMessage: error?.message
    };
  } catch (error: any) {
    diagnostics.supabaseAuth = {
      status: "failed",
      latencyMs: Date.now() - authStart,
      errorMessage: error.message
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
