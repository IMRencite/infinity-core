/**
 * Read-only AskReview pre-commercialization probe.
 * Does not purchase domains, write Stripe objects, or launch.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const registrarToken = process.env.CLOUDFLARE_REGISTRAR_API_TOKEN;
const domains = ["askreview.com", "getaskreview.com", "askreview.app"];

const persistence = {
  reachable: false,
  schemaExists: false,
  readWriteVerified: false,
  reason: null,
  tables: [],
};

if (url && service) {
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const customers = await admin.from("askreview_customers").select("customer_id").limit(1);
  persistence.reachable = !/fetch failed|ENOTFOUND/i.test(customers.error?.message ?? "");
  if (customers.error) {
    persistence.reason = customers.error.message;
    persistence.schemaExists = !/does not exist|schema cache|Could not find the table/i.test(customers.error.message);
  } else {
    persistence.schemaExists = true;
    persistence.tables.push("askreview_customers");
    const probeId = `probe_${Date.now()}`;
    const write = await admin.from("askreview_events").insert({
      event_id: probeId,
      type: "production_probe",
      account_id: null,
      location_id: null,
      outcome: "OK",
    });
    if (write.error) {
      persistence.reason = write.error.message;
    } else {
      await admin.from("askreview_events").delete().eq("event_id", probeId);
      persistence.readWriteVerified = true;
    }
  }
} else {
  persistence.reason = "SUPABASE_ENV_MISSING";
}

const domain = {
  provider: "cloudflare.registrar_v1",
  ok: false,
  status: 0,
  safeError: null,
  rows: [],
};

if (accountId && registrarToken) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/domain-check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${registrarToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domains }),
  });
  const json = await res.json().catch(() => ({}));
  domain.ok = Boolean(json.success);
  domain.status = res.status;
  domain.safeError = Array.isArray(json.errors) && json.errors[0]?.message ? json.errors[0].message : null;
  const list = json.result?.domains ?? json.result ?? [];
  domain.rows = (Array.isArray(list) ? list : []).map((row) => ({
    domain: row.name ?? row.domain ?? null,
    available: row.registrable === true ? "YES" : row.registrable === false ? "NO" : "UNKNOWN",
    premium: String(row.tier ?? "").toLowerCase() === "premium" ? "YES" : String(row.tier ?? "").toLowerCase() === "standard" ? "NO" : "UNKNOWN",
    registration: row.pricing?.registration_cost ?? row.registration_cost ?? "UNKNOWN",
    renewal: row.pricing?.renewal_cost ?? row.renewal_cost ?? "UNKNOWN",
  }));
} else {
  domain.safeError = "CLOUDFLARE_REGISTRAR_ENV_MISSING";
}

const report = {
  persistence,
  domain,
  stripeWrites: 0,
  domainPurchases: 0,
  publicLaunch: "NO",
  paymentActivation: "NO",
};

const out = join(".infinity/askreview/precommercialization-probe.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
