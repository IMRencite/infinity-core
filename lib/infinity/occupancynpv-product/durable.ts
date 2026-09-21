import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emitOccupancynpvCollectionEvent } from "./collection-events";
import { analyzeLeaseScenario, compareScenarios, sensitivityByDiscountRate, type LeaseScenarioInput, type LeaseScenarioResult } from "./npv";
import { PROFESSIONAL_USAGE_POLICY } from "./policy";
import type { OccupancynpvAuthSession, OccupancynpvCustomer } from "./types";
import { WORKSPACE_COLLECTION_PAGE_SIZE, type WorkspaceLifecycleStatus, type WorkspaceListQuery } from "./workspaces";

function table(client: unknown, name: string) {
  return (client as { from: (tableName: string) => any }).from(name);
}

export function occupancynpvProductionPersistenceEnabled(): boolean {
  if (process.env.OCCUPANCYNPV_FORCE_IN_PROCESS === "1") return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function mapStatus(status: string): string {
  return status === "PAST_DUE" ? "ACTIVE" : status;
}

export async function durableSignup(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; session: OccupancynpvAuthSession; customer: OccupancynpvCustomer } | { ok: false; reason: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.length < 8) return { ok: false, reason: "INVALID_ACCOUNT_FIELDS" };
  const supabase = await createClient();
  const signed = await supabase.auth.signUp({ email, password: input.password });
  let userId = signed.data.user?.id ?? null;
  if (!userId) {
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true });
    if (created.error || !created.data.user) {
      return { ok: false, reason: signed.error?.message === "User already registered" ? "EMAIL_IN_USE" : "ACCOUNT_CREATE_FAILED" };
    }
    userId = created.data.user.id;
    const session = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (session.error || !session.data.user) return { ok: false, reason: "SIGNIN_AFTER_CREATE_FAILED" };
    userId = session.data.user.id;
  }
  const customerId = `cust_${userId.replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();
  const row: OccupancynpvCustomer = {
    customer_id: customerId,
    venture_id: "occupancynpv",
    auth_identity_id: userId,
    email,
    status: "ACTIVE",
    stripe_customer_id: null,
    created_at: now,
    updated_at: now,
  };
  const inserted = await table(supabase, "occupancynpv_customers").insert(row);
  if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
    const admin = createAdminClient();
    const adminInsert = await table(admin, "occupancynpv_customers").insert(row);
    if (adminInsert.error && !/duplicate|unique/i.test(adminInsert.error.message)) {
      return { ok: false, reason: "CUSTOMER_PERSIST_FAILED" };
    }
  }
  const customer = await loadCustomerByAuth(userId);
  if (!customer) return { ok: false, reason: "CUSTOMER_PERSIST_FAILED" };
  return { ok: true, customer, session: { auth_identity_id: userId, customer_id: customer.customer_id, email: customer.email } };
}

export async function durableSignin(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; session: OccupancynpvAuthSession } | { ok: false; reason: string }> {
  const supabase = await createClient();
  const signed = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (signed.error || !signed.data.user) return { ok: false, reason: "INVALID_CREDENTIALS" };
  const customer = await loadCustomerByAuth(signed.data.user.id);
  if (!customer || customer.status !== "ACTIVE") return { ok: false, reason: "CUSTOMER_DISABLED" };
  return {
    ok: true,
    session: { auth_identity_id: customer.auth_identity_id, customer_id: customer.customer_id, email: customer.email },
  };
}

export async function durableSignout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function durableSession(): Promise<OccupancynpvAuthSession | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const customer = await loadCustomerByAuth(data.user.id);
    if (!customer) return null;
    return { auth_identity_id: customer.auth_identity_id, customer_id: customer.customer_id, email: customer.email };
  } catch {
    return null;
  }
}

async function loadCustomerByAuth(authIdentityId: string): Promise<OccupancynpvCustomer | null> {
  const supabase = await createClient();
  const { data } = await table(supabase, "occupancynpv_customers").select("*").eq("auth_identity_id", authIdentityId).maybeSingle();
  return (data as OccupancynpvCustomer | null) ?? null;
}

type EntitlementRow = {
  entitlement_id: string;
  customer_id: string;
  offer_id: "PROFESSIONAL" | "PER_DEAL" | "INTERNAL_QA";
  payment_reference: string;
  subscription_reference: string | null;
  entitlement_type: string;
  quantity: number;
  quantity_remaining: number | null;
  status: string;
  start_at: string;
  expires_at: string | null;
  consumed_at: string | null;
};

type ScenarioPersistRow = {
  scenario_id: string;
  workspace_id: string;
  input_json: unknown;
  result_json: unknown;
  created_at?: string;
};

function qaLabel(session: OccupancynpvAuthSession | null): boolean {
  return session?.email.trim().toLowerCase() === "infinitemediaresources@gmail.com";
}

function workspaceCard(
  row: { workspace_id: string; name: string; status?: string; created_at?: string; updated_at?: string },
  owned: Array<{ workspace_id: string; result_json: unknown }>,
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

export async function durableMe(session: OccupancynpvAuthSession) {
  const supabase = await createClient();
  const entitlements = await table(supabase, "occupancynpv_entitlements").select("*").eq("customer_id", session.customer_id);
  const workspaces = await table(supabase, "occupancynpv_deal_workspaces").select("workspace_id,status").eq("customer_id", session.customer_id);
  const workspaceRows = ((await workspaces).data ?? []) as Array<{ workspace_id: string; status?: string }>;
  return {
    ok: true as const,
    customer: session,
    entitlements: (((await entitlements).data ?? []) as EntitlementRow[]).map((row) => ({
      offer: row.entitlement_type === "INTERNAL_QA_ACCESS" ? "INTERNAL_QA" : row.offer_id,
      status: row.status,
      quantityRemaining: row.quantity_remaining,
      expiresAt: row.expires_at,
    })),
    workspaceCounts: {
      total: workspaceRows.length,
      active: workspaceRows.filter((row) => row.status !== "ARCHIVED").length,
      archived: workspaceRows.filter((row) => row.status === "ARCHIVED").length,
    },
    workspaces: [] as Array<ReturnType<typeof workspaceCard>>,
    support: "infinitemediaresources@gmail.com",
  };
}

export async function durableCreateWorkspace(input: {
  session: OccupancynpvAuthSession | null;
  name: string;
}): Promise<{ ok: true; workspace: { workspace_id: string; name: string }; professionalUsagePolicy: typeof PROFESSIONAL_USAGE_POLICY } | { ok: false; reason: string }> {
  if (!input.session) return { ok: false, reason: "UNAUTHENTICATED" };
  const supabase = await createClient();
  const { data: entitlements } = await table(supabase, "occupancynpv_entitlements").select("*").eq("customer_id", input.session.customer_id);
  const rows = (entitlements ?? []) as EntitlementRow[];
  const qa = rows.find((row) => (row.offer_id === "INTERNAL_QA" || row.entitlement_type === "INTERNAL_QA_ACCESS") && row.status === "ACTIVE");
  const perDeal = rows.find((row) => row.offer_id === "PER_DEAL" && row.status === "ACTIVE" && (row.quantity_remaining ?? 0) > 0);
  const professional = rows.find((row) => row.offer_id === "PROFESSIONAL" && row.entitlement_type !== "INTERNAL_QA_ACCESS" && (row.status === "ACTIVE" || row.status === "PAST_DUE"));
  const entitlement = qa ?? perDeal ?? professional;
  if (!entitlement) return { ok: false, reason: "NO_VALID_ENTITLEMENT" };
  if (perDeal && !qa) {
    const remaining = (perDeal.quantity_remaining ?? 1) - 1;
    const consumed = await table(supabase, "occupancynpv_entitlements").update({
      quantity_remaining: remaining,
      status: remaining <= 0 ? "CONSUMED" : "ACTIVE",
      consumed_at: remaining <= 0 ? new Date().toISOString() : null,
    }).eq("entitlement_id", perDeal.entitlement_id).eq("customer_id", input.session.customer_id);
    if (consumed.error) return { ok: false, reason: "ENTITLEMENT_CONSUME_FAILED" };
  }
  const workspace = {
    workspace_id: newId("ws"),
    customer_id: input.session.customer_id,
    entitlement_id: entitlement.entitlement_id,
    name: input.name.trim() || "Deal workspace",
    status: "ACTIVE",
  };
  const inserted = await table(supabase, "occupancynpv_deal_workspaces").insert(workspace);
  if (inserted.error) return { ok: false, reason: "WORKSPACE_PERSIST_FAILED" };
  return { ok: true, workspace: { workspace_id: workspace.workspace_id, name: workspace.name }, professionalUsagePolicy: PROFESSIONAL_USAGE_POLICY };
}

export async function durableListWorkspaces(session: OccupancynpvAuthSession | null) {
  if (!session) return [];
  const supabase = await createClient();
  const { data } = await table(supabase, "occupancynpv_deal_workspaces").select("*").eq("customer_id", session.customer_id);
  return data ?? [];
}

export async function durableListWorkspacesPage(session: OccupancynpvAuthSession | null, query: WorkspaceListQuery = {}) {
  if (!session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createClient();
  const status = query.status ?? "ACTIVE";
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? WORKSPACE_COLLECTION_PAGE_SIZE));
  const page = Math.max(1, query.page ?? 1);
  const q = (query.q ?? "").trim();
  let request = table(supabase, "occupancynpv_deal_workspaces")
    .select("workspace_id,name,status,created_at,updated_at", { count: "exact" })
    .eq("customer_id", session.customer_id)
    .order("updated_at", { ascending: false });
  if (status !== "ALL") request = request.eq("status", status);
  if (q) request = request.ilike("name", `%${q.replace(/[%_]/g, "\\$&")}%`);
  const from = (page - 1) * pageSize;
  const listed = await request.range(from, from + pageSize - 1);
  const rows = (listed.data ?? []) as Array<{ workspace_id: string; name: string; status?: string; created_at?: string; updated_at?: string }>;
  const ids = rows.map((row) => row.workspace_id);
  const scenarios = ids.length
    ? await table(supabase, "occupancynpv_lease_scenarios").select("workspace_id,result_json").in("workspace_id", ids)
    : { data: [] as Array<{ workspace_id: string; result_json: unknown }> };
  const owned = ((scenarios as { data?: Array<{ workspace_id: string; result_json: unknown }> }).data ?? []);
  return {
    ok: true as const,
    items: rows.map((row) => workspaceCard(row, owned.filter((item) => item.workspace_id === row.workspace_id))),
    total: listed.count ?? rows.length,
    page,
    pageSize,
    status,
    q,
  };
}

export async function durableUpdateWorkspace(input: {
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  name?: string;
  status?: WorkspaceLifecycleStatus;
}) {
  if (!input.session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createClient();
  const access = await table(supabase, "occupancynpv_deal_workspaces").select("*").eq("workspace_id", input.workspaceId).maybeSingle();
  if (!access.data) return { ok: false as const, reason: "WORKSPACE_NOT_FOUND" };
  if (access.data.customer_id !== input.session.customer_id) return { ok: false as const, reason: "CROSS_CUSTOMER_DENIED" };
  const next = {
    name: input.name?.trim() || access.data.name,
    status: input.status ?? access.data.status,
    updated_at: new Date().toISOString(),
  };
  const updated = await table(supabase, "occupancynpv_deal_workspaces")
    .update(next)
    .eq("workspace_id", input.workspaceId)
    .eq("customer_id", input.session.customer_id);
  if (updated.error) return { ok: false as const, reason: "WORKSPACE_UPDATE_FAILED" };
  if (input.status === "ARCHIVED") emitOccupancynpvCollectionEvent("workspace_archived", qaLabel(input.session));
  if (input.status === "ACTIVE" && access.data.status === "ARCHIVED") emitOccupancynpvCollectionEvent("workspace_restored", qaLabel(input.session));
  if (input.name) emitOccupancynpvCollectionEvent("workspace_renamed", qaLabel(input.session));
  return { ok: true as const, workspace: { ...access.data, ...next } };
}

export async function durableSaveScenarios(input: {
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  scenarios: LeaseScenarioInput[];
  compare?: boolean;
  compareScenarioIds?: string[];
}) {
  if (!input.session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  if (input.scenarios.length < 1) return { ok: false as const, reason: "SCENARIO_REQUIRED" };
  const supabase = await createClient();
  const access = await table(supabase, "occupancynpv_deal_workspaces").select("workspace_id,customer_id").eq("workspace_id", input.workspaceId).maybeSingle();
  if (!access.data) return { ok: false as const, reason: "WORKSPACE_NOT_FOUND" };
  if (access.data.customer_id !== input.session.customer_id) return { ok: false as const, reason: "CROSS_CUSTOMER_DENIED" };
  for (const scenario of input.scenarios) {
    const analyzed = analyzeLeaseScenario(scenario);
    if (!analyzed.ok) return { ok: false as const, reason: "SCENARIO_INVALID", errors: analyzed.errors };
    const saved = await table(supabase, "occupancynpv_lease_scenarios").upsert({
      scenario_id: scenario.scenario_id,
      workspace_id: input.workspaceId,
      input_json: scenario,
      result_json: analyzed.result,
    });
    if (saved.error) return { ok: false as const, reason: "SCENARIO_PERSIST_FAILED" };
    emitOccupancynpvCollectionEvent("scenario_created", qaLabel(input.session));
  }
  await table(supabase, "occupancynpv_deal_workspaces")
    .update({ updated_at: new Date().toISOString() })
    .eq("workspace_id", input.workspaceId)
    .eq("customer_id", input.session.customer_id);
  if (input.compare && (input.compareScenarioIds?.length ?? input.scenarios.length) < 2) {
    return { ok: false as const, reason: "TWO_SCENARIOS_REQUIRED" };
  }
  if (input.compare) emitOccupancynpvCollectionEvent("comparison_pair_selected", qaLabel(input.session));
  return durableWorkspaceResults({
    session: input.session,
    workspaceId: input.workspaceId,
    compareScenarioIds: input.compareScenarioIds,
  });
}

export async function durableWorkspaceResults(input: {
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  compareScenarioIds?: string[];
}) {
  if (!input.session) return { ok: false as const, reason: "UNAUTHENTICATED" };
  const supabase = await createClient();
  const access = await table(supabase, "occupancynpv_deal_workspaces").select("*").eq("workspace_id", input.workspaceId).maybeSingle();
  if (!access.data) return { ok: false as const, reason: "WORKSPACE_NOT_FOUND" };
  if (access.data.customer_id !== input.session.customer_id) return { ok: false as const, reason: "CROSS_CUSTOMER_DENIED" };
  const { data } = await table(supabase, "occupancynpv_lease_scenarios").select("*").eq("workspace_id", input.workspaceId).order("created_at", { ascending: true });
  const scenarios = ((data ?? []) as ScenarioPersistRow[]).map((row) => ({
    scenario_id: row.scenario_id,
    workspace_id: row.workspace_id,
    input: row.input_json as LeaseScenarioInput,
    result: (row.result_json ?? null) as LeaseScenarioResult | null,
    created_at: row.created_at as string | undefined,
  }));
  const ready = scenarios.filter((row) => row.result);
  const ids = input.compareScenarioIds?.filter(Boolean) ?? [];
  const pair = ids.length >= 2
    ? ids.slice(0, 2).map((id) => ready.find((row) => row.scenario_id === id)).filter(Boolean)
    : ready.length === 2 ? ready : [];
  const results = pair
    .map((row) => row?.result)
    .filter((row): row is LeaseScenarioResult => Boolean(row));
  const comparison = results.length === 2 ? compareScenarios(results) : null;
  const first = pair[0] ?? ready[0];
  const sensitivity = first ? sensitivityByDiscountRate(first.input, [0, 0.08, 0.12]) : [];
  return {
    ok: true as const,
    workspace: access.data,
    scenarios,
    comparison,
    compareScenarioIds: pair.map((row) => row?.scenario_id).filter(Boolean),
    sensitivity,
  };
}

export async function durableSeedEntitlement(input: {
  customerId: string;
  offerId: "PROFESSIONAL" | "PER_DEAL";
  paymentReference: string;
  expiresAt?: string | null;
}) {
  const admin = createAdminClient();
  const row = {
    entitlement_id: newId("ent"),
    customer_id: input.customerId,
    offer_id: input.offerId,
    payment_reference: input.paymentReference,
    subscription_reference: input.offerId === "PROFESSIONAL" ? `sub_${input.paymentReference}` : null,
    entitlement_type: input.offerId === "PROFESSIONAL" ? "PROFESSIONAL_ACCESS" : "ONE_DEAL_WORKSPACE",
    quantity: 1,
    quantity_remaining: input.offerId === "PER_DEAL" ? 1 : null,
    status: mapStatus("ACTIVE"),
    expires_at: input.expiresAt ?? null,
  };
  const inserted = await table(admin, "occupancynpv_entitlements").upsert(row, { onConflict: "payment_reference,offer_id" });
  if (inserted.error) return { ok: false as const, reason: inserted.error.message, entitlement: null };
  await table(admin, "occupancynpv_fulfillment_orders").upsert({
    order_id: newId("ord"),
    customer_id: input.customerId,
    offer_id: input.offerId,
    payment_reference: input.paymentReference,
    state: "ENTITLEMENT_ACTIVE",
  });
  return { ok: true as const, entitlement: row };
}

export async function durableDetectOrphans(paymentReferences: string[]) {
  const admin = createAdminClient();
  const { data } = await table(admin, "occupancynpv_entitlements").select("payment_reference");
  const known = new Set(((data ?? []) as Array<{ payment_reference: string }>).map((row) => row.payment_reference));
  const orphans = paymentReferences.filter((reference) => !known.has(reference));
  return { count: orphans.length, orphans };
}

export { mapStatus };
