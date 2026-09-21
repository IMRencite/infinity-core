import {
  reloadCloudflareDnsTokenFromLocalFile,
  reloadCloudflareRegistrarFromLocalFile,
  reloadVercelFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import { expandCreInboundObserverTracking } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CloudflareDnsWriteAdapter, dnsContentEqual } from "@/lib/infinity/commercialization/providers/cloudflare/dns-write-adapter";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import {
  CANONICAL_IMR_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITY_OS_LABEL,
  CANONICAL_INFINITY_OS_URL,
  CANONICAL_PRIVACY_HREF,
  CANONICAL_PRIVACY_LABEL,
  CANONICAL_SITEMAP_HREF,
  CANONICAL_SITEMAP_LABEL,
  CANONICAL_TERMS_HREF,
  CANONICAL_TERMS_LABEL,
} from "@/lib/infinity/venture-build-orchestration/constants";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2, CRE_VENTURE_ID, OCCUPANCYNPV_DOMAIN } from "./constants";
import { OCCUPANCYNPV_ZONE_ID } from "./cloudflare-dns-live-write-verification";
import {
  CRE_VERCEL_PROJECT,
  OCCUPANCYNPV_PRODUCTION_ORIGIN,
  OCCUPANCYNPV_WWW_HOST,
  reconcileRecordAfterDnsVercelBinding,
} from "./cloudflare-dns-vercel-binding";

export type SslFinalizationNextState =
  | "CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY"
  | "CRE_SSL_PENDING"
  | "CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED"
  | "CRE_PRODUCTION_DOMAIN_BINDING_FAILED";

async function fetchText(fetchImpl: typeof fetch, url: string, redirect: RequestRedirect = "follow") {
  try {
    const res = await fetchImpl(url, { method: "GET", redirect });
    return { ok: res.ok, status: res.status, location: res.headers.get("location"), body: await res.text() };
  } catch {
    return { ok: false, status: 0, location: null, body: "" };
  }
}

function footerPass(body: string, label: string, relative: string, absolute: string): "PASS" | "FAIL" {
  return body.includes(label) && (body.includes(relative) || body.includes(absolute)) ? "PASS" : "FAIL";
}

