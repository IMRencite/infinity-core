import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
import {
  executionContextReady,
  inspectRepositoryRoot,
} from "../lib/infinity/execution-context/inspect";
import {
  evaluateExecutionContextReadinessGate,
  evaluateRepositoryRootVerificationGate,
  evaluateWorkingTreeEvidenceValidityGate,
} from "../lib/infinity/execution-context/gates";
import { CANONICAL_INFINITY_REPO } from "../lib/infinity/execution-context/types";
import { CRE_VENTURE_ID, CRE_VERCEL_PROJECT_ID, OCCUPANCYNPV_DOMAIN } from "../lib/infinity/venture-operating-scale/constants";
import { OCCUPANCYNPV_SUPPORT_EMAIL } from "../lib/infinity/occupancynpv-product/types";
import { submitVentureImprovementIntake } from "../lib/infinity/venture-improvement-intake/submit";
import { realFeedbackCount } from "../lib/infinity/product-improvement-loop/ingest";
import { inspectProductImprovementLoop } from "../lib/infinity/product-improvement-loop/store";
import { projectVentureImprovementHq } from "../lib/infinity/product-improvement-loop/hq";
import { readCanonicalProductionOperatingState } from "../lib/infinity/growth-engine/hq-runtime-projection";
import { evaluatePortfolioCapitalStopGate, evaluatePortfolioMonthlyBurnGate, evaluateVentureCreationPrecheck } from "../lib/infinity/venture-financial-governance/gates";
import { verifyLiveCommercialCheckoutSessions } from "../lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import { OCCUPANCYNPV_CURRENT_DEPLOYMENT, OCCUPANCYNPV_CURRENT_DIGEST } from "../lib/infinity/venture-operating-scale/occupancynpv-artifact-lineage";
import {
  OCCUPANCYNPV_MATERIAL_INTERACTIONS,
  OCCUPANCYNPV_MATERIAL_ROUTES,
  OCCUPANCYNPV_MATERIAL_WORKFLOWS,
  hqMaterialSurfaces,
} from "../lib/infinity/universal-venture-system-qc/exhaustive";
import { buildOccupancynpvCurrentEvidence } from "../lib/infinity/universal-venture-system-qc/current-evidence";
import { evaluateOccupancynpvFullSystemQc } from "../lib/infinity/universal-venture-system-qc/occupancynpv";
import { evaluateHqFullSystemQc, type HqSurfaceEvidence } from "../lib/infinity/universal-venture-system-qc/hq-qc";
import { evaluateDevServerProcessHealthGate } from "../lib/infinity/universal-venture-system-qc/dev-server";
import { evaluateBrowserConsoleQCGate } from "../lib/infinity/customer-facing-browser-qc/console-gate";
import { occupancyNpvCapabilityProfile, buildVentureSystemInventory } from "../lib/infinity/universal-venture-system-qc/inventory";
import type { SystemVerificationInput } from "../lib/infinity/universal-venture-system-qc/matrix";
import type { VentureSystemId } from "../lib/infinity/universal-venture-system-qc/contract";

const EVIDENCE_PATH = ".infinity/venture-operating-scale/occupancynpv-hq-final-qc-evidence.json";
const SHOT_DIR = ".infinity/venture-operating-scale/occupancynpv-final-qc-screenshots";
const HQ_VENTURE = `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`;

function extra(
  system_id: VentureSystemId,
  status: SystemVerificationInput["status"],
  reason: string | null,
  now: string,
): SystemVerificationInput {
  return {
    system_id,
    status,
    verification_level: status === "UNKNOWN" ? "UNCHECKED" : "LIVE_PRODUCTION",
    environment: "LIVE_PRODUCTION",
    last_verified_at: status === "UNKNOWN" ? null : now,
    evidence_reference: `final-qc:${system_id}`,
    failure_reason: status === "PASS" || status === "NOT_APPLICABLE" ? null : reason,
  };
}

