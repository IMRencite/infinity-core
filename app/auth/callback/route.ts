import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next");
  const recoveryNext =
    nextPath === "/reset-password" || searchParams.get("type") === "recovery";

  if (recoveryNext) {
    const recoveryParams = new URLSearchParams(searchParams);
    recoveryParams.set("type", "recovery");
    if (code) recoveryParams.set("code", code);
    const tokenHash = searchParams.get("token_hash");
    if (tokenHash) recoveryParams.set("token_hash", tokenHash);
    return NextResponse.redirect(`${origin}/auth/recovery?${recoveryParams.toString()}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
    }

    return NextResponse.redirect(`${origin}/login?confirmed=true`);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }
}
