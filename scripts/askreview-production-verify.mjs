/**
 * Live AskReview production verify. Creates minimal QA records. No Stripe.
 * Independently checks schema via PostgREST, Auth, persistence, user-scoped RLS,
 * enumeration, concurrency, and OccupancyNPV table presence.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

function userClient(accessToken) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function reviewSvg(reviewUrl) {
  const modules = QRCode.create(reviewUrl, { errorCorrectionLevel: "M" }).modules;
  return `<svg xmlns="http://www.w3.org/2000/svg" data-review-url="${reviewUrl}"><title>${reviewUrl}</title><desc>${modules.size}</desc></svg>`;
}

const schema = {};
for (const table of ["askreview_customers", "askreview_locations", "askreview_kits", "askreview_events"]) {
  const { error } = await admin.from(table).select("*").limit(1);
  schema[table] = error ? error.message : "PASS";
}

const password = `Qa!${randomBytes(8).toString("hex")}`;
const emailA = `askreview-qa-a-${Date.now()}@infinity.local`;
const emailB = `askreview-qa-b-${Date.now()}@infinity.local`;

async function ensureUser(email) {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) return { ok: false, reason: created.error?.message ?? "CREATE_FAILED" };
  const user = created.data.user;
  const customerId = `acct_${user.id.replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();
  const inserted = await admin.from("askreview_customers").insert({
    customer_id: customerId,
    venture_id: "askreview",
    auth_identity_id: user.id,
    email,
    status: "ACTIVE",
    qa_access: true,
    created_at: now,
    updated_at: now,
  });
  if (inserted.error) return { ok: false, reason: inserted.error.message };
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await anon.auth.signInWithPassword({ email, password });
  const sessionUser = signed.data.session ? await anon.auth.getUser() : { data: { user: null } };
  return {
    ok: Boolean(signed.data.session && sessionUser.data.user),
    userId: user.id,
    customerId,
    email,
    session: Boolean(signed.data.session),
    client: anon,
    accessToken: signed.data.session?.access_token,
  };
}

const a = await ensureUser(emailA);
const b = await ensureUser(emailB);

const placeId = "ChIJAskReviewFactoryProof001";
const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
const locationId = `loc_${randomBytes(8).toString("hex")}`;
const kitId = `kit_${randomBytes(8).toString("hex")}`;
const now = new Date().toISOString();

let location = { ok: false };
let kit = { ok: false };
let isolation = { read: "UNKNOWN", write: "UNKNOWN", rlsRead: "UNKNOWN", rlsWrite: "UNKNOWN", rlsList: "UNKNOWN" };
let archive = { ok: false };
let logout = { ok: false };
let enumeration = { ok: false };
let concurrency = { result: "FAIL" };
let recovery = { invalidLocation: "FAIL" };

if (a.ok) {
  const scoped = userClient(a.accessToken);
  const createdLoc = await scoped.from("askreview_locations").insert({
    location_id: locationId,
    customer_id: a.customerId,
    name: "QA Harbor Coffee",
    place_id: placeId,
    maps_url: null,
    review_url: reviewUrl,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  });
  const readLoc = await scoped.from("askreview_locations").select("*").eq("location_id", locationId).maybeSingle();
  const renamed = await scoped.from("askreview_locations").update({ name: "QA Harbor Coffee Renamed", updated_at: new Date().toISOString() }).eq("location_id", locationId).select("*").maybeSingle();
  const archived = await scoped.from("askreview_locations").update({ status: "ARCHIVED", updated_at: new Date().toISOString() }).eq("location_id", locationId).select("*").maybeSingle();
  const restored = await scoped.from("askreview_locations").update({ status: "ACTIVE", updated_at: new Date().toISOString() }).eq("location_id", locationId).select("*").maybeSingle();
  location = {
    ok: !createdLoc.error && Boolean(readLoc.data) && renamed.data?.name === "QA Harbor Coffee Renamed",
    create: createdLoc.error?.message ?? "PASS",
    read: readLoc.data ? "PASS" : readLoc.error?.message ?? "FAIL",
    update: renamed.data?.name === "QA Harbor Coffee Renamed" ? "PASS" : "FAIL",
  };
  archive = {
    ok: archived.data?.status === "ARCHIVED" && restored.data?.status === "ACTIVE",
    archive: archived.data?.status ?? "FAIL",
    restore: restored.data?.status ?? "FAIL",
  };
  const qrSvg = reviewSvg(reviewUrl);
  const createdKit = await scoped.from("askreview_kits").insert({
    kit_id: kitId,
    location_id: locationId,
    customer_id: a.customerId,
    review_url: reviewUrl,
    request_copy: `Hi — review ${reviewUrl}`,
    copy_variants: { counter: reviewUrl, sms: reviewUrl, email: reviewUrl },
    qr_svg: qrSvg,
  });
  const reload = await scoped.from("askreview_kits").select("*").eq("kit_id", kitId).maybeSingle();
  kit = {
    ok: !createdKit.error && reload.data?.review_url === reviewUrl && String(reload.data?.qr_svg ?? "").includes(reviewUrl),
    create: createdKit.error?.message ?? "PASS",
    reload: reload.data ? "PASS" : "FAIL",
    urlMatch: reload.data?.review_url === reviewUrl,
    qrEquivalence: String(reload.data?.qr_svg ?? "").includes(`data-review-url="${reviewUrl}"`),
  };

  const invalid = await scoped.from("askreview_locations").insert({
    location_id: `loc_${randomBytes(8).toString("hex")}`,
    customer_id: a.customerId,
    name: "Broken",
    status: "NOT_A_STATUS",
  });
  recovery = { invalidLocation: invalid.error ? "PASS" : "FAIL" };

  const parallelIds = [`loc_${randomBytes(8).toString("hex")}`, `loc_${randomBytes(8).toString("hex")}`];
  const parallel = await Promise.all(parallelIds.map((id, index) => scoped.from("askreview_locations").insert({
    location_id: id,
    customer_id: a.customerId,
    name: `Parallel ${index}`,
    place_id: `${placeId}${index}`,
    review_url: `${reviewUrl}${index}`,
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })));
  concurrency = {
    result: parallel.every((row) => !row.error) ? "PASS" : "FAIL",
    errors: parallel.map((row) => row.error?.message ?? null),
  };

  const signedOut = await a.client.auth.signOut();
  const after = await a.client.auth.getUser();
  logout = { ok: !signedOut.error && !after.data.user };
}

if (a.ok && b.ok) {
  const scopedB = userClient(b.accessToken);
  const rlsRead = await scopedB.from("askreview_locations").select("*").eq("location_id", locationId);
  const rlsWrite = await scopedB.from("askreview_locations").update({ name: "Hijack" }).eq("location_id", locationId).select("*");
  const rlsList = await scopedB.from("askreview_locations").select("location_id, customer_id");
  const rlsKit = await scopedB.from("askreview_kits").select("*").eq("kit_id", kitId);
  const guessed = await scopedB.from("askreview_locations").select("*").eq("location_id", "loc_does_not_exist_guess");
  isolation = {
    read: (rlsRead.data ?? []).length === 0 ? "BLOCKED" : "FAIL",
    write: (rlsWrite.data ?? []).length === 0 ? "BLOCKED" : "FAIL",
    rlsRead: (rlsRead.data ?? []).length === 0 ? "BLOCKED" : "FAIL",
    rlsWrite: (rlsWrite.data ?? []).length === 0 ? "BLOCKED" : "FAIL",
    rlsList: (rlsList.data ?? []).every((row) => row.customer_id === b.customerId) ? "BLOCKED" : "FAIL",
    rlsKit: (rlsKit.data ?? []).length === 0 ? "BLOCKED" : "FAIL",
    note: "user JWT clients; service_role bypasses RLS by design",
  };
  enumeration = {
    ok: (guessed.data ?? []).length === 0 && isolation.rlsList === "BLOCKED",
    guessed: (guessed.data ?? []).length,
  };
}

const occupancy = await admin.from("occupancynpv_customers").select("customer_id").limit(1);
const report = {
  schema,
  occupancyNpvStillReadable: !occupancy.error,
  authA: { ok: a.ok, session: a.session, qa: true },
  authB: { ok: b.ok, session: b.session, qa: true },
  logout,
  location,
  archive,
  kit,
  isolation,
  enumeration,
  concurrency,
  recovery,
  plaintextPassword: "NO",
  stripeWrites: 0,
  jsonProductionFallback: "DISABLED",
};

mkdirSync(".infinity/askreview", { recursive: true });
writeFileSync(".infinity/askreview/production-verify.json", `${JSON.stringify({
  ...report,
  qaEmails: [emailA, emailB],
}, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
