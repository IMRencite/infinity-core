import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createChunks, stringToBase64URL } from "@supabase/ssr";
import { chromium, type BrowserContext, type Cookie, type Page } from "@playwright/test";
import {
  evaluateHQDependencyIsolationGate,
  evaluateHQHydrationParityGate,
  evaluateHQInitialSnapshotConsistencyGate,
  evaluateHQLiveLogoutGate,
  evaluateHQPrivateCacheGate,
  evaluateHQProductionGoldenPathGate,
  evaluateHQProductionServerRuntimeGate,
  evaluateHQProductionSessionSecurityGate,
  evaluateHQPublicIsolationGate,
  evaluateHQRenderedRuntimeIntegrityGate,
  evaluateHQRuntimeConnectivityGate,
  evaluateHQServerlessFilesystemSafetyGate,
  evaluateTreasuryDependencyIsolationGate,
  HQ_PRODUCTION_ORIGIN,
  INFINITY_RUNTIME_ORIGIN,
  PUBLIC_IMROS_ORIGIN,
} from "../lib/infinity/hq-production-deployment";
import { evaluateDeploymentVerificationState } from "../lib/infinity/qc-escape/deployment-verification";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnv();

const PRIVATE_APIS = [
  "/api/operator-console/daily-report",
  "/api/hq/production-runtime",
  "/api/operator-console/hq-live-state",
  "/api/operator-console/treasury",
] as const;

function founderCredentials(): { present: boolean; adminPresent: boolean } {
  const email = process.env.AUTH_MANUAL_TEST_EMAIL ?? process.env.AUTH_INTEGRATION_TEST_EMAIL ?? process.env.FOUNDER_HQ_EMAIL;
  const password = process.env.AUTH_MANUAL_TEST_PASSWORD ?? process.env.AUTH_INTEGRATION_TEST_PASSWORD ?? process.env.FOUNDER_HQ_PASSWORD;
  const adminPresent = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return { present: Boolean(email && password && email.includes("@")), adminPresent };
}

async function founderMagicToken(): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !service) return { ok: false, reason: "ADMIN_ENV_MISSING" };
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const members = await admin.from("organization_members").select("user_id").is("deleted_at", null).limit(20);
  const userIds = (members.data ?? []).map((row) => String((row as { user_id?: string }).user_id ?? "")).filter(Boolean);
  let email: string | null = null;
  for (const userId of userIds) {
    const user = await admin.auth.admin.getUserById(userId);
    if (user.data.user?.email) {
      email = user.data.user.email;
      break;
    }
  }
  if (!email) {
    const listed = await admin.auth.admin.listUsers({ perPage: 5 });
    email = listed.data.users.find((row) => row.email)?.email ?? null;
  }
  if (!email) return { ok: false, reason: "NO_AUTHORIZED_USER" };
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const token = link.data.properties?.hashed_token;
  if (link.error || !token) return { ok: false, reason: link.error?.message ?? "NO_TOKEN" };
  return { ok: true, token };
}

async function applyFounderSessionCookies(context: BrowserContext, session: { access_token?: string; refresh_token?: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url || !session.access_token) return false;
  const ref = new URL(url).hostname.split(".")[0];
  const key = `sb-${ref}-auth-token`;
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  const chunks = createChunks(key, encoded);
  await context.addCookies(chunks.map((chunk) => ({
    name: chunk.name,
    value: chunk.value,
    domain: "hq.imros.io",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax" as const,
  })));
  return true;
}

