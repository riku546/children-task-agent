import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const protectedPagePrefixes = ["/dashboard", "/groups", "/tasks", "/profile"];
const publicAuthPrefixes = ["/login", "/auth/callback", "/api/auth", "/api/health"];

function isPublicAuthPath(pathname: string) {
  return publicAuthPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith("/api/") && !isPublicAuthPath(pathname);
}

export async function proxy(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof updateSession>> | undefined;
  try {
    auth = await updateSession(request);
  } catch (error) {
    if (isPublicAuthPath(request.nextUrl.pathname)) {
      return NextResponse.next();
    }

    if (isProtectedApi(request.nextUrl.pathname)) {
      return NextResponse.json({ error: "Authentication is not configured" }, { status: 500 });
    }

    throw error;
  }

  const { pathname, search } = request.nextUrl;

  if (!auth.user && isProtectedApi(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!auth.user && isProtectedPage(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (auth.user && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next?.startsWith("/") ? next : "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return auth.response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
