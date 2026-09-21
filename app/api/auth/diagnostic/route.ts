import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/public-env";
import { isHqProductionRuntime } from "@/lib/infinity/hq-production-deployment/surface";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (isHqProductionRuntime() && !user) {
    return NextResponse.json(
      { ok: false, reason: "UNAUTHENTICATED" },
      { status: 401, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  }

  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const allCookies = cookieStore.getAll();
  const authCookieNames = allCookies
    .map((cookie) => cookie.name)
    .filter((name) => name.includes("-auth-token") || name.includes("sb-"));

  let membershipPresent = false;
  if (user) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    membershipPresent = Boolean(membership?.organization_id);
  }

  let browserProjectRef = "unknown";
  try {
    browserProjectRef = new URL(getPublicSupabaseEnv().url).hostname.split(".")[0] ?? "unknown";
  } catch {
    browserProjectRef = "malformed";
  }

  return NextResponse.json({
    browserProjectRef,
    cookiePresent: authCookieNames.length > 0,
    authCookieNames: isHqProductionRuntime() ? authCookieNames.map(() => "sb-auth-token") : authCookieNames,
    authCookieCount: authCookieNames.length,
    userAuthenticated: Boolean(user),
    userIdPresent: Boolean(user?.id),
    getUserError: error?.message ?? null,
    organizationMembershipPresent: membershipPresent,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
