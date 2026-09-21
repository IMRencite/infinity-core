import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { premiumAuthorityArtifactIdFor } from "@/lib/infinity/venture-website-architecture/compose-authority-artifact";
import { digestOfAuthorityFiles } from "@/lib/infinity/venture-website-architecture/cre-successor";
import { applyCustomerFacingPageGutterCss } from "@/lib/infinity/public-venture-design/rendered-layout/customer-facing-gutter";
import { composeOccupancynpvPaymentSafetyRollbackFiles } from "./occupancynpv-payment-safety-rollback-surface";

export const OCCUPANCYNPV_PAID_PRODUCT_SITE_CONTRACT = "occupancynpv_paid_product_durable_persistence_v1" as const;

function repo(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function occupancynpvServerSource(): string {
  return `import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createOccupancynpvClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("OCCUPANCYNPV_SUPABASE_ENV_MISSING");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
      },
    },
  });
}
`;
}

function occupancynpvAdminSource(): string {
  return `import { createClient } from "@supabase/supabase-js";

export function createOccupancynpvAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
`;
}

function occupancynpvDurableSource(): string {
  return `import { createOccupancynpvClient } from "./server";
import { createOccupancynpvAdmin } from "./admin";
import { analyzeLeaseScenario, compareScenarios, sensitivityByDiscountRate, type LeaseScenarioInput } from "./npv";

function customerIdFor(userId: string) {
  return "cust_" + userId.replace(/-/g, "").slice(0, 16);
}

async function persistCustomer(userId: string, email: string) {
  const supabase = await createOccupancynpvClient();
  const customer = {
    customer_id: customerIdFor(userId),
    venture_id: "occupancynpv",
    auth_identity_id: userId,
    email,
    status: "ACTIVE",
  };
  const inserted = await supabase.from("occupancynpv_customers").insert(customer);
  if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
    const admin = createOccupancynpvAdmin();
    if (!admin) return { ok: false as const, reason: "CUSTOMER_PERSIST_FAILED" };
    const adminInsert = await admin.from("occupancynpv_customers").insert(customer);
    if (adminInsert.error && !/duplicate|unique/i.test(adminInsert.error.message)) {
      return { ok: false as const, reason: "CUSTOMER_PERSIST_FAILED" };
    }
  }
  return { ok: true as const, customerId: customer.customer_id };
}

export async function durableSignup(email: string, password: string) {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.includes("@") || password.length < 8) return { ok: false as const, reason: "INVALID_ACCOUNT_FIELDS" };
  const supabase = await createOccupancynpvClient();
  const signed = await supabase.auth.signUp({ email: cleaned, password });
  let userId = signed.data.user?.id ?? null;
  if (userId && !signed.data.session) {
    const admin = createOccupancynpvAdmin();
    if (admin) {
      await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      const confirmed = await supabase.auth.signInWithPassword({ email: cleaned, password });
      if (confirmed.error || !confirmed.data.user) return { ok: false as const, reason: "SIGNIN_AFTER_CREATE_FAILED" };
      userId = confirmed.data.user.id;
    }
  }
  if (!userId) {
    const admin = createOccupancynpvAdmin();
    if (!admin) return { ok: false as const, reason: signed.error?.message === "User already registered" ? "EMAIL_IN_USE" : "ACCOUNT_CREATE_FAILED" };
    const created = await admin.auth.admin.createUser({ email: cleaned, password, email_confirm: true });
    if (created.error || !created.data.user) return { ok: false as const, reason: signed.error?.message === "User already registered" ? "EMAIL_IN_USE" : "ACCOUNT_CREATE_FAILED" };
    const session = await supabase.auth.signInWithPassword({ email: cleaned, password });
    if (session.error || !session.data.user) return { ok: false as const, reason: "SIGNIN_AFTER_CREATE_FAILED" };
    userId = session.data.user.id;
  }
  const persisted = await persistCustomer(userId, cleaned);
  if (!persisted.ok) return persisted;
  return { ok: true as const, customerId: persisted.customerId };
}

export async function durableSignin(email: string, password: string) {
  const supabase = await createOccupancynpvClient();
  const signed = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (signed.error || !signed.data.user) return { ok: false as const, reason: "INVALID_CREDENTIALS" };
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "CUSTOMER_DISABLED" };
  return { ok: true as const, customerId: session.customer_id };
}

export async function durableSignout() {
  const supabase = await createOccupancynpvClient();
  await supabase.auth.signOut();
}

export async function durablePersistImprovementIntake(body: {
  message?: string;
  source?: string;
  submission_id?: string;
  goal_or_context?: string | null;
  page_url_or_route?: string | null;
  workflow_context?: string | null;
  contact_email?: string | null;
  synthetic?: boolean;
}) {
  const admin = createOccupancynpvAdmin();
  if (!admin) return { ok: false as const, reason: "INTAKE_ADMIN_UNAVAILABLE" };
  const message = String(body.message ?? "").trim();
  if (!message) return { ok: false as const, reason: "MESSAGE_REQUIRED" };
  const submissionId = String(body.submission_id ?? "").trim() || ("auto:" + Date.now());
  const bucket = "occupancynpv-improvement-intake";
  await admin.storage.createBucket(bucket, { public: false }).catch(() => null);
  const payload = {
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    submission_id: submissionId,
    source: body.source ?? "PUBLIC_SITE_FEEDBACK",
    message,
    goal_or_context: body.goal_or_context ?? null,
    page_url_or_route: body.page_url_or_route ?? null,
    workflow_context: body.workflow_context ?? null,
    contact_email: body.contact_email ?? null,
    product_area: "OccupancyNPV",
    synthetic: body.synthetic === true,
    created_at: new Date().toISOString(),
  };
  const uploaded = await admin.storage.from(bucket).upload("pending/" + submissionId + ".json", JSON.stringify(payload), {
    contentType: "application/json",
    upsert: true,
  });
  if (uploaded.error) return { ok: false as const, reason: "INTAKE_PERSIST_FAILED" };
  return { ok: true as const, submission_id: submissionId };
}

const FOUNDER_QA_CANDIDATE_EMAIL = "infinitemediaresources@gmail.com";
const QC_EMAILS = ["occupancynpv-qc-alpha@example.com", "occupancynpv-qc-beta@example.com"];
const INTERNAL_QA_OFFER = "INTERNAL_QA";
const INTERNAL_QA_ENTITLEMENT = "INTERNAL_QA_ACCESS";

function founderQaRevoked() {
  return process.env.OCCUPANCYNPV_FOUNDER_QA_REVOKED === "1";
}

function founderQaEligible(session: { email: string; auth_identity_id: string }) {
  if (founderQaRevoked()) return false;
  const bound = process.env.OCCUPANCYNPV_FOUNDER_QA_AUTH_IDENTITY_ID;
  if (bound && bound === session.auth_identity_id) return true;
  const email = session.email.trim().toLowerCase();
  if (QC_EMAILS.includes(email) && Boolean(session.auth_identity_id)) return true;
  return email === FOUNDER_QA_CANDIDATE_EMAIL && Boolean(session.auth_identity_id);
}

async function ensureInternalQa(session: { email: string; auth_identity_id: string; customer_id: string }) {
  if (!founderQaEligible(session)) return;
  const admin = createOccupancynpvAdmin();
  if (!admin) return;
  const existing = await admin.from("occupancynpv_entitlements").select("entitlement_id,status").eq("customer_id", session.customer_id).eq("entitlement_type", INTERNAL_QA_ENTITLEMENT).maybeSingle();
  if (existing.data?.status === "ACTIVE") return;
  const paymentReference = session.email.trim().toLowerCase() === FOUNDER_QA_CANDIDATE_EMAIL
    ? "internal_qa_occupancynpv_founder_v1"
    : "internal_qa_" + session.customer_id;
  const row = {
    entitlement_id: existing.data?.entitlement_id ?? ("ent_qa_" + session.customer_id.slice(-10)),
    customer_id: session.customer_id,
    offer_id: INTERNAL_QA_OFFER,
    payment_reference: paymentReference,
    subscription_reference: null,
    entitlement_type: INTERNAL_QA_ENTITLEMENT,
    quantity: 1,
    quantity_remaining: null,
    status: "ACTIVE",
  };
  const inserted = await admin.from("occupancynpv_entitlements").upsert(row, { onConflict: "payment_reference,offer_id" });
  if (inserted.error) {
    await admin.from("occupancynpv_entitlements").upsert({
      ...row,
      offer_id: "PROFESSIONAL",
      payment_reference: paymentReference,
    }, { onConflict: "payment_reference,offer_id" });
  }
}

export async function durableUser() {
  const supabase = await createOccupancynpvClient();
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const customer = await supabase.from("occupancynpv_customers").select("*").eq("auth_identity_id", data.user.id).maybeSingle();
    if (!customer.data) return null;
    const session = { auth_identity_id: data.user.id, customer_id: customer.data.customer_id as string, email: customer.data.email as string };
    await ensureInternalQa(session);
    return session;
  } catch {
    return null;
  }
}

function workspaceCard(
  row: { workspace_id: string; name: string; status?: string; created_at?: string; updated_at?: string },
  owned: Array<{ workspace_id: string; result_json?: unknown }>,
) {
  const analyzed = owned.filter((item) => item.result_json);
  return {
    id: row.workspace_id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scenarioCount: owned.length,
    analysisStatus: analyzed.length >= 2 ? "Results ready" : owned.length >= 2 ? "Scenarios entered" : owned.length > 0 ? "In progress" : "Ready to compare",
  };
}

function emitCollectionEvent(type: string, qa: boolean) {
  console.info(JSON.stringify({ source: "occupancynpv", type, label: qa ? "INTERNAL_QA" : "CUSTOMER" }));
}

export async function durableMe() {
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createOccupancynpvClient();
  const entitlements = await supabase.from("occupancynpv_entitlements").select("*").eq("customer_id", session.customer_id);
  const workspaces = await supabase.from("occupancynpv_deal_workspaces").select("workspace_id,status").eq("customer_id", session.customer_id);
  const rows = workspaces.data ?? [];
  return {
    ok: true as const,
    customer: session,
    entitlements: (entitlements.data ?? []).map((row) => ({
      offer: row.entitlement_type === INTERNAL_QA_ENTITLEMENT ? INTERNAL_QA_OFFER : row.offer_id,
      status: row.status,
      quantityRemaining: row.quantity_remaining,
      expiresAt: row.expires_at,
    })),
    workspaceCounts: {
      total: rows.length,
      active: rows.filter((row: { status?: string }) => row.status !== "ARCHIVED").length,
      archived: rows.filter((row: { status?: string }) => row.status === "ARCHIVED").length,
    },
    workspaces: [],
    support: "infinitemediaresources@gmail.com",
  };
}

export async function durableStartProfessionalTrial() {
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const admin = createOccupancynpvAdmin();
  if (!admin) return { ok: false as const, reason: "ADMIN_MISSING" };
  const existing = await admin.from("occupancynpv_entitlements").select("*").eq("customer_id", session.customer_id);
  const rows = existing.data ?? [];
  const paid = rows.find((row) => row.offer_id === "PROFESSIONAL" && !String(row.payment_reference ?? "").startsWith("trial:") && (row.status === "ACTIVE" || row.status === "PAST_DUE"));
  if (paid) return { ok: true as const, alreadyPaid: true, entitlementId: paid.entitlement_id };
  const priorTrial = rows.find((row) => String(row.payment_reference ?? "").startsWith("trial:"));
  if (priorTrial) return { ok: false as const, reason: "TRIAL_ALREADY_USED" };
  const now = new Date();
  const expires = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  const row = {
    entitlement_id: "ent_trial_" + session.customer_id.slice(-12),
    customer_id: session.customer_id,
    offer_id: "PROFESSIONAL",
    payment_reference: "trial:" + session.customer_id,
    subscription_reference: null,
    entitlement_type: "PROFESSIONAL_ACCESS",
    quantity: 1,
    quantity_remaining: 1,
    status: "ACTIVE",
    start_at: now.toISOString(),
    expires_at: expires,
    consumed_at: null,
  };
  const inserted = await admin.from("occupancynpv_entitlements").upsert(row, { onConflict: "payment_reference,offer_id" });
  if (inserted.error) return { ok: false as const, reason: "TRIAL_PERSIST_FAILED" };
  return { ok: true as const, alreadyPaid: false, entitlementId: row.entitlement_id, expiresAt: expires };
}

export async function durableCreateWorkspace(name: string) {
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createOccupancynpvClient();
  const entitlements = await supabase.from("occupancynpv_entitlements").select("*").eq("customer_id", session.customer_id);
  const rows = entitlements.data ?? [];
  const now = new Date().toISOString();
  const qa = rows.find((row) => (row.offer_id === INTERNAL_QA_OFFER || row.entitlement_type === INTERNAL_QA_ENTITLEMENT) && row.status === "ACTIVE");
  const perDeal = rows.find((row) => row.offer_id === "PER_DEAL" && row.status === "ACTIVE" && (row.quantity_remaining ?? 0) > 0);
  const professional = rows.find((row) => row.offer_id === "PROFESSIONAL" && row.entitlement_type !== INTERNAL_QA_ENTITLEMENT && (row.status === "ACTIVE" || row.status === "PAST_DUE"));
  const trialExpired = professional && String(professional.payment_reference ?? "").startsWith("trial:") && professional.expires_at && now >= professional.expires_at;
  const entitlement = qa ?? perDeal ?? (trialExpired ? null : professional);
  if (!entitlement) return { ok: false as const, reason: trialExpired ? "TRIAL_EXPIRED" : "NO_VALID_ENTITLEMENT" };
  if (professional && entitlement === professional && String(professional.payment_reference ?? "").startsWith("trial:")) {
    if ((professional.quantity_remaining ?? 0) <= 0) return { ok: false as const, reason: "TRIAL_WORKSPACE_LIMIT" };
    const remaining = (professional.quantity_remaining ?? 1) - 1;
    await supabase.from("occupancynpv_entitlements").update({
      quantity_remaining: remaining,
      status: remaining <= 0 ? "CONSUMED" : "ACTIVE",
      consumed_at: remaining <= 0 ? now : null,
    }).eq("entitlement_id", professional.entitlement_id).eq("customer_id", session.customer_id);
  }
  if (perDeal && entitlement === perDeal) {
    const remaining = (perDeal.quantity_remaining ?? 1) - 1;
    await supabase.from("occupancynpv_entitlements").update({
      quantity_remaining: remaining,
      status: remaining <= 0 ? "CONSUMED" : "ACTIVE",
      consumed_at: remaining <= 0 ? new Date().toISOString() : null,
    }).eq("entitlement_id", perDeal.entitlement_id).eq("customer_id", session.customer_id);
  }
  const workspace = {
    workspace_id: "ws_" + session.customer_id.slice(-10) + Date.now().toString(36),
    customer_id: session.customer_id,
    entitlement_id: entitlement.entitlement_id,
    name: name.trim() || "Deal workspace",
    status: "ACTIVE",
  };
  const inserted = await supabase.from("occupancynpv_deal_workspaces").insert(workspace);
  if (inserted.error) return { ok: false as const, reason: "WORKSPACE_PERSIST_FAILED" };
  return { ok: true as const, workspace };
}

export async function durableListWorkspacesPage(query: { status?: string; page?: number; pageSize?: number; q?: string } = {}) {
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createOccupancynpvClient();
  const status = query.status ?? "ACTIVE";
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10));
  const page = Math.max(1, query.page ?? 1);
  const q = (query.q ?? "").trim();
  let request = supabase.from("occupancynpv_deal_workspaces").select("workspace_id,name,status,created_at,updated_at", { count: "exact" }).eq("customer_id", session.customer_id).order("updated_at", { ascending: false });
  if (status !== "ALL") request = request.eq("status", status);
  if (q) request = request.ilike("name", "%" + q.replace(/[%_]/g, "") + "%");
  const from = (page - 1) * pageSize;
  const listed = await request.range(from, from + pageSize - 1);
  const rows = listed.data ?? [];
  const ids = rows.map((row) => row.workspace_id);
  const scenarios = ids.length
    ? await supabase.from("occupancynpv_lease_scenarios").select("workspace_id,result_json").in("workspace_id", ids)
    : { data: [] };
  return {
    ok: true as const,
    items: rows.map((row: { workspace_id: string; name: string; status?: string; created_at?: string; updated_at?: string }) => workspaceCard(row, (scenarios.data ?? []).filter((item: { workspace_id: string }) => item.workspace_id === row.workspace_id))),
    total: listed.count ?? rows.length,
    page,
    pageSize,
    status,
    q,
  };
}

export async function durableUpdateWorkspace(workspaceId: string, body: { name?: string; status?: string }) {
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createOccupancynpvClient();
  const access = await supabase.from("occupancynpv_deal_workspaces").select("*").eq("workspace_id", workspaceId).maybeSingle();
  if (!access.data) return { ok: false as const, reason: "WORKSPACE_NOT_FOUND" };
  if (access.data.customer_id !== session.customer_id) return { ok: false as const, reason: "CROSS_CUSTOMER_DENIED" };
  const next = {
    name: (body.name ?? "").trim() || access.data.name,
    status: body.status ?? access.data.status,
    updated_at: new Date().toISOString(),
  };
  const updated = await supabase.from("occupancynpv_deal_workspaces").update(next).eq("workspace_id", workspaceId).eq("customer_id", session.customer_id);
  if (updated.error) return { ok: false as const, reason: "WORKSPACE_UPDATE_FAILED" };
  const qa = session.email.trim().toLowerCase() === "infinitemediaresources@gmail.com";
  if (body.status === "ARCHIVED") emitCollectionEvent("workspace_archived", qa);
  if (body.status === "ACTIVE" && access.data.status === "ARCHIVED") emitCollectionEvent("workspace_restored", qa);
  if (body.name) emitCollectionEvent("workspace_renamed", qa);
  return { ok: true as const, workspace: { ...access.data, ...next } };
}

export async function durableWorkspace(workspaceId: string, compareScenarioIds?: string[]) {
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createOccupancynpvClient();
  const access = await supabase.from("occupancynpv_deal_workspaces").select("*").eq("workspace_id", workspaceId).maybeSingle();
  if (!access.data) return { ok: false as const, reason: "WORKSPACE_NOT_FOUND" };
  if (access.data.customer_id !== session.customer_id) return { ok: false as const, reason: "CROSS_CUSTOMER_DENIED" };
  const { data } = await supabase.from("occupancynpv_lease_scenarios").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true });
  const scenarios = (data ?? []).map((row) => ({ scenario_id: row.scenario_id, workspace_id: row.workspace_id, input: row.input_json, result: row.result_json, created_at: row.created_at }));
  const ready = scenarios.filter((row) => row.result);
  const ids = (compareScenarioIds ?? []).filter(Boolean);
  const selected = ids.length >= 2
    ? ids.slice(0, 2).map((id) => ready.find((row) => row.scenario_id === id)).filter((row): row is typeof ready[number] => Boolean(row))
    : ready.length === 2 ? ready : [];
  const pair = selected.length === 2 ? selected : [];
  const results = pair.map((row) => row.result).filter((value): value is NonNullable<typeof value> => Boolean(value));
  const comparison = results.length === 2 ? compareScenarios(results) : null;
  const first = pair[0] ?? ready[0];
  const sensitivity = first ? sensitivityByDiscountRate(first.input as LeaseScenarioInput, [0, 0.08, 0.12]) : [];
  return { ok: true as const, workspace: access.data, scenarios, comparison, compareScenarioIds: pair.map((row) => row.scenario_id), sensitivity };
}

export async function durableSave(workspaceId: string, scenarios: LeaseScenarioInput[], options: { compare?: boolean; compareScenarioIds?: string[] } = {}) {
  const session = await durableUser();
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  if ((scenarios ?? []).length < 1) return { ok: false as const, reason: "SCENARIO_REQUIRED" };
  const supabase = await createOccupancynpvClient();
  const access = await supabase.from("occupancynpv_deal_workspaces").select("workspace_id,customer_id").eq("workspace_id", workspaceId).maybeSingle();
  if (!access.data) return { ok: false as const, reason: "WORKSPACE_NOT_FOUND" };
  if (access.data.customer_id !== session.customer_id) return { ok: false as const, reason: "CROSS_CUSTOMER_DENIED" };
  for (const scenario of scenarios) {
    const analyzed = analyzeLeaseScenario(scenario);
    if (!analyzed.ok) return { ok: false as const, reason: "SCENARIO_INVALID", errors: analyzed.errors };
    const saved = await supabase.from("occupancynpv_lease_scenarios").upsert({
      scenario_id: scenario.scenario_id,
      workspace_id: workspaceId,
      input_json: scenario,
      result_json: analyzed.result,
    });
    if (saved.error) return { ok: false as const, reason: "SCENARIO_PERSIST_FAILED" };
  }
  await supabase.from("occupancynpv_deal_workspaces").update({ updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("customer_id", session.customer_id);
  if (options.compare && (options.compareScenarioIds ?? scenarios).length < 2) return { ok: false as const, reason: "TWO_SCENARIOS_REQUIRED" };
  if (options.compare) emitCollectionEvent("comparison_pair_selected", session.email.trim().toLowerCase() === "infinitemediaresources@gmail.com");
  return durableWorkspace(workspaceId, options.compareScenarioIds);
}
`;
}

function jsonRoute(handler: string): string {
  return `import { NextResponse } from "next/server";
${handler}
`;
}

export function composeOccupancynpvPaidProductFiles() {
  const rollback = composeOccupancynpvPaymentSafetyRollbackFiles();
  const files = rollback.files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "package.json") {
      const pkg = JSON.parse(file.content) as { dependencies?: Record<string, string> };
      pkg.dependencies = {
        ...pkg.dependencies,
        "@supabase/ssr": "0.12.3",
        "@supabase/supabase-js": "2.110.8",
      };
      return { ...file, content: `${JSON.stringify(pkg, null, 2)}\n` };
    }
    return file;
  });
  const added: Array<{ path: string; content: string; encoding?: "utf8" }> = [
    { path: "lib/occupancynpv/npv.ts", content: repo("lib/infinity/occupancynpv-product/npv.ts") },
    { path: "lib/occupancynpv/server.ts", content: occupancynpvServerSource() },
    { path: "lib/occupancynpv/admin.ts", content: occupancynpvAdminSource() },
    { path: "lib/occupancynpv/durable.ts", content: occupancynpvDurableSource() },
    { path: "app/occupancynpv/app/layout.tsx", content: repo("app/occupancynpv/app/layout.tsx") },
    { path: "app/occupancynpv/app/occupancynpv-improvement-chrome.tsx", content: repo("app/occupancynpv/app/occupancynpv-improvement-chrome.tsx") },
    { path: "app/occupancynpv/app/page.tsx", content: repo("app/occupancynpv/app/page.tsx") },
    { path: "app/occupancynpv/app/login/page.tsx", content: repo("app/occupancynpv/app/login/page.tsx") },
    { path: "app/occupancynpv/app/checkout/complete/page.tsx", content: repo("app/occupancynpv/app/checkout/complete/page.tsx") },
    { path: "app/occupancynpv/app/workspaces/[id]/page.tsx", content: repo("app/occupancynpv/app/workspaces/[id]/page.tsx") },
    { path: "app/occupancynpv/app/workspaces/[id]/comparison-result-presentation.ts", content: repo("app/occupancynpv/app/workspaces/[id]/comparison-result-presentation.ts") },
    { path: "app/occupancynpv/app/workspaces/[id]/comparison-result-dialog.tsx", content: repo("app/occupancynpv/app/workspaces/[id]/comparison-result-dialog.tsx") },
    { path: "app/occupancynpv/app/workspaces/[id]/comparison-summary-card.tsx", content: repo("app/occupancynpv/app/workspaces/[id]/comparison-summary-card.tsx") },
    { path: "app/occupancynpv/app/workspaces/[id]/result-metric.tsx", content: repo("app/occupancynpv/app/workspaces/[id]/result-metric.tsx") },
    { path: "app/occupancynpv/app/workspaces/[id]/sensitivity-table.tsx", content: repo("app/occupancynpv/app/workspaces/[id]/sensitivity-table.tsx") },
    { path: "app/api/occupancynpv/auth/signup/route.ts", content: jsonRoute(`import { durableSignup } from "../../../../../lib/occupancynpv/durable";
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const created = await durableSignup(body.email ?? "", body.password ?? "");
  if (!created.ok) return NextResponse.json(created, { status: 400 });
  return NextResponse.json(created);
}`) },
    { path: "app/api/occupancynpv/auth/signin/route.ts", content: jsonRoute(`import { durableSignin } from "../../../../../lib/occupancynpv/durable";
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const signed = await durableSignin(body.email ?? "", body.password ?? "");
  if (!signed.ok) return NextResponse.json(signed, { status: 401 });
  return NextResponse.json(signed);
}`) },
    { path: "app/api/occupancynpv/auth/signout/route.ts", content: jsonRoute(`import { durableSignout } from "../../../../../lib/occupancynpv/durable";
export async function POST() {
  await durableSignout();
  return NextResponse.json({ ok: true });
}`) },
    { path: "app/api/occupancynpv/me/route.ts", content: jsonRoute(`import { durableMe } from "../../../../lib/occupancynpv/durable";
export async function GET() {
  try {
    const me = await durableMe();
    if (!me.ok) return NextResponse.json(me, { status: 401 });
    return NextResponse.json(me);
  } catch {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }
}`) },
    { path: "app/api/occupancynpv/workspaces/route.ts", content: jsonRoute(`import { durableCreateWorkspace, durableListWorkspacesPage } from "../../../../lib/occupancynpv/durable";
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") ?? "ACTIVE").toUpperCase();
    const listed = await durableListWorkspacesPage({
      status: status === "ARCHIVED" || status === "ALL" ? status : "ACTIVE",
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 10),
      q: url.searchParams.get("q") ?? "",
    });
    if (!listed.ok) return NextResponse.json(listed, { status: 401 });
    return NextResponse.json(listed);
  } catch {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { name?: string };
  const created = await durableCreateWorkspace(body.name ?? "Deal workspace");
  if (!created.ok) return NextResponse.json(created, { status: created.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json(created);
}`) },
    { path: "app/api/occupancynpv/workspaces/[id]/route.ts", content: jsonRoute(`import { durableUpdateWorkspace, durableWorkspace } from "../../../../../lib/occupancynpv/durable";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const raw = new URL(req.url).searchParams.get("compare");
  const compareScenarioIds = raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : undefined;
  const result = await durableWorkspace(id, compareScenarioIds);
  if (!result.ok) return NextResponse.json(result, { status: result.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json(result);
}
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({})) as { name?: string; status?: "ACTIVE" | "ARCHIVED" };
  const updated = await durableUpdateWorkspace(id, body);
  if (!updated.ok) return NextResponse.json(updated, { status: updated.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json(updated);
}`) },
    { path: "app/api/occupancynpv/workspaces/[id]/scenarios/route.ts", content: jsonRoute(`import { durableSave } from "../../../../../../lib/occupancynpv/durable";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({})) as { scenarios?: never[]; compare?: boolean; compareScenarioIds?: string[] };
  const saved = await durableSave(id, body.scenarios ?? [], { compare: body.compare, compareScenarioIds: body.compareScenarioIds });
  if (!saved.ok) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}`) },
    { path: "app/api/occupancynpv/improvement-intake/route.ts", content: jsonRoute(`import { durablePersistImprovementIntake } from "../../../../lib/occupancynpv/durable";
const ACK = "Thanks — your suggestion has been received and will be evaluated as product feedback.";
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    source?: string;
    submission_id?: string;
    goal_or_context?: string | null;
    page_url_or_route?: string | null;
    workflow_context?: string | null;
    contact_email?: string | null;
    synthetic?: boolean;
  };
  if (!String(body.message ?? "").trim()) return NextResponse.json({ ok: false, reason: "MESSAGE_REQUIRED" }, { status: 400 });
  if (body.synthetic === true && req.headers.get("x-infinity-qc-force-intake-failure") === "1") {
    return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
  }
  const persisted = await durablePersistImprovementIntake(body);
  const runtime = process.env.INFINITY_IMPROVEMENT_INTAKE_URL;
  if (runtime) {
    try {
      const forwarded = await fetch(runtime.replace(/\\/$/, "") + "/api/occupancynpv/improvement-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await forwarded.json().catch(() => ({})) as { ok?: boolean; acknowledgement?: string; source?: string };
      if (forwarded.ok && json.ok) {
        return NextResponse.json({
          ok: true,
          acknowledgement: typeof json.acknowledgement === "string" ? json.acknowledgement : ACK,
          source: json.source ?? body.source ?? "PUBLIC_SITE_FEEDBACK",
        }, { status: forwarded.status });
      }
      if (!persisted.ok) return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
    } catch {
      if (!persisted.ok) return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
    }
  } else if (!persisted.ok) {
    return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    acknowledgement: ACK,
    source: body.source ?? "PUBLIC_SITE_FEEDBACK",
  });
}`) },
  ];
  const paths = added.map((file) => file.path);
  const next = files.filter((file) => !paths.includes(file.path.replace(/\\/g, "/"))).map((file) => {
    if (file.path.replace(/\\/g, "/") !== "styles/globals.css") return file;
    return { ...file, content: applyCustomerFacingPageGutterCss(file.content) };
  });
  next.push(...added);
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID,
    packageId: "occupancynpv-paid-product-durable-v1",
    packageVersion: "1",
    contract: OCCUPANCYNPV_PAID_PRODUCT_SITE_CONTRACT,
  });
  return {
    artifactId,
    digest: digestOfAuthorityFiles(next),
    predecessorArtifactId: rollback.artifactId,
    files: next,
    changedPaths: ["package.json", "styles/globals.css", ...paths, "app/api/checkout/start/route.ts"],
  };
}
