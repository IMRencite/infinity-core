import { createOccupancynpvClient } from "./server";
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


export async function durableFulfillStripeEvent(input: { eventId: string; type: string; object: Record<string, unknown> }) {
  const admin = createOccupancynpvAdmin();
  if (!admin) return { ok: false as const, reason: "ADMIN_MISSING", duplicate: false };
  const existing = await admin.from("occupancynpv_fulfillment_orders").select("order_id").eq("order_id", input.eventId).maybeSingle();
  if (existing.data) return { ok: true as const, duplicate: true, eventId: input.eventId, type: input.type };
  const metadata = (input.object.metadata ?? {}) as Record<string, unknown>;
  const offer = metadata.infinity_offer === "PER_DEAL" ? "PER_DEAL" : metadata.infinity_offer === "PROFESSIONAL" ? "PROFESSIONAL" : null;
  const customerId = typeof metadata.infinity_customer_id === "string" ? metadata.infinity_customer_id : null;
  const paymentReference = typeof input.object.id === "string" ? input.object.id : input.eventId;
  if (input.type === "checkout.session.completed" && offer && customerId) {
    const customer = await admin.from("occupancynpv_customers").select("customer_id").eq("customer_id", customerId).maybeSingle();
    if (!customer.data) {
      await admin.from("occupancynpv_fulfillment_orders").insert({
        order_id: input.eventId,
        customer_id: customerId,
        offer_id: offer,
        payment_reference: paymentReference,
        state: "FULFILLMENT_FAILED",
      });
      return { ok: false as const, reason: "ORPHANED_PAID_CUSTOMER", duplicate: false, eventId: input.eventId, type: input.type };
    }
    const subscription = typeof input.object.subscription === "string" ? input.object.subscription : null;
    const row = {
      entitlement_id: "ent_" + input.eventId.replace(/\W/g, "").slice(-16),
      customer_id: customerId,
      offer_id: offer,
      payment_reference: paymentReference,
      subscription_reference: subscription,
      entitlement_type: offer === "PROFESSIONAL" ? "PROFESSIONAL_ACCESS" : "ONE_DEAL_WORKSPACE",
      quantity: 1,
      quantity_remaining: offer === "PER_DEAL" ? 1 : null,
      status: "ACTIVE",
    };
    const inserted = await admin.from("occupancynpv_entitlements").upsert(row, { onConflict: "payment_reference,offer_id" });
    await admin.from("occupancynpv_fulfillment_orders").insert({
      order_id: input.eventId,
      customer_id: customerId,
      offer_id: offer,
      payment_reference: paymentReference,
      state: inserted.error ? "FULFILLMENT_FAILED" : "ENTITLEMENT_ACTIVE",
    });
    return { ok: !inserted.error, duplicate: false, eventId: input.eventId, type: input.type };
  }
  if ((input.type === "invoice.paid" || input.type === "invoice.payment_failed" || input.type === "customer.subscription.deleted") && customerId && offer) {
    const periodEnd = typeof input.object.period_end === "number" ? new Date(input.object.period_end * 1000).toISOString() : null;
    if (input.type === "invoice.paid") {
      await admin.from("occupancynpv_entitlements").update({ status: "ACTIVE", expires_at: periodEnd }).eq("customer_id", customerId).eq("offer_id", "PROFESSIONAL");
    }
    if (input.type === "customer.subscription.deleted" && periodEnd) {
      await admin.from("occupancynpv_entitlements").update({ expires_at: periodEnd }).eq("customer_id", customerId).eq("offer_id", "PROFESSIONAL");
    }
    await admin.from("occupancynpv_fulfillment_orders").insert({
      order_id: input.eventId,
      customer_id: customerId,
      offer_id: offer,
      payment_reference: paymentReference,
      state: input.type === "invoice.payment_failed" ? "PAST_DUE_RECORDED" : "RECONCILED",
    });
    return { ok: true as const, duplicate: false, eventId: input.eventId, type: input.type };
  }
  if (customerId) {
    await admin.from("occupancynpv_fulfillment_orders").insert({
      order_id: input.eventId,
      customer_id: customerId,
      offer_id: offer ?? "PROFESSIONAL",
      payment_reference: paymentReference,
      state: "RECONCILED",
    });
  }
  return { ok: true as const, duplicate: false, eventId: input.eventId, type: input.type, mapped: true };
}

export async function durablePersistOfferEvent(input: { event: string; offer_id: string; source?: string }) {
  const admin = createOccupancynpvAdmin();
  if (!admin) return { ok: false as const, reason: "ADMIN_MISSING" };
  const bucket = "occupancynpv-offer-events";
  await admin.storage.createBucket(bucket, { public: false }).catch(() => null);
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const uploaded = await admin.storage.from(bucket).upload("events/" + id + ".json", JSON.stringify({
    ...input,
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    created_at: new Date().toISOString(),
  }), { contentType: "application/json", upsert: true });
  if (uploaded.error) return { ok: false as const, reason: "OFFER_EVENT_PERSIST_FAILED" };
  return { ok: true as const, id };
}
