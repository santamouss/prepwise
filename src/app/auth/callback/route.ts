import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function safeRelativePath(next: string | null): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const next = safeRelativePath(requestUrl.searchParams.get("next"));

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(oauthError)}`,
        requestUrl.origin,
      ),
    );
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_exchange", requestUrl.origin),
      );
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
