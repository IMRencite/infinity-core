const urls = [
  "https://occupancynpv.com/blog/",
  "https://occupancynpv.com/sitemap.xml",
  "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
  "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
  "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
];
const out = [];
for (const url of urls) {
  const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } }).catch(() => null);
  const body = res ? await res.text().catch(() => "") : "";
  const title = (body.match(/<title>([^<]+)<\/title>/i) || [])[1] ?? null;
  const h1Match = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim().slice(0, 160) : null;
  out.push({
    url,
    status: res?.status ?? 0,
    final: res?.url ?? null,
    title,
    h1,
    hasCam: /cam-first-year|first operating year/i.test(body),
    hasSep18: /2026-09-18|September 18, 2026/.test(body),
    hasSep19: /2026-09-19|September 19, 2026/.test(body),
    hasSep17: /2026-09-17|September 17/.test(body),
    hasInterest: /interest rates affect commercial property/i.test(body),
    hasVgCta: /vg-cta/.test(body),
    hasPlaceholder: /TODO|lorem ipsum|INTERNAL_|WIP/.test(body),
    len: body.length,
  });
}
console.log(JSON.stringify(out, null, 2));
