import { loadServerEnvFromLocalFile, reloadStripeSecretFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { STRIPE_SECRET_KEY_ENV, STRIPE_WEBHOOK_SECRET_ENV } from "../lib/infinity/commercialization/providers/config";
import { authorizedOccupancynpvWebhookEventsMatch, OCCUPANCYNPV_WEBHOOK_URL } from "../lib/infinity/venture-operating-scale/occupancynpv-canonical-webhook";
import { createClient } from "@supabase/supabase-js";

loadServerEnvFromLocalFile();
reloadStripeSecretFromLocalFile();

const origin = "https://occupancynpv.com";

async function stripeGet(path: string) {
  const key = (process.env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  const res = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${key}` } });
  return { ok: res.ok, body: await res.json() as Record<string, unknown> };
}

async function main() {
  const get = await fetch(`${origin}/api/checkout/start`);
  const getBody = await get.text();
  const unknown = await fetch(`${origin}/api/checkout/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ offer: "ENTERPRISE" }),
  });
  const unknownBody = await unknown.text();
  const professional = await fetch(`${origin}/api/checkout/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ offer: "PROFESSIONAL" }),
  });
  const professionalBody = await professional.text();
  const https = await fetch(`${origin}/`, { redirect: "manual" });
  const www = await fetch("https://www.occupancynpv.com/", { redirect: "manual" });
  const login = await fetch(`${origin}/occupancynpv/app/login`, { redirect: "manual" });
  const dash = await fetch(`${origin}/occupancynpv/app`, { redirect: "manual" });
  const complete = await fetch(`${origin}/occupancynpv/app/checkout/complete`, { redirect: "manual" });
  const webhookGet = await fetch(`${origin}/api/webhooks/stripe`);
  const pricing = await fetch(`${origin}/pricing`);
  const pricingText = await pricing.text();
  const workspace = await fetch(`${origin}/occupancynpv/app/workspaces/probe`, { redirect: "manual" });
  const webhook = await stripeGet("/v1/webhook_endpoints/we_1UCssQLdvXKx7R7GcHonT3rh");
  const secret = (process.env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const failed = await admin.from("occupancynpv_fulfillment_orders").select("order_id", { count: "exact", head: true }).eq("state", "FULFILLMENT_FAILED");
  console.log(JSON.stringify({
    checkoutGet: { status: get.status, body: getBody },
    unknownOffer: { status: unknown.status, body: unknownBody },
    professionalUnauth: { status: professional.status, body: professionalBody },
    https: https.status,
    www: { status: www.status, location: www.headers.get("location") },
    login: login.status,
    dash: dash.status,
    complete: { status: complete.status, location: complete.headers.get("location") },
    webhookGet: { status: webhookGet.status, body: await webhookGet.text() },
    pricing: {
      status: pricing.status,
      has290: /\$290/.test(pricingText),
      has149: /\$149/.test(pricingText),
      unlimitedClaim: /\bunlimited\b/i.test(pricingText) && !/does not include unlimited/i.test(pricingText),
    },
    workspaceProbe: workspace.status,
    webhookReadback: {
      ok: webhook.ok,
      id: webhook.body.id ?? null,
      url: webhook.body.url ?? null,
      status: webhook.body.status ?? null,
      eventsMatch: authorizedOccupancynpvWebhookEventsMatch(webhook.body.enabled_events),
      urlMatch: webhook.body.url === OCCUPANCYNPV_WEBHOOK_URL,
      secretConfigured: secret.startsWith("whsec_"),
    },
    orphanFailedOrders: failed.count ?? 0,
  }, null, 2));
}

main().catch((error) => {
  console.log("verify_failed:", error instanceof Error ? error.message : "UNKNOWN");
  process.exit(1);
});
