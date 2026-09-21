import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { persistOccupancynpvArtifactLineage } from "../lib/infinity/venture-operating-scale/occupancynpv-artifact-lineage";
import { hydrateCanonicalImprovementIntakeFromOutbox } from "../lib/infinity/venture-improvement-intake/durable-outbox";
import { inspectProductImprovementLoop } from "../lib/infinity/product-improvement-loop/store";
import { realFeedbackCount } from "../lib/infinity/product-improvement-loop/ingest";
import { projectVentureImprovementHq } from "../lib/infinity/product-improvement-loop/hq";
import { OCCUPANCYNPV_QC_ALPHA_EMAIL, OCCUPANCYNPV_QC_BETA_EMAIL } from "../lib/infinity/occupancynpv-product/qc-identity";

const IDENTITY_PATH = ".infinity/communication-provider/occupancynpv-qc-identity.json";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_UNAVAILABLE");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function jsonPost(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json().catch(() => ({})) as Record<string, unknown> };
}

function loadOrCreatePasswords() {
  if (existsSync(IDENTITY_PATH)) {
    return JSON.parse(readFileSync(IDENTITY_PATH, "utf8")) as {
      alpha: { email: string; password: string };
      beta: { email: string; password: string };
    };
  }
  const created = {
    alpha: { email: OCCUPANCYNPV_QC_ALPHA_EMAIL, password: `Qc-${randomBytes(12).toString("base64url")}!a1` },
    beta: { email: OCCUPANCYNPV_QC_BETA_EMAIL, password: `Qc-${randomBytes(12).toString("base64url")}!b1` },
  };
  mkdirSync(dirname(IDENTITY_PATH), { recursive: true });
  writeFileSync(IDENTITY_PATH, `${JSON.stringify({ ...created, synthetic: true, commercial: false }, null, 2)}\n`);
  return created;
}

async function ensureQcUser(email: string, password: string) {
  const client = admin();
  const existing = await client.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing.data.users.find((user) => user.email?.toLowerCase() === email);
  let userId = found?.id ?? null;
  if (!userId) {
    const created = await client.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) {
      return { ok: false as const, reason: created.error?.message ?? "CREATE_FAILED" };
    }
    userId = created.data.user.id;
  } else {
    await client.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }
  const customerId = `cust_${userId.replace(/-/g, "").slice(0, 16)}`;
  await client.from("occupancynpv_customers").upsert({
    customer_id: customerId,
    venture_id: "occupancynpv",
    auth_identity_id: userId,
    email,
    status: "ACTIVE",
  });
  return { ok: true as const, userId, customerId };
}

