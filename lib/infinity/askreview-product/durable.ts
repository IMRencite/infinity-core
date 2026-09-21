import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ASKREVIEW_FOUNDER_QA_EMAIL, ASKREVIEW_KIT_HISTORY_LIMIT, type AskReviewKit, type AskReviewLocation, type AskReviewRequestCopy } from "./types";
import { generateReviewKit, normalizeReviewTarget } from "./kits";
import { ASKREVIEW_LOCATION_PAGE_SIZE } from "./locations";

function table(client: unknown, name: string) {
  return (client as { from: (tableName: string) => any }).from(name);
}

export function askreviewMustUseProductionPersistence(): boolean {
  if (process.env.ASKREVIEW_FORCE_IN_PROCESS === "1") return false;
  if (process.env.VITEST && process.env.ASKREVIEW_TEST_PRODUCTION_REQUIRED !== "1") return false;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function askreviewProductionPersistenceEnabled(): boolean {
  if (!askreviewMustUseProductionPersistence()) return false;
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export const ASKREVIEW_JSON_PRODUCTION_FALLBACK = "DISABLED" as const;

export type AskReviewDurableSession = {
  authIdentityId: string;
  accountId: string;
  email: string;
  qaAccess: boolean;
};

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function mapLocation(row: Record<string, unknown>): AskReviewLocation {
  return {
    locationId: String(row.location_id),
    accountId: String(row.customer_id),
    name: String(row.name),
    placeId: (row.place_id as string | null) ?? null,
    mapsUrl: (row.maps_url as string | null) ?? null,
    reviewUrl: (row.review_url as string | null) ?? null,
    status: row.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapKit(row: Record<string, unknown>): AskReviewKit {
  const variants = (row.copy_variants ?? {}) as Partial<AskReviewRequestCopy>;
  const requestCopy = String(row.request_copy ?? variants.sms ?? "");
  return {
    kitId: String(row.kit_id),
    locationId: String(row.location_id),
    accountId: String(row.customer_id),
    reviewUrl: String(row.review_url),
    requestCopy,
    copyVariants: {
      counter: String(variants.counter ?? requestCopy),
      sms: String(variants.sms ?? requestCopy),
      email: String(variants.email ?? requestCopy),
    },
    qrSvg: String(row.qr_svg),
    createdAt: String(row.created_at),
  };
}

async function loadCustomerByAuth(authIdentityId: string): Promise<{ customer_id: string; email: string; status: string; qa_access: boolean } | null> {
  const supabase = await createClient();
  const { data } = await table(supabase, "askreview_customers").select("*").eq("auth_identity_id", authIdentityId).maybeSingle();
  return (data as { customer_id: string; email: string; status: string; qa_access: boolean } | null) ?? null;
}

export async function durableSignup(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; session: AskReviewDurableSession } | { ok: false; reason: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.length < 8) return { ok: false, reason: "INVALID" };
  const supabase = await createClient();
  const signed = await supabase.auth.signUp({ email, password: input.password });
  let userId = signed.data.user?.id ?? null;
  if (!userId) {
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true });
    if (created.error || !created.data.user) {
      return { ok: false, reason: signed.error?.message === "User already registered" ? "EXISTS" : "INVALID" };
    }
    userId = created.data.user.id;
    const session = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (session.error || !session.data.user) return { ok: false, reason: "INVALID" };
    userId = session.data.user.id;
  }
  const customerId = `acct_${userId.replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();
  const row = {
    customer_id: customerId,
    venture_id: "askreview",
    auth_identity_id: userId,
    email,
    status: "ACTIVE",
    qa_access: email === ASKREVIEW_FOUNDER_QA_EMAIL,
    created_at: now,
    updated_at: now,
  };
  const inserted = await table(supabase, "askreview_customers").insert(row);
  if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
    const admin = createAdminClient();
    const adminInsert = await table(admin, "askreview_customers").insert(row);
    if (adminInsert.error && !/duplicate|unique/i.test(adminInsert.error.message)) {
      return { ok: false, reason: "INVALID" };
    }
  }
  const customer = await loadCustomerByAuth(userId);
  if (!customer) return { ok: false, reason: "INVALID" };
  return {
    ok: true,
    session: {
      authIdentityId: userId,
      accountId: customer.customer_id,
      email: customer.email,
      qaAccess: Boolean(customer.qa_access),
    },
  };
}

async function ensureCustomerRow(input: { userId: string; email: string }) {
  const existing = await loadCustomerByAuth(input.userId);
  if (existing) return existing;
  const customerId = `acct_${input.userId.replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();
  const row = {
    customer_id: customerId,
    venture_id: "askreview",
    auth_identity_id: input.userId,
    email: input.email,
    status: "ACTIVE",
    qa_access: input.email === ASKREVIEW_FOUNDER_QA_EMAIL,
    created_at: now,
    updated_at: now,
  };
  const supabase = await createClient();
  const inserted = await table(supabase, "askreview_customers").insert(row);
  if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
    const admin = createAdminClient();
    await table(admin, "askreview_customers").insert(row);
  }
  return loadCustomerByAuth(input.userId);
}

export async function durableSignin(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; session: AskReviewDurableSession } | { ok: false; reason: "INVALID_CREDENTIALS" }> {
  const supabase = await createClient();
  const signed = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (signed.error || !signed.data.user) return { ok: false, reason: "INVALID_CREDENTIALS" };
  const customer = await ensureCustomerRow({
    userId: signed.data.user.id,
    email: signed.data.user.email ?? input.email.trim().toLowerCase(),
  });
  if (!customer || customer.status !== "ACTIVE") return { ok: false, reason: "INVALID_CREDENTIALS" };
  return {
    ok: true,
    session: {
      authIdentityId: signed.data.user.id,
      accountId: customer.customer_id,
      email: customer.email,
      qaAccess: Boolean(customer.qa_access),
    },
  };
}

export async function durableSignout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function durableSession(): Promise<AskReviewDurableSession | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const customer = await loadCustomerByAuth(data.user.id);
    if (!customer || customer.status !== "ACTIVE") return null;
    return {
      authIdentityId: data.user.id,
      accountId: customer.customer_id,
      email: customer.email,
      qaAccess: Boolean(customer.qa_access),
    };
  } catch {
    return null;
  }
}

