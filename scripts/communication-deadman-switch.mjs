/**
 * External dead-man's switch. Different failure mode from infinity-runtime.
 * Does not read heartbeats, gates, or obligation state.
 * Pages if the production tick route disappears (the 3-hour cron outage class).
 */
const TICK_URL = process.env.COMMUNICATION_PRODUCTION_TICK_URL
  || "https://infinity-runtime.vercel.app/api/runtime/communication-tick";
const PAGE_WEBHOOK = process.env.COMMUNICATION_PAGE_WEBHOOK || "";
const now = new Date().toISOString();

async function page(reason, detail) {
  if (!PAGE_WEBHOOK) return { paged: false, reason: "PAGE_WEBHOOK_UNSET" };
  const res = await fetch(PAGE_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "COMMUNICATION_DEADMAN",
      reason,
      detail,
      at: now,
    }),
  }).catch((error) => ({ ok: false, status: 0, error: error instanceof Error ? error.message : "PAGE_FAILED" }));
  return { paged: Boolean(res && "ok" in res ? res.ok : false), status: res && "status" in res ? res.status : 0 };
}

const res = await fetch(TICK_URL, { method: "GET", redirect: "manual" }).catch(() => null);
const status = res?.status ?? 0;
const routeMissing = status === 404 || status === 0;
const snapshot = {
  observer: "github-actions-communication-deadman",
  shares_vercel_runtime: false,
  tick_url: TICK_URL,
  http_status: status,
  route_present: status === 401 || status === 200 || status === 403,
  first_failure: routeMissing ? (status === 0 ? "TICK_UNREACHABLE" : "TICK_ROUTE_MISSING") : null,
  observed_at: now,
};

if (routeMissing) {
  const alert = await page(snapshot.first_failure, snapshot);
  console.log(JSON.stringify({ ok: false, snapshot, alert }, null, 2));
  process.exit(2);
}

console.log(JSON.stringify({ ok: true, snapshot }, null, 2));
