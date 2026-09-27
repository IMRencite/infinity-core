import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next");
  const recoveryNext =
    nextPath === "/reset-password" || searchParams.get("type") === "recovery";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        recoveryNext ? `${origin}/reset-password` : `${origin}/login?error=confirmation_failed`,
      );
    }

    if (recoveryNext) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    return NextResponse.redirect(`${origin}/login?confirmed=true`);
  } catch {
    return NextResponse.redirect(
      recoveryNext ? `${origin}/reset-password` : `${origin}/login?error=confirmation_failed`,
    );
  }
}