export async function durableListLocations(input: {
  accountId: string;
  status?: "ACTIVE" | "ARCHIVED";
  page?: number;
  q?: string;
}) {
  const supabase = await createClient();
  const status = input.status ?? "ACTIVE";
  const q = input.q?.trim() ?? "";
  let query = table(supabase, "askreview_locations").select("*").eq("customer_id", input.accountId).eq("status", status).order("updated_at", { ascending: false });
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const all = ((data ?? []) as Array<Record<string, unknown>>).map(mapLocation);
  const page = Math.max(1, input.page ?? 1);
  const start = (page - 1) * ASKREVIEW_LOCATION_PAGE_SIZE;
  return {
    items: all.slice(start, start + ASKREVIEW_LOCATION_PAGE_SIZE),
    page,
    total: all.length,
    pageSize: ASKREVIEW_LOCATION_PAGE_SIZE,
  };
}

export async function durableCreateLocation(input: {
  accountId: string;
  name: string;
  placeId?: string | null;
  mapsUrl?: string | null;
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, reason: "INVALID_LOCATION_INPUT" as const };
  const target = normalizeReviewTarget({ placeId: input.placeId, mapsUrl: input.mapsUrl });
  if (!target.ok) return target;
  const now = new Date().toISOString();
  const location = {
    location_id: newId("loc"),
    customer_id: input.accountId,
    name,
    place_id: target.placeId,
    maps_url: target.mapsUrl,
    review_url: target.reviewUrl,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  };
  const supabase = await createClient();
  const inserted = await table(supabase, "askreview_locations").insert(location);
  if (inserted.error) return { ok: false as const, reason: "INVALID_LOCATION_INPUT" as const };
  return { ok: true as const, location: mapLocation(location) };
}