export async function executeCreOccupancynpvSslFinalizationCheck(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadCloudflareRegistrarFromLocalFile();
    reloadCloudflareDnsTokenFromLocalFile();
    reloadVercelFromLocalFile();
  }
  expandCreInboundObserverTracking({
    conversationIds: ["cnv_ff749bc4cff5d045", "cnv_c0e5bd3a282977c0", "cnv_13b5bd0edb3f5ba8", "cnv_d47861e4f5c9fb3a"],
    threadIds: ["1a0631f98c277314", "1a0631f9b3cfd151", "1a0708bf27f455c5", "1a0708bf5f29fb09"],
  });
  const fetchImpl = input.fetchImpl ?? fetch;
  const dns = new CloudflareDnsWriteAdapter({ fetchImpl });
  const vercel = new VercelDomainBindingAdapter({ fetchImpl });
  const writesBefore = dns.recordWrites + dns.zoneCreates + vercel.domainPosts;

  const zone = await dns.findZone(OCCUPANCYNPV_DOMAIN);
  const listed = zone.zoneId !== "UNKNOWN" ? await dns.listRecords(zone.zoneId) : { records: [], ok: false };
  const apexConfig = await vercel.getDomainConfig(OCCUPANCYNPV_DOMAIN);
  const wwwConfig = await vercel.getDomainConfig(OCCUPANCYNPV_WWW_HOST);
  const requiredApex = apexConfig.records.find((row) => row.purpose === "ROUTING");
  const requiredWww = wwwConfig.records.find((row) => row.purpose === "ROUTING");
  const apexRecord = listed.records.find(
    (row) => row.recordType === "CNAME" && row.name.toLowerCase() === OCCUPANCYNPV_DOMAIN,
  );
  const wwwRecord = listed.records.find(
    (row) => row.recordType === "CNAME" && row.name.toLowerCase() === OCCUPANCYNPV_WWW_HOST,
  );
  const expectedTarget = requiredApex?.content ?? "d98a9119cef50aca.vercel-dns-016.com.";
  const expectedWwwTarget = requiredWww?.content ?? expectedTarget;
  const apexDns = apexRecord && dnsContentEqual(apexRecord.content, expectedTarget) ? "PASS" as const : "FAIL" as const;
  const wwwDns = wwwRecord && dnsContentEqual(wwwRecord.content, expectedWwwTarget) ? "PASS" as const : "FAIL" as const;
  const targetMatch = apexDns === "PASS" && wwwDns === "PASS" ? "PASS" as const : "FAIL" as const;

  const deployment = await vercel.getDeployment(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID);
  const namedProject = await vercel.getProject(CRE_VERCEL_PROJECT);
  const projectRef = deployment.projectId !== "UNKNOWN" ? deployment.projectId : namedProject.ok ? namedProject.id : CRE_VERCEL_PROJECT;
  const apexDomain = await vercel.getProjectDomain(projectRef, OCCUPANCYNPV_DOMAIN);
  const wwwDomain = await vercel.getProjectDomain(projectRef, OCCUPANCYNPV_WWW_HOST);
  const https = await fetchText(fetchImpl, OCCUPANCYNPV_PRODUCTION_ORIGIN);
  const http = await fetchText(fetchImpl, `http://${OCCUPANCYNPV_DOMAIN}`, "manual");
  const www = await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}`, "manual");
  const wwwFollow = www.status >= 300 && www.status < 400 ? await fetchText(fetchImpl, www.location ?? OCCUPANCYNPV_PRODUCTION_ORIGIN) : www;

  const apexHttps = https.ok ? "PASS" as const : "PENDING" as const;
  const wwwRedirects = www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "");
  const ssl = {
    apexCertificate: https.ok ? "ISSUED" as const : "PENDING" as const,
    apexHttps,
    tls: https.ok ? "PASS" as const : "PENDING" as const,
    httpToHttps: http.status >= 300 && http.status < 400 && /https:\/\/occupancynpv\.com/i.test(http.location ?? "")
      ? "PASS" as const
      : "PENDING" as const,
    wwwCertificate: www.ok || wwwRedirects ? "ISSUED" as const : "PENDING" as const,
    wwwHttps: www.ok || wwwRedirects ? "PASS" as const : "PENDING" as const,
    wwwToApex: wwwRedirects ? "PASS" as const : "PENDING" as const,
    wwwRedirectDestination: www.location ?? "NONE",
  };

  const emptyHost = {
    canonical: "NOT_EVALUATED",
    sitemap: "NOT_EVALUATED",
    leakage: "NOT_EVALUATED",
    internalLinks: "NOT_EVALUATED",
    configuration: "NOT_EVALUATED" as const,
  };
  const emptyRoutes = { expected: 93, notFound: "NOT_EVALUATED", runtimeFailures: "NOT_EVALUATED", unexpectedRedirects: "NOT_EVALUATED", missingRoutes: "NOT_EVALUATED" };
  const emptyFooter = { privacy: "NOT_EVALUATED", terms: "NOT_EVALUATED", sitemap: "NOT_EVALUATED", infinityOs: "NOT_EVALUATED", imr: "NOT_EVALUATED" };

  const dnsWrites = (dns.recordWrites + dns.zoneCreates + vercel.domainPosts) - writesBefore;
  const finish = (nextState: SslFinalizationNextState, extra: Record<string, unknown> = {}) => {
    const persist = extra.persist === true && input.persistRecord !== false;
    const record = persist
      ? reconcileRecordAfterDnsVercelBinding({
          dnsConfigured: true,
          bound: true,
          sslConfigured: true,
          zoneId: zone.zoneId === "UNKNOWN" ? OCCUPANCYNPV_ZONE_ID : zone.zoneId,
        })
      : null;
    return {
      mission: CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2,
      dns: { apex: apexDns, www: wwwDns, targetMatch, writes: dnsWrites },
      vercel: {
        apex: apexDomain.verified ? "VALID" as const : apexDomain.ok ? "PENDING" as const : "ERROR" as const,
        www: wwwDomain.redirect === OCCUPANCYNPV_DOMAIN
          ? wwwDomain.verified ? "VALID" as const : "PENDING" as const
          : wwwDomain.ok ? "PENDING" as const : "ERROR" as const,
        primary: OCCUPANCYNPV_DOMAIN,
        wwwRedirectConfiguration: wwwDomain.redirect ?? "NONE",
      },
      ssl,
      productionHost: extra.productionHost ?? emptyHost,
      routes: extra.routes ?? emptyRoutes,
      footer: extra.footer ?? emptyFooter,
      artifact: {
        id: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
        digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
        contentChanged: "NO" as const,
        rebuilt: "NO" as const,
        redeployed: "NO" as const,
        founderReviewPreserved: "YES" as const,
      },
      record: record
        ? {
            dnsConfigured: "YES" as const,
            productionDomainBound: "YES" as const,
            sslConfigured: "YES" as const,
            productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
            publiclyLaunched: "NO" as const,
            remainingBlockers: record.blocked_actions,
          }
        : extra.record ?? {
            dnsConfigured: "YES" as const,
            productionDomainBound: "YES" as const,
            sslConfigured: "NO" as const,
            productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
            publiclyLaunched: "NO" as const,
            remainingBlockers: [] as string[],
          },
      nextState,
      nextGovernedAction:
        nextState === "CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY"
          ? "LEGAL_AND_PAYMENT_COMMERCIALIZATION_CONFIGURATION"
          : nextState === "CRE_SSL_PENDING"
            ? "WAIT_FOR_PROVIDER_SSL_AND_REVERIFY"
            : nextState,
      actions: {
        dnsWrites,
        domainPurchases: 0 as const,
        vercelPurchases: 0 as const,
        vercelUpgrades: 0 as const,
        vercelMutations: 0 as const,
        deployments: 0 as const,
        stripeWrites: 0 as const,
        customerCharges: 0 as const,
        searchSubmissions: 0 as const,
        coldOutreach: 0 as const,
        publiclyLaunched: "NO" as const,
      },
    };
  };

  if (targetMatch !== "PASS" || zone.zoneId !== OCCUPANCYNPV_ZONE_ID) {
    return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED");
  }
  if (apexHttps !== "PASS" || ssl.wwwToApex !== "PASS" || ssl.httpToHttps !== "PASS") {
    return finish("CRE_SSL_PENDING");
  }

  const sitemap = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`);
  const validationHost = new URL(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL).host;
  const canonicalMatch = https.body.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    ?? https.body.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const canonicalHref = canonicalMatch?.[1] ?? "";
  const sitemapHasValidation = sitemap.body.includes(validationHost);
  const homeHasValidation = https.body.includes(validationHost);
  const canonical = canonicalHref.startsWith("/") || canonicalHref.includes(OCCUPANCYNPV_DOMAIN)
    ? OCCUPANCYNPV_DOMAIN
    : canonicalHref.includes(validationHost)
      ? validationHost
      : "UNKNOWN";
  const sitemapHost = sitemapHasValidation ? validationHost : sitemap.ok ? OCCUPANCYNPV_DOMAIN : "UNKNOWN";
  const leakage = sitemapHasValidation || /<loc>|canonical/i.test(https.body) && homeHasValidation ? "YES" : "NO";
  const hrefs = [...https.body.matchAll(/href=["']([^"']+)["']/gi)].map((row) => row[1] ?? "");
  const internalLinks = hrefs.some((href) => href.includes(validationHost)) ? "FAIL" : "PASS";
  const hostConfig = leakage === "YES" || canonical === validationHost || sitemapHost === validationHost
    ? "UPDATE_REQUIRED" as const
    : "PASS" as const;
  const productionHost = {
    canonical,
    sitemap: sitemapHost,
    leakage,
    internalLinks,
    configuration: hostConfig,
  };
  if (hostConfig === "UPDATE_REQUIRED") {
    return finish("CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED", { productionHost });
  }

  const redirects = new Set(SEO_GEO_REDIRECTS.map((row) => row.from));
  let notFound = 0;
  let runtimeFailures = 0;
  let unexpectedRedirects = 0;
  let missingRoutes = 0;
  for (const route of searchDepthRouteManifest().pageRoutes) {
    const first = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${route}`, "manual");
    if (redirects.has(route)) {
      if (!(first.status >= 300 && first.status < 400)) unexpectedRedirects += 1;
      continue;
    }
    if (first.status === 404) {
      notFound += 1;
      missingRoutes += 1;
      continue;
    }
    if (first.status >= 500 || first.status === 0) {
      runtimeFailures += 1;
      missingRoutes += 1;
      continue;
    }
    if (first.status >= 300 && first.status < 400) {
      const location = first.location ?? "";
      const slashOnly = location.replace(/https?:\/\/occupancynpv\.com/i, "") === `${route.endsWith("/") ? route.slice(0, -1) : `${route}/`}`
        || location.endsWith(`${route}/`)
        || location.endsWith(route);
      if (!slashOnly) unexpectedRedirects += 1;
    }
  }
  const routes = { expected: 93, notFound, runtimeFailures, unexpectedRedirects, missingRoutes };
  const footer = {
    privacy: footerPass(https.body, CANONICAL_PRIVACY_LABEL, CANONICAL_PRIVACY_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`),
    terms: footerPass(https.body, CANONICAL_TERMS_LABEL, CANONICAL_TERMS_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`),
    sitemap: footerPass(https.body, CANONICAL_SITEMAP_LABEL, CANONICAL_SITEMAP_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`),
    infinityOs: https.body.includes(CANONICAL_INFINITY_OS_LABEL) && https.body.includes(CANONICAL_INFINITY_OS_URL) ? "PASS" as const : "FAIL" as const,
    imr: https.body.includes(CANONICAL_IMR_LABEL) && https.body.includes(CANONICAL_IMR_URL) ? "PASS" as const : "FAIL" as const,
  };
  const ready = notFound === 0 && runtimeFailures === 0 && unexpectedRedirects === 0 && missingRoutes === 0
    && footer.privacy === "PASS" && footer.terms === "PASS" && footer.sitemap === "PASS" && footer.infinityOs === "PASS" && footer.imr === "PASS"
    && wwwFollow.ok;
  if (!ready) {
    return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED", { productionHost, routes, footer });
  }
  return finish("CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY", { productionHost, routes, footer, persist: true });
}

export type OccupancynpvSslFinalizationCheckResult = Awaited<ReturnType<typeof executeCreOccupancynpvSslFinalizationCheck>>;