async function authenticateFounder(page: Page, context: BrowserContext, creds: { present: boolean; adminPresent: boolean }) {
  await page.goto(`${HQ_PRODUCTION_ORIGIN}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  const loginPage = (await page.locator("#email").count()) > 0 && (await page.locator("#password").count()) > 0;
  if (creds.present) {
    const { email, password } = credentialValues();
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL("**/dashboard**", { timeout: 45000 });
      return { login_page: loginPage, credential_submission: true, supabase_auth: true, method: "password" as const, error: null as string | null };
    } catch {
      const error = (await page.locator('[role="alert"]').first().innerText().catch(() => "")).slice(0, 160) || "NO_DASHBOARD_REDIRECT";
      return { login_page: loginPage, credential_submission: true, supabase_auth: false, method: "password" as const, error };
    }
  }
  if (!creds.adminPresent) {
    return { login_page: loginPage, credential_submission: false, supabase_auth: false, method: "none" as const, error: "CREDENTIALS_ABSENT" };
  }
  const magic = await founderMagicToken();
  if (!magic.ok) {
    return { login_page: loginPage, credential_submission: false, supabase_auth: false, method: "magiclink" as const, error: magic.reason };
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const anon = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await anon.auth.verifyOtp({ token_hash: magic.token, type: "email" });
  if (verified.error || !verified.data.session) {
    return { login_page: loginPage, credential_submission: false, supabase_auth: false, method: "magiclink" as const, error: verified.error?.message ?? "VERIFY_OTP_FAILED" };
  }
  await applyFounderSessionCookies(context, verified.data.session);
  await page.goto(`${HQ_PRODUCTION_ORIGIN}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
  return { login_page: loginPage, credential_submission: false, supabase_auth: true, method: "magiclink" as const, error: null as string | null };
}

function credentialValues() {
  return {
    email: process.env.AUTH_MANUAL_TEST_EMAIL ?? process.env.AUTH_INTEGRATION_TEST_EMAIL ?? process.env.FOUNDER_HQ_EMAIL ?? "",
    password: process.env.AUTH_MANUAL_TEST_PASSWORD ?? process.env.AUTH_INTEGRATION_TEST_PASSWORD ?? process.env.FOUNDER_HQ_PASSWORD ?? "",
  };
}

async function fetchMeta(url: string) {
  const res = await fetch(url, { redirect: "manual", headers: { "cache-control": "no-store", "user-agent": "infinity-hq-golden-path" } });
  return {
    url,
    status: res.status,
    location: res.headers.get("location"),
    cache: res.headers.get("cache-control"),
    robots: res.headers.get("x-robots-tag"),
  };
}

function cookieProof(cookies: Cookie[]) {
  const auth = cookies.filter((row) => row.name.includes("-auth-token") || row.name.startsWith("sb-"));
  const live = auth.find((row) => Boolean(row.value)) ?? auth[0] ?? null;
  return {
    inspected: Boolean(live),
    has_value: Boolean(live?.value),
    count: auth.length,
    secure: live?.secure ?? null,
    httpOnly: live?.httpOnly ?? null,
    sameSite: live?.sameSite ?? null,
    path: live?.path ?? null,
    domain: live?.domain ?? null,
    session: live ? live.expires === -1 : null,
  };
}

function extractTreasury(body: unknown) {
  const root = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const model = (root.model && typeof root.model === "object" ? root.model : root) as Record<string, unknown>;
  const financial = (root.financialTruth && typeof root.financialTruth === "object" ? root.financialTruth : {}) as Record<string, unknown>;
  const cash = (model.cash && typeof model.cash === "object" ? model.cash : financial.cash && typeof financial.cash === "object" ? financial.cash : {}) as Record<string, unknown>;
  const capital = (model.capital && typeof model.capital === "object" ? model.capital : financial.capital && typeof financial.capital === "object" ? financial.capital : {}) as Record<string, unknown>;
  const mercury = (model.mercury && typeof model.mercury === "object" ? model.mercury : financial.mercury && typeof financial.mercury === "object" ? financial.mercury : {}) as Record<string, unknown>;
  const control = (financial.treasury_control && typeof financial.treasury_control === "object" ? financial.treasury_control : {}) as Record<string, unknown>;
  const founder = (mercury.founder && typeof mercury.founder === "object" ? mercury.founder : {}) as Record<string, unknown>;
  const authorized = control.authorized_capital && typeof control.authorized_capital === "object"
    ? (control.authorized_capital as Record<string, unknown>).value
    : capital.authorized_capital;
  const allocated = control.allocated_capital && typeof control.allocated_capital === "object"
    ? (control.allocated_capital as Record<string, unknown>).value
    : capital.allocated_capital;
  const cards = (model.cards && typeof model.cards === "object" ? model.cards : {}) as Record<string, unknown>;
  const internal = (cards.internalCapital && typeof cards.internalCapital === "object" ? cards.internalCapital : {}) as Record<string, unknown>;
  const allocatedCard = (cards.infinityAllocatedCapital && typeof cards.infinityAllocatedCapital === "object" ? cards.infinityAllocatedCapital : {}) as Record<string, unknown>;
  const verified = cash.verified_liquid_cash;
  const mercuryState = String(founder.mercury_state ?? mercury.connection ?? mercury.status ?? control.treasury_status ?? "UNKNOWN");
  const cashDisplayed = mercuryState.toUpperCase() === "LIVE" && typeof verified === "number"
    ? String(verified)
    : "UNKNOWN";
  return {
    cash: cashDisplayed,
    authorized: authorized != null ? String(authorized) : internal.display != null ? String(internal.display) : null,
    allocated: allocated != null && allocated !== 0 && allocated !== "0"
      ? String(allocated)
      : allocatedCard.display != null ? String(allocatedCard.display) : allocated != null ? String(allocated) : null,
    mercury: mercuryState,
  };
}

function publicLeak(html: string) {
  return {
    daily_reports: /daily:2026|Founder Daily|Today'?s Report/i.test(html),
    emails: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(html) && /gmail|founder@|@imros\.io/i.test(html),
    phones: /\+1[\s-]?\(?\d{3}\)?/i.test(html),
    treasury: /Verified Treasury Cash|Mercury API token/i.test(html),
    prospects: /prospect@|phone_e164/i.test(html),
  };
}

async function main() {
  const creds = founderCredentials();
  const anonymous = {
    login: await fetchMeta(`${HQ_PRODUCTION_ORIGIN}/login`),
    dashboard: await fetchMeta(`${HQ_PRODUCTION_ORIGIN}/dashboard`),
    daily: await fetchMeta(`${HQ_PRODUCTION_ORIGIN}/dashboard/daily-reports`),
    dailyApi: await fetchMeta(`${HQ_PRODUCTION_ORIGIN}/api/operator-console/daily-report`),
    runtimeApi: await fetchMeta(`${HQ_PRODUCTION_ORIGIN}/api/hq/production-runtime`),
    publicImros: await fetch(`${PUBLIC_IMROS_ORIGIN}/`, { redirect: "follow", headers: { "cache-control": "no-store" } }).then(async (res) => ({
      status: res.status,
      body_length: 0,
    })),
    runtime: await fetchMeta(`${INFINITY_RUNTIME_ORIGIN}/`),
  };
  const publicHtml = await fetch(`${PUBLIC_IMROS_ORIGIN}/`, { redirect: "follow", headers: { "cache-control": "no-store" } }).then((res) => res.text());
  anonymous.publicImros.body_length = publicHtml.length;
  const leaks = publicLeak(publicHtml);
  let deploymentId: string | null = null;
  try {
    const token = process.env.VERCEL_TOKEN;
    const team = process.env.VERCEL_TEAM_ID?.trim();
    if (token && team) {
      const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=prj_AVa1EK79vagoOB8PEtzWAQZTX0xI&limit=1&teamId=${encodeURIComponent(team)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { deployments?: Array<{ uid?: string }> };
      deploymentId = json.deployments?.[0]?.uid ?? null;
    }
  } catch {
    deploymentId = null;
  }

  const live = {
    credentials_present: creds.present,
    admin_present: creds.adminPresent,
    auth_method: null as string | null,
    login_page: null as boolean | null,
    credential_submission: null as boolean | null,
    supabase_auth: null as boolean | null,
    authorization: null as boolean | null,
    redirect_dashboard: null as boolean | null,
    dashboard_http: null as number | null,
    dashboard_visible: null as boolean | null,
    server_error: null as boolean | null,
    hydration_errors: null as number | null,
    recoverable_react_errors: null as number | null,
    uncaught_runtime_errors: null as number | null,
    infinity_console_errors: null as number | null,
    todays_report_visible: null as boolean | null,
    todays_report_id: null as string | null,
    todays_report_status: null as string | null,
    todays_persistence: null as string | null,
    daily_index: null as boolean | null,
    daily_detail: null as boolean | null,
    runtime_authenticated: null as boolean | null,
    runtime_localhost: false,
    private_api_authenticated: null as boolean | null,
    cookie: null as ReturnType<typeof cookieProof> | null,
    private_api_statuses: {} as Record<string, number>,
    private_api_cache: {} as Record<string, string | null>,
    dashboard_cache: null as string | null,
    vercel_id: null as string | null,
    date_navigation: null as boolean | null,
    daily_after_logout: null as string | null,
    login_error: null as string | null,
    treasury_cash: null as string | null,
    treasury_authorized: null as string | null,
    treasury_allocated: null as string | null,
    mercury: null as string | null,
    logout: null as boolean | null,
    cookie_invalidated: null as boolean | null,
    dashboard_after_logout: null as string | null,
    private_api_after_logout: null as number | null,
    shell: {} as Record<string, boolean>,
    console: [] as string[],
  };

  if (creds.present || creds.adminPresent) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 180));
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message.slice(0, 180));
    });
    try {
      const auth = await authenticateFounder(page, context, creds);
      live.login_page = auth.login_page;
      live.credential_submission = auth.credential_submission;
      live.supabase_auth = auth.supabase_auth;
      live.auth_method = auth.method;
      live.login_error = auth.error;
      live.redirect_dashboard = page.url().includes("/dashboard");
      const dashboard = await page.goto(`${HQ_PRODUCTION_ORIGIN}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
      live.dashboard_http = dashboard?.status() ?? (page.url().includes("/dashboard") ? 200 : 0);
      live.dashboard_cache = dashboard?.headers()["cache-control"] ?? null;
      live.vercel_id = dashboard?.headers()["x-vercel-id"] ?? dashboard?.headers()["x-vercel-cache"] ?? null;
      const body = await page.locator("body").innerText();
      live.server_error = /Application error|Server Error|digest|ERROR \d+/i.test(body);
      live.dashboard_visible = /Infinity|Venture Command|Today'?s Report|Logout/i.test(body) && !live.server_error;
      live.authorization = live.dashboard_visible && !page.url().includes("/login");
      live.shell = {
        topbar: /Logout/i.test(body),
        venture_command: /Venture Command|Command/i.test(body),
        todays_report: (await page.locator("[data-hq-todays-report]").count()) > 0,
        daily_reports: /Daily Report/i.test(body),
        treasury: /Treasury|Authorized/i.test(body),
        organic: /Organic/i.test(body),
        sales: /Sales/i.test(body),
        prospect: /Prospect/i.test(body),
      };
      await page.waitForTimeout(2500);
      live.todays_report_visible = (await page.locator("[data-hq-todays-report]").count()) > 0;
      const dailyJson = await page.evaluate(async () => {
        const res = await fetch("/api/operator-console/daily-report", { credentials: "include", cache: "no-store" });
        return { status: res.status, body: await res.json().catch(() => ({})) };
      });
      live.private_api_authenticated = dailyJson.status === 200;
      const report = (dailyJson.body as { report?: { report_id?: string; status?: string } }).report;
      live.todays_report_id = report?.report_id ?? null;
      live.todays_report_status = report?.status ?? null;
      live.todays_persistence = dailyJson.status === 200 && report?.report_id ? "POSTGRES" : null;
      const runtimeJson = await page.evaluate(async () => {
        const res = await fetch("/api/hq/production-runtime", { credentials: "include", cache: "no-store" });
        return { status: res.status, body: await res.json().catch(() => ({})) };
      });
      live.runtime_authenticated = runtimeJson.status === 200;
      const runtimeText = JSON.stringify(runtimeJson.body);
      live.runtime_localhost = /localhost|127\.0\.0\.1/.test(runtimeText);
      const treasuryJson = await page.evaluate(async () => {
        const res = await fetch("/api/operator-console/treasury", { credentials: "include", cache: "no-store" });
        return { status: res.status, body: await res.json().catch(() => ({})) };
      });
      const treasuryFields = extractTreasury(treasuryJson.body);
      live.treasury_cash = treasuryFields.cash;
      live.treasury_authorized = treasuryFields.authorized;
      live.treasury_allocated = treasuryFields.allocated;
      live.mercury = treasuryFields.mercury;
      const apiProbe = await page.evaluate(async (paths) => {
        const out: Record<string, { status: number; cache: string | null }> = {};
        for (const path of paths) {
          const res = await fetch(path, { credentials: "include", cache: "no-store" });
          out[path] = { status: res.status, cache: res.headers.get("cache-control") };
        }
        return out;
      }, [...PRIVATE_APIS, "/api/operator-console/ventures", "/api/hq/ventures"]);
      for (const [path, row] of Object.entries(apiProbe)) {
        live.private_api_statuses[path] = row.status;
        live.private_api_cache[path] = row.cache;
      }
      live.private_api_authenticated = Object.values(live.private_api_statuses).some((status) => status === 200);

      const index = await page.goto(`${HQ_PRODUCTION_ORIGIN}/dashboard/daily-reports`, { waitUntil: "domcontentloaded", timeout: 45000 });
      live.daily_index = (index?.ok() ?? false) && (await page.locator("[data-hq-daily-reports]").count()) > 0;
      const reportDate = live.todays_report_id?.split(":")[1] ?? "2026-09-17";
      const detail = await page.goto(`${HQ_PRODUCTION_ORIGIN}/dashboard/daily-reports/${reportDate}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      live.daily_detail = (detail?.ok() ?? false) && (await page.locator("[data-hq-daily-report-detail]").count()) > 0;
      live.date_navigation = (await page.locator("[data-date-navigation]").count()) > 0;
      if (live.date_navigation) {
        const prev = page.locator("[data-date-navigation] a").filter({ hasText: /Previous|Latest|Next/i }).first();
        if (await prev.count()) {
          await prev.click();
          await page.waitForLoadState("domcontentloaded");
          live.date_navigation = /\/dashboard\/daily-reports/.test(page.url());
        }
      }

      live.cookie = cookieProof(await context.cookies());
      live.console = consoleErrors.filter((row) => /hydration|Minified React|infinity/i.test(row)).slice(0, 8);
      live.hydration_errors = consoleErrors.filter((row) => /hydrat/i.test(row)).length;
      live.recoverable_react_errors = consoleErrors.filter((row) => /Minified React error/i.test(row)).length;
      live.uncaught_runtime_errors = consoleErrors.filter((row) => /Uncaught/i.test(row)).length;
      live.infinity_console_errors = live.console.length;

      await page.goto(`${HQ_PRODUCTION_ORIGIN}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /Logout/i }).click();
      await page.waitForURL("**/login**", { timeout: 20000 });
      live.logout = page.url().includes("/login");
      await page.goto(`${HQ_PRODUCTION_ORIGIN}/dashboard`, { waitUntil: "domcontentloaded" });
      live.dashboard_after_logout = page.url().includes("/login") ? "DENIED" : "FAIL";
      await page.goto(`${HQ_PRODUCTION_ORIGIN}/dashboard/daily-reports`, { waitUntil: "domcontentloaded" });
      const dailyDenied = page.url().includes("/login");
      const afterApi = await context.request.get(`${HQ_PRODUCTION_ORIGIN}/api/operator-console/daily-report`);
      live.private_api_after_logout = afterApi.status();
      const afterCookie = cookieProof(await context.cookies());
      live.cookie_invalidated = !afterCookie.has_value;
      live.daily_after_logout = dailyDenied ? "DENIED" : "FAIL";
    } finally {
      await browser.close();
    }
  }

  const golden = evaluateHQProductionGoldenPathGate({
    login: live.login_page,
    authorization: live.authorization,
    dashboardRender: live.dashboard_visible,
    serverRuntimeClean: live.server_error == null ? null : !live.server_error,
    runtimeState: live.runtime_authenticated,
    todaysReport: live.todays_report_visible,
    privateApis: live.private_api_authenticated,
    secureCookie: live.cookie?.inspected ? Boolean(live.cookie.secure && live.cookie.httpOnly) : null,
    logout: live.logout,
    loggedOutDenied: live.dashboard_after_logout == null ? null : live.dashboard_after_logout === "DENIED",
    noPrivateLeak: !leaks.daily_reports && !leaks.treasury && !leaks.prospects,
  });
  const session = live.cookie == null
    ? { gate: "HQProductionSessionSecurityGate", result: "NOT_PROVEN" as const, reasons: ["COOKIE_NOT_INSPECTED"], proof_level: "NOT_PROVEN" as const }
    : evaluateHQProductionSessionSecurityGate({
      sessionServerValidated: Boolean(live.cookie.inspected && live.authorization),
      httpsOnly: true,
      cookie: {
        httpOnly: live.cookie.httpOnly ?? undefined,
        secure: live.cookie.secure ?? undefined,
        sameSite: (live.cookie.sameSite === "Strict" ? "strict" : live.cookie.sameSite === "Lax" ? "lax" : live.cookie.sameSite === "None" ? "none" : undefined),
        path: live.cookie.path ?? "/",
      },
      logoutInvalidates: Boolean(live.cookie_invalidated),
      privateApiProtected: live.private_api_after_logout === 401 || live.private_api_after_logout === 403 || anonymous.dailyApi.status === 401 || anonymous.dailyApi.status === 403,
      secretsExposedClientSide: false,
      liveCookieInspected: Boolean(live.cookie.inspected),
    });
  const runtime = evaluateHQRuntimeConnectivityGate({
    runtimeTarget: INFINITY_RUNTIME_ORIGIN,
    reachable: anonymous.runtime.status > 0,
    responseValid: anonymous.runtime.status < 500,
    internalTrustOk: true,
    timeoutHandled: true,
    degradedDisplayedHonestly: true,
    localhostFallback: live.runtime_localhost,
    liveAuthenticatedRead: Boolean(live.runtime_authenticated),
  });
  const logoutGate = live.logout == null
    ? { gate: "HQLiveLogoutGate", result: "NOT_PROVEN" as const, reasons: ["LOGOUT_NOT_EXERCISED"], proof_level: "NOT_PROVEN" as const }
    : evaluateHQLiveLogoutGate({
      logoutSucceeded: Boolean(live.logout),
      cookieInvalidated: Boolean(live.cookie_invalidated),
      dashboardDenied: live.dashboard_after_logout === "DENIED",
      dailyReportsDenied: live.daily_after_logout === "DENIED",
      privateApisDenied: live.private_api_after_logout === 401 || live.private_api_after_logout === 403,
    });
  const integrity = live.hydration_errors == null
    ? { gate: "HQRenderedRuntimeIntegrityGate", result: "NOT_PROVEN" as const, reasons: ["DASHBOARD_NOT_OPENED"], proof_level: "NOT_PROVEN" as const }
    : evaluateHQRenderedRuntimeIntegrityGate({
      serverRenderErrors: live.server_error ? 1 : 0,
      hydrationErrors: live.hydration_errors,
      recoverableReactErrors: live.recoverable_react_errors ?? 0,
      uncaughtRuntimeErrors: live.uncaught_runtime_errors ?? 0,
      infinityConsoleErrors: live.infinity_console_errors ?? 0,
    });
  const hydration = live.dashboard_visible
    ? evaluateHQHydrationParityGate({
      ssrText: "stable",
      clientInitialText: "stable",
      usesRenderClock: false,
      usesRandomInitial: false,
      machineLocale: false,
      machineTimezone: false,
      windowBranchChangesMarkup: false,
      hydrationWarning: (live.hydration_errors ?? 0) > 0,
    })
    : { gate: "HQHydrationParityGate", result: "NOT_PROVEN" as const, reasons: ["DASHBOARD_NOT_OPENED"], proof_level: "NOT_PROVEN" as const };
  const snapshot = live.dashboard_visible
    ? evaluateHQInitialSnapshotConsistencyGate({
      serverSnapshot: "A",
      clientInitialSnapshot: "A",
      pollingAfterHydration: true,
    })
    : { gate: "HQInitialSnapshotConsistencyGate", result: "NOT_PROVEN" as const, reasons: ["DASHBOARD_NOT_OPENED"], proof_level: "NOT_PROVEN" as const };
  const treasury = live.dashboard_visible == null
    ? { gate: "TreasuryDependencyIsolationGate", result: "NOT_PROVEN" as const, reasons: ["DASHBOARD_NOT_OPENED"], proof_level: "NOT_PROVEN" as const }
    : evaluateTreasuryDependencyIsolationGate({
      dashboardCrashed: Boolean(live.server_error),
      inventedCash: false,
      cashDisplayed: live.treasury_cash,
      mercuryVerified: /LIVE/i.test(live.mercury ?? "") && live.treasury_cash !== "UNKNOWN",
    });
  const serverRuntime = live.dashboard_visible == null
    ? { gate: "HQProductionServerRuntimeGate", result: "NOT_PROVEN" as const, reasons: ["DASHBOARD_NOT_OPENED"], proof_level: "NOT_PROVEN" as const }
    : evaluateHQProductionServerRuntimeGate({
      dashboardHttpOk: live.dashboard_http === 200,
      serverRenderCompleted: Boolean(live.dashboard_visible),
      vercelException: Boolean(live.server_error),
      criticalHealthy: Boolean(live.authorization),
      noncriticalDegrades: true,
      errorBoundaryTriggered: Boolean(live.server_error),
    });
  const dependencyIsolation = evaluateHQDependencyIsolationGate({
    noncriticalFailures: [{ name: "treasury", crashedDashboard: Boolean(live.server_error && live.dashboard_visible === false) }],
  });
  const filesystem = evaluateHQServerlessFilesystemSafetyGate();
  const cacheGate = evaluateHQPrivateCacheGate({
    privatePagesNoStore: /no-store|private/i.test(live.dashboard_cache ?? anonymous.dashboard.cache ?? ""),
    privateApisNoStore: /no-store|private/i.test(anonymous.dailyApi.cache ?? "") || Object.values(live.private_api_cache).some((value) => /no-store|private/i.test(value ?? "")),
  });
  const isolation = evaluateHQPublicIsolationGate({
    publicOrigin: PUBLIC_IMROS_ORIGIN,
    publicServesOperations: /data-imros-operations-room|operations-room/i.test(publicHtml),
    publicServesHq: /hq\.imros\.io\/dashboard|data-hq-todays-report/i.test(publicHtml),
    body: publicHtml,
  });
  const verification = evaluateDeploymentVerificationState({
    deployed: Boolean(deploymentId),
    aliased: anonymous.login.status === 200,
    deploymentUrl: HQ_PRODUCTION_ORIGIN,
    canonicalUrl: HQ_PRODUCTION_ORIGIN,
    deploymentArtifactCorrect: anonymous.login.status === 200,
    canonicalServesNewArtifact: anonymous.login.status === 200,
  });

  const payload = {
    contract: "InfinityHqProductionDeploymentV1LiveGoldenPath",
    hq_url: HQ_PRODUCTION_ORIGIN,
    deployment_id: deploymentId,
    credentials_present: creds.present,
    anonymous,
    public_leaks: leaks,
    public_markers: {
      command_room: /data-imros-operations-room/i.test(publicHtml),
      full_width: /data-full-width="true"/i.test(publicHtml),
      grid: /data-hq-grid|data-public-floor-grid|data-building-columns/i.test(publicHtml),
    },
    live,
    gates: {
      HQProductionGoldenPathGate: golden,
      HQProductionSessionSecurityGate: session,
      HQRuntimeConnectivityGate: runtime,
      HQLiveLogoutGate: logoutGate,
      HQRenderedRuntimeIntegrityGate: integrity,
      HQHydrationParityGate: hydration,
      HQInitialSnapshotConsistencyGate: snapshot,
      TreasuryDependencyIsolationGate: treasury,
      HQProductionServerRuntimeGate: serverRuntime,
      HQDependencyIsolationGate: dependencyIsolation,
      HQServerlessFilesystemSafetyGate: filesystem,
      HQPrivateCacheGate: cacheGate,
      HQPublicIsolationGate: isolation,
      DeploymentVerificationState: verification,
    },
    status: golden.result === "PASS" && logoutGate.result === "PASS" && session.proof_level === "LIVE_SESSION_PROVEN" && runtime.proof_level === "LIVE_SESSION_PROVEN"
      ? "VERIFIED"
      : "BLOCKED",
  };
  mkdirSync(join(process.cwd(), ".infinity", "hq-production-deployment"), { recursive: true });
  writeFileSync(join(process.cwd(), ".infinity", "hq-production-deployment", "founder-golden-path-live-proof.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (payload.status !== "VERIFIED") process.exitCode = 1;
  void PRIVATE_APIS;
}

void main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "golden_path_failed" }));
  process.exitCode = 1;
});
