const origin = "https://infinity-validation-cre-lease-npv-e72beb7b-5le6m8tl1.vercel.app";
const routes = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/commercial-lease-npv",
  "/tenant-improvement-allowance",
  "/discount-rate-sensitivity",
  "/resources",
  "/resources/cam-costs/",
  "/resources/free-rent/",
  "/resources/rent-escalations/",
  "/resources/gross-vs-net-lease/",
  "/for/tenant-rep-brokers/",
  "/pricing",
  "/faq",
  "/early-access",
  "/privacy-policy",
  "/terms-of-service",
];

function titleOf(html: string) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}
function descriptionOf(html: string) {
  return (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
    ""
  );
}
function canonicalOf(html: string) {
  return (
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    ""
  );
}

const pages: Record<string, string> = {};
for (const route of routes) {
  const res = await fetch(`${origin}${route}`, { redirect: "follow" });
  pages[route] = await res.text();
  console.log(
    JSON.stringify({
      route,
      status: res.status,
      title: titleOf(pages[route]),
      description: descriptionOf(pages[route]).slice(0, 80),
      canonical: canonicalOf(pages[route]),
    }),
  );
}

const titles = routes.filter((r) => !["/privacy-policy", "/terms-of-service", "/early-access"].includes(r)).map((r) => titleOf(pages[r]));
const descriptions = routes.filter((r) => !["/privacy-policy", "/terms-of-service", "/early-access"].includes(r)).map((r) => descriptionOf(pages[r]));
const canonicals = routes.filter((r) => !["/privacy-policy", "/terms-of-service", "/early-access"].includes(r)).map((r) => canonicalOf(pages[r]));
const npv = pages["/commercial-lease-npv"];
console.log(
  JSON.stringify(
    {
      uniqueTitles: new Set(titles).size === titles.length,
      titles,
      uniqueDescriptions: new Set(descriptions).size === descriptions.length,
      uniqueCanonicals: new Set(canonicals).size === canonicals.length,
      npvTotalCost: /total cost/i.test(npv),
      npvVs: /NPV vs/i.test(npv),
      undiscounted: /undiscounted/i.test(npv),
      questionId: /data-question-id/.test(Object.values(pages).join("\n")),
      candidate: Object.values(pages).some((html) => html.includes("7e7e924e-0741-4155-a729-8d529da77ea9")),
    },
    null,
    2,
  ),
);