export async function durableGetLocation(accountId: string, locationId: string): Promise<AskReviewLocation | null> {
  const supabase = await createClient();
  const { data } = await table(supabase, "askreview_locations").select("*").eq("customer_id", accountId).eq("location_id", locationId).maybeSingle();
  return data ? mapLocation(data as Record<string, unknown>) : null;
}

export async function durablePatchLocation(input: {
  accountId: string;
  locationId: string;
  name?: string;
  status?: "ACTIVE" | "ARCHIVED";
}): Promise<AskReviewLocation | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name) patch.name = input.name.trim();
  if (input.status) patch.status = input.status;
  const supabase = await createClient();
  const updated = await table(supabase, "askreview_locations")
    .update(patch)
    .eq("customer_id", input.accountId)
    .eq("location_id", input.locationId)
    .select("*")
    .maybeSingle();
  return updated.data ? mapLocation(updated.data as Record<string, unknown>) : null;
}

export async function durableListKits(accountId: string, locationId: string): Promise<AskReviewKit[]> {
  const supabase = await createClient();
  const { data } = await table(supabase, "askreview_kits")
    .select("*")
    .eq("customer_id", accountId)
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(ASKREVIEW_KIT_HISTORY_LIMIT);
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapKit);
}

export async function durableCreateKit(input: { accountId: string; locationId: string }) {
  const location = await durableGetLocation(input.accountId, input.locationId);
  if (!location || location.status === "ARCHIVED") return { ok: false as const, reason: "NOT_FOUND" as const };
  const generated = generateReviewKit({
    businessName: location.name,
    placeId: location.placeId,
    mapsUrl: location.mapsUrl,
  });
  if (!generated.ok) return generated;
  const kit = {
    kit_id: newId("kit"),
    location_id: location.locationId,
    customer_id: input.accountId,
    review_url: generated.reviewUrl,
    request_copy: generated.requestCopy,
    copy_variants: generated.copyVariants,
    qr_svg: generated.qrSvg,
    created_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const inserted = await table(supabase, "askreview_kits").insert(kit);
  if (inserted.error) return { ok: false as const, reason: "INVALID_LOCATION_INPUT" as const };
  await table(supabase, "askreview_locations").update({
    review_url: generated.reviewUrl,
    updated_at: kit.created_at,
  }).eq("customer_id", input.accountId).eq("location_id", location.locationId);
  const existing = await durableListKits(input.accountId, location.locationId);
  if (existing.length > ASKREVIEW_KIT_HISTORY_LIMIT) {
    const extra = existing.slice(ASKREVIEW_KIT_HISTORY_LIMIT);
    for (const row of extra) {
      await table(supabase, "askreview_kits").delete().eq("kit_id", row.kitId).eq("customer_id", input.accountId);
    }
  }
  return { ok: true as const, kit: mapKit(kit) };
}

export async function probeAskReviewProductionPersistence(): Promise<{
  reachable: boolean;
  schemaExists: boolean;
  readWriteVerified: boolean;
  reason: string | null;
}> {
  if (!askreviewProductionPersistenceEnabled()) {
    return { reachable: false, schemaExists: false, readWriteVerified: false, reason: "SUPABASE_NOT_BOUND" };
  }
  try {
    const admin = createAdminClient();
    const probeId = `probe_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const customers = await table(admin, "askreview_customers").select("customer_id").limit(1);
    if (customers.error) {
      return { reachable: true, schemaExists: false, readWriteVerified: false, reason: customers.error.message };
    }
    const write = await table(admin, "askreview_events").insert({
      event_id: probeId,
      type: "production_probe",
      account_id: null,
      location_id: null,
      outcome: "OK",
    });
    if (write.error) {
      return { reachable: true, schemaExists: true, readWriteVerified: false, reason: write.error.message };
    }
    await table(admin, "askreview_events").delete().eq("event_id", probeId);
    return { reachable: true, schemaExists: true, readWriteVerified: true, reason: null };
  } catch (error) {
    return {
      reachable: false,
      schemaExists: false,
      readWriteVerified: false,
      reason: error instanceof Error ? error.message : "PROBE_FAILED",
    };
  }
}
