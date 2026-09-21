/**
 * Black-box Organic catalog check. Compares durable claims to the public site.
 * Until this workflow runs on a schedule, status is MANUAL_RUN_ONLY.
 */
const LIVE = "https://occupancynpv.com";
const claimed = [
  {
    url: `${LIVE}/blog/valuation/how-interest-rates-affect-commercial-property-values/`,
    marker: "interest rates",
    date: "2026-09-17",
  },
  {
    url: `${LIVE}/blog/occupancy-costs/cam-first-year/`,
    marker: "first operating year",
    date: "2026-09-20",
    expected_live: false,
  },
];

const index = await fetch(`${LIVE}/blog/`, { headers: { "cache-control": "no-cache" } }).then((res) => res.text()).catch(() => "");
const sitemap = await fetch(`${LIVE}/sitemap.xml`, { headers: { "cache-control": "no-cache" } }).then((res) => res.text()).catch(() => "");
const rows = [];
for (const claim of claimed) {
  const res = await fetch(claim.url, { headers: { "cache-control": "no-cache" } }).catch(() => null);
  const body = res ? await res.text().catch(() => "") : "";
  rows.push({
    url: claim.url,
    date: claim.date,
    status: res?.status ?? 0,
    identity_present: body.toLowerCase().includes(claim.marker),
    catalog_present: index.includes(new URL(claim.url).pathname),
    sitemap_present: sitemap.includes(new URL(claim.url).pathname),
    expected_live: claim.expected_live !== false,
  });
}
const unmet = rows.filter((row) => row.expected_live && (row.status !== 200 || !row.identity_present));
const snapshot = {
  observer: "github-actions-organic-catalog",
  status: "MANUAL_RUN_ONLY",
  last_scheduled_run: process.env.GITHUB_ACTIONS === "true" ? new Date().toISOString() : null,
  rows,
  oldest_unmet: unmet[0]?.date ?? "2026-09-20",
};
console.log(JSON.stringify({ ok: unmet.length === 0, snapshot }, null, 2));
process.exit(unmet.length ? 2 : 0);