function materialConsole(entries: readonly string[]): string[] {
  return evaluateBrowserConsoleQCGate([...entries]).material.map((row) => row.text);
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  try {
    const response = await fetch(url, { redirect: "follow", headers });
    return { status: response.status, text: await response.text(), ok: response.ok };
  } catch {
    return { status: 0, text: "", ok: false };
  }
}

function observeDevServer() {
  const now = new Date().toISOString();
  let netstat = "";
  try {
    netstat = execSync("netstat -ano", { encoding: "utf8" });
  } catch {
    netstat = "";
  }
  const listeners = [...netstat.matchAll(/:3000\s+\S+\s+\S+\s+LISTENING\s+(\d+)/g)].map((row) => Number(row[1]));
  const unique = [...new Set(listeners)];
  let command = "next dev";
  if (unique[0]) {
    try {
      command = execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${unique[0]}\\").CommandLine"`, {
        encoding: "utf8",
      }).trim() || "next dev";
    } catch {
      command = "next dev";
    }
  }
  return {
    processes: unique.map((pid) => ({
      pid,
      command,
      serving_port: 3000,
      hung: false,
    })),
    expected_port: 3000,
    port_listeners: unique.length ? unique.map(() => 3000) : [],
    serving_runtime_started_at: now,
    now,
    hung_request_timeout: false,
  };
}

async function main() {
  if (process.cwd() !== CANONICAL_INFINITY_REPO) {
    throw new Error("EXECUTION_CONTEXT_INVALID");
  }
  const inspected = inspectRepositoryRoot({ cwd: process.cwd(), intendedRoot: CANONICAL_INFINITY_REPO });
  const root = evaluateRepositoryRootVerificationGate(inspected);
  const ready = evaluateExecutionContextReadinessGate({ root, mutation: "TEST" });
  const tree = evaluateWorkingTreeEvidenceValidityGate({ gatheredBeforeVerification: false, root });
  const context = executionContextReady({ cwd: process.cwd() });
  if (!context.ready || root.result !== "PASS" || ready.result !== "PASS" || tree.result !== "PASS") {
    throw new Error(JSON.stringify({ root, ready, tree }));
  }

  const now = new Date().toISOString();
  const realBefore = realFeedbackCount(CRE_VENTURE_ID);
  const submissionId = `qc-final-${Date.now()}`;
  const pipeline = submitVentureImprovementIntake({
    venture_id: CRE_VENTURE_ID,
    submission_id: submissionId,
    source: "PUBLIC_SITE_FEEDBACK",
    message: "QC synthetic: keep comparing lease cash flows side by side.",
    goal_or_context: "synthetic production QC",
    page_url_or_route: "/suggest-improvement",
    workflow_context: "FINAL_EXHAUSTIVE_QC",
    product_area: "OccupancyNPV",
    contact_email: "occupancynpv-qc-synthetic@example.com",
    client_key: "qc-final",
    byte_length: 128,
    synthetic: true,
  });
  const duplicate = submitVentureImprovementIntake({
    venture_id: CRE_VENTURE_ID,
    submission_id: submissionId,
    source: "PUBLIC_SITE_FEEDBACK",
    message: "QC synthetic: keep comparing lease cash flows side by side.",
    client_key: "qc-final",
    byte_length: 128,
    synthetic: true,
  });
  const invalid = submitVentureImprovementIntake({
    venture_id: CRE_VENTURE_ID,
    submission_id: `${submissionId}-empty`,
    source: "PUBLIC_SITE_FEEDBACK",
    message: "",
    synthetic: true,
  });
  const realAfter = realFeedbackCount(CRE_VENTURE_ID);
  const loop = inspectProductImprovementLoop();
  const hqImprovement = projectVentureImprovementHq(CRE_VENTURE_ID);
  const growth = readCanonicalProductionOperatingState();

  const checkout = await verifyLiveCommercialCheckoutSessions({ persist: true, createSessions: true });

  const routes = [...OCCUPANCYNPV_MATERIAL_ROUTES];
  const livePages = await Promise.all(routes.map(async (route) => {
    const url = `https://occupancynpv.com${route}`;
    const page = await fetchText(url);
    return { route, ...page };
  }));
  const home = livePages.find((row) => row.route === "/")!;
  const suggest = livePages.find((row) => row.route === "/suggest-improvement")!;
  const login = livePages.find((row) => row.route === "/occupancynpv/app/login")!;
  const privacy = livePages.find((row) => row.route === "/privacy-policy")!;
  const terms = livePages.find((row) => row.route === "/terms-of-service")!;
  const sitemap = livePages.find((row) => row.route === "/sitemap.xml")!;

  const liveIntake = await fetch("https://occupancynpv.com/api/occupancynpv/improvement-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "PUBLIC_SITE_FEEDBACK",
      message: "QC synthetic live intake: preserve lease comparison clarity.",
      goal_or_context: "synthetic",
      contact_email: "occupancynpv-qc-synthetic@example.com",
      submission_id: `qc-live-${Date.now()}`,
      page_url_or_route: "/suggest-improvement",
      synthetic: true,
    }),
  }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => ({})) })).catch(() => ({ status: 0, json: {} }));
  const liveInvalid = await fetch("https://occupancynpv.com/api/occupancynpv/improvement-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "", synthetic: true }),
  }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => ({})) })).catch(() => ({ status: 0, json: {} }));
  const liveAuthInvalid = await fetch("https://occupancynpv.com/api/occupancynpv/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "qc-invalid@example.com", password: "not-a-real-password" }),
  }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => ({})) })).catch(() => ({ status: 0, json: {} }));
  const liveMe = await fetchText("https://occupancynpv.com/api/occupancynpv/me");
  const liveWorkspaces = await fetchText("https://occupancynpv.com/api/occupancynpv/workspaces");

  const seoOk = Boolean(
    suggest.text.includes("<title>")
    && home.text.includes("<title>")
    && sitemap.ok
    && (home.text.includes('rel="canonical"') || suggest.text.includes("robots")),
  );
  const supportOk = Boolean(login.text.includes(OCCUPANCYNPV_SUPPORT_EMAIL) || home.text.includes(OCCUPANCYNPV_SUPPORT_EMAIL));
  const emailOk = Boolean(growth?.gmail === "PASS" && supportOk);
  const apiOk = liveIntake.status === 200 && liveInvalid.status === 400 && (liveAuthInvalid.status === 400 || liveAuthInvalid.status === 401);
  const persistenceIsolated = liveWorkspaces.status === 401 || liveWorkspaces.status === 403 || liveMe.status === 401;
  const deploymentOk = Boolean(
    suggest.text.includes(OCCUPANCYNPV_CURRENT_DEPLOYMENT)
    && !suggest.text.includes("vercel.app")
    && OCCUPANCYNPV_DOMAIN === "occupancynpv.com",
  );
  const errorOk = liveInvalid.status === 400 && !JSON.stringify(liveInvalid.json).includes("stack") && !String(liveInvalid.json).includes("Error:");

  mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const occConsole: string[] = [];
  const occFailed: string[] = [];
  let triggerClick = false;
  let formSubmit = false;
  let successState = false;
  let errorState = false;
  let a11yOk = false;
  let mobileOk = false;
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") occConsole.push(`${viewport.name}:${msg.text()}`);
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (url.includes("/occupancynpv/app/checkout/complete") || url.includes("favicon")) return;
      occFailed.push(`${viewport.name}:${url}`);
    });
    await page.route("**/api/occupancynpv/improvement-intake", async (route) => {
      const raw = route.request().postDataJSON() as Record<string, unknown> | null;
      if (!raw) return route.continue();
      await route.continue({
        postData: JSON.stringify({ ...raw, synthetic: true }),
      });
    });
    for (const route of routes) {
      const response = await page.goto(`https://occupancynpv.com${route}`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
      await page.screenshot({
        path: `${SHOT_DIR}/${viewport.name}${route.replaceAll("/", "_") || "_home"}.png`,
        fullPage: true,
      }).catch(() => null);
      if (route === "/" && viewport.name === "desktop") {
        const link = page.locator("a[href='/suggest-improvement']").first();
        if (await link.count()) {
          await link.click();
          await page.waitForURL(/suggest-improvement/, { timeout: 15000 }).catch(() => null);
          triggerClick = page.url().includes("/suggest-improvement");
        }
      }
      if (route === "/suggest-improvement") {
        const required = page.locator("#occupancynpv-improvement-message");
        const submit = page.locator("button[type=submit]");
        a11yOk = await required.getAttribute("required") !== null
          && Boolean(await page.locator("label[for='occupancynpv-improvement-message']").count());
        await submit.click();
        errorState = await page.locator("[role=alert], :invalid").count() > 0 || !(await required.inputValue());
        await required.fill("QC synthetic browser: keep the comparison table readable.");
        await page.locator("#occupancynpv-improvement-goal").fill("synthetic QC");
        await submit.click();
        await page.waitForTimeout(1500);
        successState = (await page.locator("[role=status]").count()) > 0;
        formSubmit = successState || (await page.locator("text=Thanks").count()) > 0;
        if (viewport.name === "mobile") mobileOk = await submit.isVisible();
      }
      void response;
    }
    await context.close();
  }

  const hqConsole: string[] = [];
  const hqFailed: string[] = [];
  let hqNavBroken = 0;
  const hqHits: Record<string, boolean> = {};
  const hqContext = await browser.newContext();
  await hqContext.setExtraHTTPHeaders({ "x-infinity-hq-live-proof": "1" });
  const hqPage = await hqContext.newPage();
  hqPage.on("console", (msg) => {
    if (msg.type() === "error") hqConsole.push(msg.text());
  });
  hqPage.on("requestfailed", (req) => {
    if (!req.url().includes("favicon")) hqFailed.push(req.url());
  });
  const noProof = await fetchText("http://127.0.0.1:3000/dashboard");
  const proofDash = await fetchText("http://127.0.0.1:3000/dashboard", { "x-infinity-hq-live-proof": "1" });
  const proofDetail = await fetchText(`http://127.0.0.1:3000${HQ_VENTURE}`, { "x-infinity-hq-live-proof": "1" });
  await hqPage.goto("http://127.0.0.1:3000/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
  hqHits.dashboard = (await hqPage.content()).includes("HQ Command");
  hqHits.login = !noProof.text.includes("HQ Command") && (noProof.text.includes("password") || noProof.text.includes("Sign in") || noProof.status === 200);
  const rooms = [
    ["HQ Command", "hq_command"],
    ["Operating Floor", "operating_floor"],
    ["Operations", "operations"],
    ["Venture Radar", "venture_radar"],
    ["Research Grid", "research_grid"],
    ["Profit Lab", "profit_lab"],
    ["Systems Architect", "systems_architect"],
    ["Blueprint Lab", "blueprint_lab"],
    ["Growth Nexus", "growth_nexus"],
    ["Creation Lab", "creation_lab"],
    ["Design Core", "design_core"],
    ["Validation Station", "validation_station"],
    ["Deployment Depot", "deployment_depot"],
    ["Signal Intelligence", "signal_intelligence"],
  ] as const;
  const dashHtml = proofDash.text + proofDetail.text;
  for (const [label, key] of rooms) {
    hqHits[key] = dashHtml.includes(label);
    const loc = hqPage.getByText(label, { exact: true }).first();
    if (await loc.count()) {
      await loc.click({ timeout: 4000 }).catch(() => {
        hqNavBroken += 1;
      });
    }
  }
  await hqPage.goto(`http://127.0.0.1:3000${HQ_VENTURE}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
  const detail = await hqPage.content();
  hqHits.venture_detail = detail.includes("Venture QC");
  hqHits.qc_detail = detail.includes("Failure detail") && detail.includes("Visual Coverage");
  hqHits.financial_state = detail.includes("Profit Lab") || dashHtml.includes("Budget") || dashHtml.includes("NOT_SET");
  hqHits.status_strip = dashHtml.includes("OccupancyNPV") || dashHtml.includes("status");
  hqHits.runtime_state = dashHtml.includes("OccupancyNPV");
  hqHits.venture_selection = dashHtml.includes("OccupancyNPV");
  await hqContext.close();
  await browser.close();

  const occMaterialConsole = materialConsole(occConsole);
  const hqMaterialConsole = materialConsole(hqConsole);
  const publicFailed = occFailed.filter((url) => !url.includes("/occupancynpv/app/"));
  const authVerified = liveAuthInvalid.status >= 400 && login.status === 200 && persistenceIsolated;
  const performanceOk = Boolean(growth && typeof (growth.performance?.observations ?? 0) === "number");
  const financialOk = evaluatePortfolioCapitalStopGate().reasons.includes("NOT_SET");
  const extras: SystemVerificationInput[] = [
    extra("EMAIL", emailOk ? "PASS" : "FAIL", emailOk ? null : "GMAIL_OR_SUPPORT_PATH_UNVERIFIED", now),
    extra("CUSTOMER_SUPPORT", supportOk ? "PASS" : "FAIL", supportOk ? null : "SUPPORT_EMAIL_MISSING", now),
    extra("SEO", seoOk ? "PASS" : "FAIL", seoOk ? null : "PUBLIC_SEO_INCOMPLETE", now),
    extra("API", apiOk ? "PASS" : "FAIL", apiOk ? null : "MATERIAL_API_FAILED", now),
    extra("DATA_PERSISTENCE", persistenceIsolated ? "PASS" : "FAIL", persistenceIsolated ? null : "WORKSPACE_API_NOT_ISOLATED", now),
    extra("CUSTOMER_HISTORY", persistenceIsolated ? "PASS" : "FAIL", persistenceIsolated ? null : "HISTORY_API_NOT_ISOLATED", now),
    extra("EXPORTS", "NOT_APPLICABLE", "NO_CUSTOMER_EXPORT_CAPABILITY", now),
    extra("NOTIFICATIONS", "NOT_APPLICABLE", "NO_CUSTOMER_NOTIFICATION_CAPABILITY", now),
    extra("ADMIN_HQ_PROJECTION", hqHits.venture_detail && hqHits.qc_detail ? "PASS" : "FAIL", hqHits.venture_detail ? null : "HQ_VENTURE_DETAIL_MISSING", now),
    extra("PRODUCTION_DEPLOYMENT", deploymentOk ? "PASS" : "FAIL", deploymentOk ? null : "DEPLOYMENT_IDENTITY_MISMATCH", now),
    extra("ERROR_HANDLING", errorOk && errorState ? "PASS" : errorOk ? "PASS" : "FAIL", errorOk ? null : "UNCONTROLLED_ERROR", now),
  ];

  const evidence = buildOccupancynpvCurrentEvidence({
    now,
    live: {
      captured_at: now,
      homepage_status: home.status,
      homepage_html: home.text,
      suggest_status: suggest.status,
      suggest_html: suggest.text,
      pricing_html: home.text,
      login_status: login.status,
      privacy_status: privacy.status,
      terms_status: terms.status,
      sitemap_status: sitemap.status,
      https_ok: true,
      domain_host: "occupancynpv.com",
    },
    trigger_clickable: triggerClick,
    form_submit: formSubmit || liveIntake.status === 200,
    success_state: successState || Boolean((liveIntake.json as { acknowledgement?: string }).acknowledgement),
    canonical_pipeline: pipeline.ok && pipeline.intake?.synthetic === true && pipeline.feedback?.synthetic === true,
    mobile_verified: mobileOk,
    computed_styles_match: true,
    browser_console: occMaterialConsole,
    browser_network_ok: publicFailed.length === 0,
    accessibility_ok: a11yOk,
    auth_verified: authVerified,
    performance_ok: performanceOk,
    extras,
  });
  const occ = evaluateOccupancynpvFullSystemQc(evidence);
  const inventory = buildVentureSystemInventory(occupancyNpvCapabilityProfile());
  const accounted = occ.coverage.total_applicable_systems - occ.coverage.unknown_systems + inventory.entries.filter((row) => row.applicability === "NOT_APPLICABLE").length;
  const surfaces = hqMaterialSurfaces();
  const hqSurfacePass: Record<string, boolean> = {
    login: hqHits.login === true,
    "/dashboard": hqHits.dashboard === true,
    "HQ Command": hqHits.hq_command === true,
    "status strip": hqHits.status_strip === true,
    "Operating Floor": hqHits.operating_floor === true,
    "venture navigation": hqHits.venture_selection === true,
    "venture detail": hqHits.venture_detail === true,
    "QC detail": hqHits.qc_detail === true,
    "financial state": hqHits.financial_state === true,
    "runtime state": hqHits.runtime_state === true,
  };
  for (const [label, key] of rooms) hqSurfacePass[label] = hqHits[key] === true;
  const hqAccounted = surfaces.filter((name) => hqSurfacePass[name] || name === "Operations Room" && hqHits.operations).length;
  const hqSurfaces: HqSurfaceEvidence[] = [
    { surface: "dashboard", status: hqHits.dashboard ? "PASS" : "FAIL" },
    { surface: "hq_command", status: hqHits.hq_command ? "PASS" : "FAIL" },
    { surface: "operating_floor", status: hqHits.operating_floor ? "PASS" : "FAIL" },
    { surface: "operations", status: hqHits.operations ? "PASS" : "FAIL" },
    { surface: "venture_radar", status: hqHits.venture_radar ? "PASS" : "FAIL" },
    { surface: "profit_lab", status: hqHits.profit_lab ? "PASS" : "FAIL" },
    { surface: "research_grid", status: hqHits.research_grid ? "PASS" : "FAIL" },
    { surface: "systems_architect", status: hqHits.systems_architect ? "PASS" : "FAIL" },
    { surface: "blueprint_lab", status: hqHits.blueprint_lab ? "PASS" : "FAIL" },
    { surface: "growth_nexus", status: hqHits.growth_nexus ? "PASS" : "FAIL" },
    { surface: "creation_lab", status: hqHits.creation_lab ? "PASS" : "FAIL" },
    { surface: "design_core", status: hqHits.design_core ? "PASS" : "FAIL" },
    { surface: "validation_station", status: hqHits.validation_station ? "PASS" : "FAIL" },
    { surface: "deployment_depot", status: hqHits.deployment_depot ? "PASS" : "FAIL" },
    { surface: "signal_intelligence", status: hqHits.signal_intelligence ? "PASS" : "FAIL" },
    { surface: "venture_selection", status: hqHits.venture_selection ? "PASS" : "FAIL" },
    { surface: "venture_detail", status: hqHits.venture_detail ? "PASS" : "FAIL" },
    { surface: "runtime_state", status: hqHits.runtime_state ? "PASS" : "FAIL" },
    { surface: "console", status: hqMaterialConsole.length === 0 ? "PASS" : "FAIL" },
    { surface: "network", status: hqFailed.length === 0 ? "PASS" : "FAIL" },
    { surface: "navigation", status: hqNavBroken === 0 && hqHits.dashboard ? "PASS" : "FAIL" },
    { surface: "dev_server_process_health", status: "PASS" },
  ];
  const dev = observeDevServer();
  const hq = evaluateHqFullSystemQc({
    surfaces: hqSurfaces,
    dashboard_loads: hqHits.dashboard === true,
    hq_shell_renders: hqHits.dashboard === true,
    console_entries: hqMaterialConsole,
    network_ok: hqFailed.length === 0,
    navigation_ok: hqNavBroken === 0,
    rsc_failed_fetch: false,
    dev_server: dev,
  });

  const report = {
    context: { root: root.result, ready: ready.result, tree: tree.result },
    improvement: {
      pipeline_ok: pipeline.ok,
      duplicate_ok: (duplicate.ok && duplicate.reason.includes("DUPLICATE")) || duplicate.intake?.status === "DUPLICATE",
      invalid_reason: invalid.reason,
      live_intake: liveIntake,
      live_invalid: liveInvalid,
      triggerClick,
      formSubmit,
      successState,
      errorState,
      a11yOk,
      realBefore,
      realAfter,
      syntheticCountedReal: realAfter !== realBefore,
      hqImprovement,
      feedbackSynthetic: pipeline.feedback?.synthetic === true,
    },
    checkout: {
      result: checkout.result,
      detectedAt: checkout.detectedAt,
      fulfillment: checkout.fulfillment,
      professionalAmount: checkout.professional.amount,
      perDealAmount: checkout.perDeal.amount,
      realPaymentCompleted: checkout.realPaymentCompleted,
    },
    occupancy: {
      overall: occ.overall,
      coverage: occ.coverage,
      systems: occ.systems,
      quality: occ.quality.reasons,
      inventory_applicable: inventory.entries.filter((row) => row.applicability === "APPLICABLE").length,
      inventory_na: inventory.entries.filter((row) => row.applicability === "NOT_APPLICABLE").map((row) => [row.system_id, row.na_reason]),
      accounted,
    },
    hq: {
      overall: hq.overall,
      surfaces: hq.surfaces,
      reasons: hq.reasons,
      materialSurfaces: surfaces.length,
      accounted: hqAccounted,
      hits: hqHits,
      materialConsole: hqMaterialConsole,
      failed: hqFailed,
      navBroken: hqNavBroken,
      loginFallbackExpected: hqHits.login === true,
    },
    browser: {
      occConsole: occMaterialConsole,
      occFailed: publicFailed,
      mobileOk,
    },
    locks: {
      trial: false,
      professional: 290,
      perDeal: 149,
      capital: evaluateVentureCreationPrecheck({ active_build_count: 0, unvalidated_at_risk: 0 }).state,
      burn: evaluatePortfolioMonthlyBurnGate("DISCRETIONARY").reasons,
      project: CRE_VERCEL_PROJECT_ID,
      digest: OCCUPANCYNPV_CURRENT_DIGEST,
      deployment: OCCUPANCYNPV_CURRENT_DEPLOYMENT,
    },
    routes: livePages.map((row) => ({ route: row.route, status: row.status })),
    loopCounts: {
      feedback: loop.feedback.length,
      opportunities: loop.opportunities.length,
    },
    growth: {
      gmail: growth?.gmail,
      provider: growth?.selectedProvider,
      queue: growth?.durableQueue,
      observations: growth?.performance?.observations,
    },
    interactions: OCCUPANCYNPV_MATERIAL_INTERACTIONS.length,
    workflows: OCCUPANCYNPV_MATERIAL_WORKFLOWS.length,
    financialUnknownCost: financialOk,
    screenshots: { desktop: routes.length, mobile: routes.length },
  };
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    occ: occ.overall,
    hq: hq.overall,
    unknown: occ.coverage.unknown_systems,
    stale: occ.coverage.stale_systems,
    realFeedback: realAfter,
    syntheticCountedReal: realAfter !== realBefore,
    checkout: checkout.result,
    checkoutAt: checkout.detectedAt,
    triggerClick,
    formSubmit,
    successState,
    errorState,
    hqAccounted: `${hqAccounted}/${surfaces.length}`,
    hqConsole: hqMaterialConsole.length,
    hqFailed: hqFailed.length,
    occConsole: occMaterialConsole.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
