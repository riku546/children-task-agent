"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // ログインページでは表示しない
  if (pathname === "/login") {
    return null;
  }

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      // Supabaseのブラウザセッションをクリア
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase signOut error:", err);
      }

      // サーバー側のクッキーをクリア
      await fetch("/api/auth/logout", {
        method: "POST"
      });

      // ログインページへリダイレクト
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="button-secondary min-h-9 px-3 text-ink/75 transition hover:border-red-300 hover:text-red-600 focus-ring"
      title="ログアウト"
    >
      <LogOut size={17} />
      <span className="hidden sm:inline">{loading ? "ログアウト中..." : "ログアウト"}</span>
    </button>
  );
}
