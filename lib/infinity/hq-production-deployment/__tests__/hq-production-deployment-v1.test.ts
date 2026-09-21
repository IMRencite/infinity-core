import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyHqPath,
  evaluateHQAuthorizationGate,
  evaluateHQCustomDomainGate,
  evaluateHQHTTPSGate,
  evaluateHQIndexationPrivacyGate,
  evaluateHQPrivateAPIGate,
  evaluateHQPrivateCacheGate,
  evaluateHQProductionEnvironmentGate,
  evaluateHQProductionReadinessGate,
  evaluateHQProductionSessionSecurityGate,
  evaluateHQPublicIsolationGate,
  evaluateHQRuntimeConnectivityGate,
  evaluateHQSecurityHeadersGate,
  hqPrivateApiCount,
  hqPrivateApiDecision,
  hqSessionCookieOptions,
  resolveHqAuthorizationRole,
  safeHqRedirectPath,
} from "../index";
import { evaluateFounderDailyReportProductionPersistenceGate } from "@/lib/infinity/founder-daily-reports";

const root = process.cwd();

function src(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("HQ Production Deployment V1", () => {
  it("classifies private APIs and public-safe routes", () => {
    expect(classifyHqPath("/api/operator-console/daily-report")).toBe("HQ_PRIVATE");
    expect(classifyHqPath("/api/hq/production-runtime")).toBe("HQ_PRIVATE");
    expect(classifyHqPath("/api/public/operations")).toBe("PUBLIC_SAFE");
    expect(classifyHqPath("/login")).toBe("PUBLIC_AUTH");
    expect(classifyHqPath("/api/operator-console/dev/hq-wave-1-v3-canonical-send")).toBe("LOCAL_ONLY");
    expect(hqPrivateApiCount()).toBeGreaterThanOrEqual(12);
  });

  it("rejects unauthenticated and unauthorized operator context", () => {
    expect(hqPrivateApiDecision({ status: "unauthenticated" })).toEqual({
      ok: false,
      status: 401,
      body: { ok: false, reason: "UNAUTHENTICATED" },
    });
    const unauthorized = hqPrivateApiDecision({ status: "no_membership" });
    expect(unauthorized.ok).toBe(false);
    if (!unauthorized.ok) expect(unauthorized.status).toBe(403);
    expect(resolveHqAuthorizationRole({ authenticated: false, organizationMembership: false })).toBe("UNAUTHORIZED");
    expect(evaluateHQAuthorizationGate({
      authenticated: true,
      organizationMembership: true,
      inferredFromEmailText: false,
    }).result).toBe("PASS");
    expect(evaluateHQAuthorizationGate({
      authenticated: true,
      organizationMembership: true,
      inferredFromEmailText: true,
    }).result).toBe("FAIL");
  });

  it("requires secure production session cookies", () => {
    const cookie = hqSessionCookieOptions({ hostname: "hq.imros.io", protocol: "https:" });
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(evaluateHQProductionSessionSecurityGate({
      sessionServerValidated: true,
      httpsOnly: true,
      cookie,
      logoutInvalidates: true,
      privateApiProtected: true,
      secretsExposedClientSide: false,
    }).proof_level).toBe("IMPLEMENTATION_PROVEN");
    expect(evaluateHQProductionSessionSecurityGate({
      sessionServerValidated: true,
      httpsOnly: true,
      cookie,
      logoutInvalidates: true,
      privateApiProtected: true,
      secretsExposedClientSide: false,
      liveCookieInspected: true,
    }).proof_level).toBe("LIVE_SESSION_PROVEN");
  });

  it("blocks localhost runtime and missing env in production", () => {
    expect(evaluateHQProductionEnvironmentGate({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub",
        SUPABASE_SERVICE_ROLE_KEY: "srv",
        INFINITY_RUNTIME_URL: "https://infinity-runtime.vercel.app",
        CRON_SECRET: "secret",
        INFINITY_HQ_SURFACE: "1",
        INFINITY_HQ_PUBLIC_URL: "https://hq.imros.io",
      },
    }).result).toBe("PASS");
    expect(evaluateHQProductionEnvironmentGate({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        INFINITY_RUNTIME_URL: "http://localhost:3000",
        INFINITY_HQ_SURFACE: "1",
      },
    }).result).toBe("FAIL");
    expect(evaluateHQRuntimeConnectivityGate({
      runtimeTarget: "https://infinity-runtime.vercel.app",
      reachable: true,
      responseValid: true,
      internalTrustOk: true,
      timeoutHandled: true,
      degradedDisplayedHonestly: true,
      localhostFallback: false,
      liveAuthenticatedRead: true,
    }).proof_level).toBe("LIVE_SESSION_PROVEN");
    expect(evaluateHQRuntimeConnectivityGate({
      runtimeTarget: "http://localhost:8787",
      reachable: true,
      responseValid: true,
      internalTrustOk: true,
      timeoutHandled: true,
      degradedDisplayedHonestly: true,
      localhostFallback: true,
    }).result).toBe("FAIL");
  });

  it("requires durable daily reports in production", () => {
    expect(evaluateFounderDailyReportProductionPersistenceGate({
      storeKind: "POSTGRES",
      productionRuntime: true,
      usesLocalFile: false,
      todayPersisted: true,
      historicalPersisted: true,
      redeploySafe: true,
      idempotent: true,
    }).result).toBe("PASS");
    expect(evaluateFounderDailyReportProductionPersistenceGate({
      storeKind: "FILESYSTEM",
      productionRuntime: true,
      usesLocalFile: true,
      todayPersisted: true,
      historicalPersisted: true,
      redeploySafe: false,
      idempotent: true,
    }).result).toBe("FAIL");
  });

  it("evaluates HTTPS, headers, cache, indexation, domain, and isolation", () => {
    expect(evaluateHQHTTPSGate({
      certificateValid: true,
      https: true,
      applicationLoads: true,
      authOverHttps: true,
    }).result).toBe("PASS");
    expect(evaluateHQSecurityHeadersGate({
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=()",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "default-src 'self'",
      },
    }).result).toBe("PASS");
    expect(evaluateHQPrivateCacheGate({ privatePagesNoStore: true, privateApisNoStore: true }).result).toBe("PASS");
    expect(evaluateHQIndexationPrivacyGate({ robotsDisallow: true, xRobotsNoindex: true, authWall: true }).result).toBe("PASS");
    expect(evaluateHQCustomDomainGate({
      projectName: "infinity-hq",
      domain: "hq.imros.io",
      vercelAttached: true,
      vercelVerified: true,
      dnsResolves: true,
      correctApplication: true,
    }).result).toBe("PASS");
    expect(evaluateHQCustomDomainGate({
      projectName: "imros-public",
      domain: "hq.imros.io",
      vercelAttached: true,
      vercelVerified: true,
      dnsResolves: true,
      correctApplication: false,
    }).result).toBe("FAIL");
    expect(evaluateHQPublicIsolationGate({
      publicOrigin: "https://imros.io",
      publicServesOperations: true,
      publicServesHq: false,
      body: "<main data-public-operations-room>public</main>",
    }).result).toBe("PASS");
    expect(evaluateHQPublicIsolationGate({
      publicOrigin: "https://imros.io",
      publicServesOperations: true,
      publicServesHq: true,
      body: "FounderDailyOperationsReport",
    }).result).toBe("FAIL");
  });

  it("readiness fails unless every required gate is true", () => {
    const ready = {
      deploymentReady: true,
      auth: true,
      authorization: true,
      privateApis: true,
      environment: true,
      runtime: true,
      persistence: true,
      dailyReportsDurable: true,
      customDomain: true,
      https: true,
      privateCache: true,
      publicPrivacy: true,
      productionBuild: true,
    };
    expect(evaluateHQProductionReadinessGate(ready).result).toBe("PASS");
    expect(evaluateHQProductionReadinessGate({ ...ready, dailyReportsDurable: false }).result).toBe("FAIL");
  });

  it("sanitizes HQ redirects", () => {
    expect(safeHqRedirectPath("/dashboard/daily-reports")).toBe("/dashboard/daily-reports");
    expect(safeHqRedirectPath("https://evil.example/login")).toBe("/dashboard");
    expect(safeHqRedirectPath("//evil.example")).toBe("/dashboard");
  });

  it("private API routes independently require org context", () => {
    const daily = src("app/api/operator-console/daily-report/route.ts");
    const runtime = src("app/api/hq/production-runtime/route.ts");
    const improvement = src("app/api/hq/ventures/[ventureId]/improvement/route.ts");
    expect(daily).toContain("hqPrivateApiDecision");
    expect(daily).not.toMatch(/if\s*\(\s*!org\s*\)/);
    expect(runtime).toContain("hqPrivateApiDecision");
    expect(improvement).toContain("hqPrivateApiDecision");
    expect(src("lib/infinity/operator-console/local-hq-proof.ts")).toContain("INFINITY_HQ_SURFACE");
    expect(src("lib/infinity/operator-console/local-hq-proof.ts")).toContain("VERCEL");
    expect(src("app/api/auth/logout/route.ts")).toContain("signOut");
    expect(src("app/page.tsx")).toContain("isHqProductionRuntime");
    expect(src("app/page.tsx")).toContain('redirect("/login")');
    expect(evaluateHQPrivateAPIGate({
      routes: [
        { path: "/api/operator-console/daily-report", unauthenticatedStatus: 401, privatePayload: false },
        { path: "/api/hq/production-runtime", unauthenticatedStatus: 401, privatePayload: false },
      ],
    }).result).toBe("PASS");
  });

  it("does not leak founder reports into the public surface", () => {
    expect(src("lib/infinity/public-operations-room/gates.ts")).not.toContain("founder-daily-reports");
    expect(src("components/public/operations-room/live-operations-room.tsx")).not.toContain("FounderDailyOperationsReport");
    expect(src("vercel.hq.json")).toContain("noindex");
    expect(src("vercel.hq.json")).not.toContain("crons");
  });
});
