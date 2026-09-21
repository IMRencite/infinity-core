import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const name = line.slice(0, index).trim();
    let value = line.slice(index + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  }
}

const key = (process.env.STRIPE_SECRET_KEY || "").trim();
const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

function keyKind(value, livePrefix, testPrefix, other) {
  if (!value) return "missing";
  if (value.startsWith(livePrefix)) return livePrefix.replace(/_$/, "");
  if (value.startsWith(testPrefix)) return testPrefix.replace(/_$/, "");
  return other;
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json();
  return { status: res.status, ok: res.ok, body };
}

async function probe(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual" });
    return { url, status: res.status, location: res.headers.get("location") };
  } catch {
    return { url, status: 0, location: null };
  }
}

const summary = {
  keyPresent: Boolean(key),
  keyKind: keyKind(key, "rk_live_", "rk_test_", key.startsWith("sk_live_") ? "sk_live" : key.startsWith("sk_test_") ? "sk_test" : "other"),
  webhookSecretPresent: Boolean(webhookSecret),
  webhookSecretKind: webhookSecret.startsWith("whsec_") ? "whsec" : webhookSecret ? "other" : "missing",
};

if (!key) {
  console.log(JSON.stringify({ summary, next: "STRIPE_SECRET_KEY_MISSING" }, null, 2));
  process.exit(1);
}

const accountRes = await stripeGet("/v1/account");
const account = {
  status: accountRes.status,
  id: accountRes.body.id ?? null,
  livemode: accountRes.body.livemode ?? null,
  charges_enabled: accountRes.body.charges_enabled ?? null,
  payouts_enabled: accountRes.body.payouts_enabled ?? null,
  details_submitted: accountRes.body.details_submitted ?? null,
  error: accountRes.body.error ? String(accountRes.body.error.message || "error") : null,
};

const objectPaths = {
  professionalProduct: "/v1/products/prod_VDIjmRpY19C9HZ",
  professionalPrice: "/v1/prices/price_1UCs7hLdvXKx7R7GF2TPmwGL",
  perDealProduct: "/v1/products/prod_VDIju0S2lBO9i5",
  perDealPrice: "/v1/prices/price_1UCs7iLdvXKx7R7GmikBTGx4",
  webhook: "/v1/webhook_endpoints/we_1UCssQLdvXKx7R7GcHonT3rh",
};

const objects = {};
for (const [name, path] of Object.entries(objectPaths)) {
  const row = await stripeGet(path);
  const body = row.body ?? {};
  objects[name] = {
    status: row.status,
    id: body.id ?? null,
    active: body.active ?? null,
    livemode: body.livemode ?? null,
    unit_amount: body.unit_amount ?? null,
    currency: body.currency ?? null,
    recurring: body.recurring ?? null,
    product: body.product ?? null,
    url: body.url ?? null,
    enabled: body.status ?? null,
    enabled_events: body.enabled_events ?? null,
    error: body.error ? String(body.error.message || "error") : null,
  };
}

const probes = [];
for (const url of [
  "https://occupancynpv.com/",
  "https://www.occupancynpv.com/",
  "https://occupancynpv.com/pricing/",
  "https://occupancynpv.com/early-access/",
  "https://occupancynpv.com/api/checkout/start",
  "https://occupancynpv.com/api/webhooks/stripe",
]) {
  probes.push(await probe(url));
}

console.log(JSON.stringify({ summary, account, objects, probes }, null, 2));
