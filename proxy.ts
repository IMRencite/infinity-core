import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applyHqProductionHeaders } from "@/lib/infinity/hq-production-deployment/headers";
import { classifyHqPath, isHqProductionHost, isHqProductionRuntime } from "@/lib/infinity/hq-production-deployment/surface";

function askReviewIsolatedPreview(pathname: string): boolean {
  if (process.env.ASKREVIEW_ISOLATED_PREVIEW !== "1") return false;
  return (
    pathname.startsWith("/occupancynpv")
    || pathname.startsWith("/api/occupancynpv")
    || pathname.startsWith("/api/checkout")
    || pathname.startsWith("/api/webhooks/stripe")
    || pathname.startsWith("/api/runtime")
  );
}

export async function proxy(request: NextRequest) {
  if (askReviewIsolatedPreview(request.nextUrl.pathname)) {
    return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }
  const response = await updateSession(request);
  if (request.nextUrl.pathname.startsWith("/askreview")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  const productionSurface = isHqProductionHost(request.nextUrl.hostname) || isHqProductionRuntime();
  if (productionSurface) {
    applyHqProductionHeaders(response.headers, { includeHsts: request.nextUrl.protocol === "https:" || isHqProductionHost(request.nextUrl.hostname) });
    const classification = classifyHqPath(request.nextUrl.pathname);
    if (classification === "LOCAL_ONLY") {
      return new NextResponse(JSON.stringify({ ok: false, reason: "LOCAL_ONLY" }), {
        status: 404,
        headers: { "content-type": "application/json", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.includes("-auth-token") || cookie.name.startsWith("sb-"));
    if ((request.nextUrl.pathname === "/" || request.nextUrl.pathname === "") && !hasAuthCookie) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      return NextResponse.redirect(login);
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/operator-console/hq-events|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