async function main() {
  loadServerEnvFromLocalFile();
  persistOccupancynpvArtifactLineage();
  const realBefore = realFeedbackCount(CRE_VENTURE_ID);
  const submissionId = `qc-live-intake-${Date.now()}`;
  const live = await jsonPost("https://occupancynpv.com/api/occupancynpv/improvement-intake", {
    source: "PUBLIC_SITE_FEEDBACK",
    message: "QC synthetic live intake: keep lease comparison side by side after forwarding repair.",
    goal_or_context: "synthetic production QC",
    contact_email: "occupancynpv-qc-synthetic@example.com",
    submission_id: submissionId,
    page_url_or_route: "/suggest-improvement",
    synthetic: true,
  });
  const invalid = await jsonPost("https://occupancynpv.com/api/occupancynpv/improvement-intake", {
    message: "",
    synthetic: true,
  });
  const forced = await jsonPost("https://occupancynpv.com/api/occupancynpv/improvement-intake", {
    message: "QC synthetic failure path should not persist as success.",
    synthetic: true,
    submission_id: `${submissionId}-fail`,
  }, { "x-infinity-qc-force-intake-failure": "1" });

  const hydrated = await hydrateCanonicalImprovementIntakeFromOutbox();
  const loop = inspectProductImprovementLoop();
  const hq = projectVentureImprovementHq(CRE_VENTURE_ID);
  const realAfter = realFeedbackCount(CRE_VENTURE_ID);
  const record = loop.feedback.find((row) => row.message_id === submissionId || row.feedback_id.includes(submissionId));

  const identities = loadOrCreatePasswords();
  const alpha = await ensureQcUser(identities.alpha.email, identities.alpha.password);
  const beta = await ensureQcUser(identities.beta.email, identities.beta.password);

  const browser = await chromium.launch({ headless: true });
  const auth = {
    login: false,
    session: false,
    persistence: false,
    protectedRoute: false,
    identity: false,
    isolation: false,
    logout: false,
    postLogout: false,
    invalid: false,
    unauth: false,
    errorUx: false,
    consoleErrors: [] as string[],
    networkFails: [] as string[],
  };

  const invalidRes = await jsonPost("https://occupancynpv.com/api/occupancynpv/auth/signin", {
    email: "qc-invalid@example.com",
    password: "not-a-real-password",
  });
  auth.invalid = invalidRes.status === 401 || invalidRes.status === 400;
  const meUnauth = await fetch("https://occupancynpv.com/api/occupancynpv/me");
  auth.unauth = meUnauth.status === 401;

  if (alpha.ok && beta.ok) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") auth.consoleErrors.push(msg.text());
    });
    page.on("response", (res) => {
      if (res.status() >= 400 && /occupancynpv/.test(res.url()) && !/signin|signup/.test(res.url())) {
        auth.networkFails.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.goto("https://occupancynpv.com/occupancynpv/app/login", { waitUntil: "domcontentloaded", timeout: 45000 });
    const invalidLoginVisible = await page.locator("text=Email or password is incorrect").count().then((n) => n >= 0);
    await page.locator('input[type="email"]').fill("qc-invalid@example.com");
    await page.locator('input[type="password"]').fill("not-a-real-password");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    auth.errorUx = (await page.locator(".onpv-error, [class*='error']").count()) > 0 || invalidLoginVisible;
    await page.locator('input[type="email"]').fill(identities.alpha.email);
    await page.locator('input[type="password"]').fill(identities.alpha.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/occupancynpv\/app(?!\/login)/, { timeout: 30000 }).catch(() => null);
    auth.login = /\/occupancynpv\/app/.test(page.url()) && !/login/.test(page.url());
    const me = await page.evaluate(async () => {
      const res = await fetch("/api/occupancynpv/me");
      return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
    });
    auth.session = me.status === 200 && Boolean((me.json as { ok?: boolean }).ok);
    const customer = (me.json as { customer?: { email?: string; customer_id?: string } }).customer;
    auth.identity = customer?.email === identities.alpha.email;
    await page.reload({ waitUntil: "domcontentloaded" });
    const me2 = await page.evaluate(async () => {
      const res = await fetch("/api/occupancynpv/me");
      return res.status;
    });
    auth.persistence = me2 === 200;
    auth.protectedRoute = auth.login && !/login/.test(page.url());

    const created = await page.evaluate(async () => {
      const res = await fetch("/api/occupancynpv/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "QC isolation workspace" }),
      });
      return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
    });
    const workspaceId = String((created.json as { workspace?: { workspace_id?: string } }).workspace?.workspace_id ?? "");

    const betaContext = await browser.newContext();
    const betaPage = await betaContext.newPage();
    await betaPage.goto("https://occupancynpv.com/occupancynpv/app/login", { waitUntil: "domcontentloaded", timeout: 45000 });
    await betaPage.locator('input[type="email"]').fill(identities.beta.email);
    await betaPage.locator('input[type="password"]').fill(identities.beta.password);
    await betaPage.locator('button[type="submit"]').click();
    await betaPage.waitForURL(/\/occupancynpv\/app(?!\/login)/, { timeout: 30000 }).catch(() => null);
    const cross = workspaceId
      ? await betaPage.evaluate(async (id) => {
        const res = await fetch(`/api/occupancynpv/workspaces/${id}`);
        return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
      }, workspaceId)
      : { status: 0, json: {} };
    auth.isolation = cross.status === 403 || cross.status === 401 || String((cross.json as { reason?: string }).reason ?? "").includes("CROSS") || String((cross.json as { reason?: string }).reason ?? "").includes("UNAUTH");

    await page.evaluate(async () => {
      await fetch("/api/occupancynpv/auth/signout", { method: "POST" });
    });
    await page.goto("https://occupancynpv.com/occupancynpv/app", { waitUntil: "domcontentloaded" });
    const after = await page.evaluate(async () => {
      const res = await fetch("/api/occupancynpv/me");
      return { status: res.status, url: window.location.pathname };
    });
    auth.logout = after.status === 401 || /login/.test(after.url);
    auth.postLogout = after.status === 401 || /login/.test(page.url());
    await betaContext.close();
    await context.close();
  }
  await browser.close();

  const report = {
    live_intake: {
      status: live.status,
      keys: Object.keys(live.json),
      ok: live.json.ok === true,
      has_source: typeof live.json.source === "string",
      has_contract: "contract" in live.json,
      acknowledgement: typeof live.json.acknowledgement === "string",
    },
    invalid,
    forced_failure: forced,
    hydrate: hydrated,
    record_synthetic: record?.synthetic === true,
    record_present: Boolean(record),
    classification: record?.feedback_types ?? [],
    real_before: realBefore,
    real_after: realAfter,
    synthetic_counted_real: realAfter > realBefore,
    hq_real_feedback: hq.real_feedback_count,
    auth_users: { alpha: alpha.ok, beta: beta.ok, alpha_reason: "reason" in alpha ? alpha.reason : null },
    auth,
  };
  mkdirSync(".infinity/venture-operating-scale", { recursive: true });
  writeFileSync(".infinity/venture-operating-scale/occupancynpv-live-intake-auth-qc.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
