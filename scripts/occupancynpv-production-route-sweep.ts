import { writeFileSync } from "node:fs";
import { searchDepthRouteManifest } from "../lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { SEO_GEO_REDIRECTS } from "../lib/infinity/venture-website-architecture/digital-real-estate-catalog";

const origin = "https://occupancynpv.com";
const redirects = new Set(SEO_GEO_REDIRECTS.map((row) => row.from));

async function main() {
  const routes = searchDepthRouteManifest().pageRoutes;
  let notFound = 0;
  let runtimeFailures = 0;
  let unexpectedRedirects = 0;
  let missingRoutes = 0;
  let checked = 0;
  for (const route of routes) {
    if (redirects.has(route)) continue;
    checked += 1;
    try {
      const res = await fetch(`${origin}${route}`, { method: "GET", redirect: "manual" });
      if (res.status === 404) {
        notFound += 1;
        missingRoutes += 1;
      } else if (res.status >= 500 || res.status === 0) runtimeFailures += 1;
      else if (res.status >= 300 && res.status < 400) unexpectedRedirects += 1;
    } catch {
      runtimeFailures += 1;
    }
  }
  const home = await fetch(`${origin}/`);
  const homeText = await home.text();
  const www = await fetch("https://www.occupancynpv.com/", { redirect: "manual" });
  const login = await fetch(`${origin}/occupancynpv/app/login`);
  const app = await fetch(`${origin}/occupancynpv/app`, { redirect: "manual" });
  const checkout = await fetch(`${origin}/occupancynpv/app/checkout/complete`, { redirect: "manual" });
  const api = await fetch(`${origin}/api/checkout/start`);
  const evidence = {
    capturedAt: new Date().toISOString(),
    existingRoutes: `${checked - missingRoutes} / ${checked} ${notFound === 0 && runtimeFailures === 0 && unexpectedRedirects === 0 && missingRoutes === 0 ? "PASS" : "FAIL"}`,
    checked,
    notFound,
    runtimeFailures,
    unexpectedRedirects,
    missingRoutes,
    https: home.url.startsWith("https://") && home.ok ? "PASS" as const : "FAIL" as const,
    wwwRedirect: www.status >= 300 && www.status < 400 && String(www.headers.get("location") || "").includes("occupancynpv.com") ? "PASS" as const : "FAIL" as const,
    paidAppRoutes: login.ok && api.ok && (app.status === 200 || app.status === 307) && (checkout.status === 200 || checkout.status === 307) ? "PASS" as const : "FAIL" as const,
    jsonLdPresent: homeText.includes("application/ld+json"),
  };
  writeFileSync(".infinity/venture-operating-scale/occupancynpv-production-route-evidence.json", `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
