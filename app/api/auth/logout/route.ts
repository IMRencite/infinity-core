import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hqSessionCookieOptions } from "@/lib/infinity/hq-production-deployment/session";
import { hostnameFromRequest } from "@/lib/infinity/hq-production-deployment/surface";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const options = hqSessionCookieOptions({
    hostname: hostnameFromRequest(request),
    protocol: new URL(request.url).protocol,
  });
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.includes("-auth-token") || cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        ...options,
        maxAge: 0,
      });
    }
  }
  return response;
}
