import { reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { expandCreInboundObserverTracking } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
} from "@/lib/infinity/market-validation-experiment/constants";
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
import { CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1, OCCUPANCYNPV_DOMAIN } from "./constants";
import {
  CRE_VERCEL_PROJECT,
  OCCUPANCYNPV_PRODUCTION_ORIGIN,
  OCCUPANCYNPV_WWW_HOST,
  reconcileRecordAfterDnsVercelBinding,
} from "./cloudflare-dns-vercel-binding";

export type OccupancynpvBindingRootCause =
  | "STALE_DEPLOYMENT_ALIAS"
  | "MISSING_PRODUCTION_DEPLOYMENT"
  | "DOMAIN_ATTACHED_TO_WRONG_PROJECT"
  | "PRODUCTION_ALIAS_NOT_ASSIGNED"
  | "DEPLOYMENT_DELETED"
  | "OTHER_VERCEL_BINDING_DEFECT";

export type OccupancynpvBindingRepairNextState =
  | "CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY"
  | "CRE_VERCEL_BINDING_REPAIRED"
  | "ACCEPTED_ARTIFACT_REDEPLOYMENT_REQUIRED"
  | "CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED"
  | "CRE_VERCEL_BINDING_FAILED";

const HISTORICAL_DEPLOYMENT = DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID;
const PREVIEW_HOST = new URL(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL).host;

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

function historicalState(input: { ok: boolean; status: number; readyState: string }): string {
  if (input.status === 404) return "MISSING";
  if (!input.ok && /not_found|deleted/i.test(input.readyState)) return "DELETED";
  if (input.ok && input.readyState === "READY") return "READY";
  if (input.ok) return input.readyState;
  return input.status === 0 ? "UNKNOWN" : "UNKNOWN";
}

function classifyRootCause(input: {
  projectOk: boolean;
  apexAttached: boolean;
  apexProject: string;
  expectedProject: string;
  historicalExists: boolean;
  historicalState: string;
  equivalentExists: boolean;
  productionDeployment: string;
  productionState: string;
  aliasDeployment: string;
}): { cause: OccupancynpvBindingRootCause; explanation: string } {
  if (input.apexAttached && input.apexProject !== "NONE" && input.apexProject !== input.expectedProject) {
    return {
      cause: "DOMAIN_ATTACHED_TO_WRONG_PROJECT",
      explanation: "occupancynpv.com is attached to a different Vercel project than the accepted CRE deployment.",
    };
  }
  if (!input.historicalExists && !input.equivalentExists) {
    return {
      cause: input.historicalState === "MISSING" || input.historicalState === "DELETED" ? "DEPLOYMENT_DELETED" : "MISSING_PRODUCTION_DEPLOYMENT",
      explanation: "The accepted deployment is not available and no equivalent READY deployment can serve the accepted artifact.",
    };
  }
  if (input.apexAttached && input.equivalentExists && (input.aliasDeployment === "NONE" || input.aliasDeployment === "")) {
    if (input.productionDeployment !== "NONE" && input.productionState !== "READY") {
      return {
        cause: "STALE_DEPLOYMENT_ALIAS",
        explanation: "occupancynpv.com is attached to the correct project, but the production target is not READY, so Vercel serves DEPLOYMENT_NOT_FOUND. The accepted READY deployment still exists and is not aliased to the apex.",
      };
    }
    return {
      cause: "PRODUCTION_ALIAS_NOT_ASSIGNED",
      explanation: "occupancynpv.com is attached to the correct project, but it is not aliased to the accepted READY deployment.",
    };
  }
  if (
    input.apexAttached &&
    input.equivalentExists &&
    input.aliasDeployment !== "NONE" &&
    input.aliasDeployment !== HISTORICAL_DEPLOYMENT &&
    input.productionState !== "READY"
  ) {
    return {
      cause: "STALE_DEPLOYMENT_ALIAS",
      explanation: "The production alias points at a stale or ERROR deployment instead of the accepted READY artifact.",
    };
  }
  if (!input.projectOk && !input.equivalentExists) {
    return {
      cause: "MISSING_PRODUCTION_DEPLOYMENT",
      explanation: "No usable Vercel project production deployment was found for the accepted artifact.",
    };
  }
  return {
    cause: "OTHER_VERCEL_BINDING_DEFECT",
    explanation: "Vercel returned DEPLOYMENT_NOT_FOUND for occupancynpv.com even though a project and deployment inspection completed.",
  };
}

export async function executeCreOccupancynpvVercelDeploymentBindingRepair(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
} = {}) {
  if (input.reloadEnv !== false) reloadVercelFromLocalFile();
  expandCreInboundObserverTracking({
    conversationIds: ["cnv_ff749bc4cff5d045", "cnv_c0e5bd3a282977c0", "cnv_13b5bd0edb3f5ba8", "cnv_d47861e4f5c9fb3a"],
    threadIds: ["1a0631f98c277314", "1a0631f9b3cfd151", "1a0708bf27f455c5", "1a0708bf5f29fb09"],
  });
  const fetchImpl = input.fetchImpl ?? fetch;
  const vercel = new VercelDomainBindingAdapter({ fetchImpl });

  const historical = await vercel.getDeployment(HISTORICAL_DEPLOYMENT);
  const namedProject = await vercel.getProject(CRE_VERCEL_PROJECT);
  const projectRef = historical.projectId !== "UNKNOWN" ? historical.projectId : namedProject.ok ? namedProject.id : CRE_VERCEL_PROJECT;
  const project = projectRef === CRE_VERCEL_PROJECT ? namedProject : await vercel.getProject(projectRef);
  const deployments = project.id !== "UNKNOWN" ? await vercel.listDeployments(project.id) : { ok: false, deployments: [] as Awaited<ReturnType<VercelDomainBindingAdapter["listDeployments"]>>["deployments"] };
  const apexDomain = await vercel.getProjectDomain(projectRef, OCCUPANCYNPV_DOMAIN);
  const wwwDomain = await vercel.getProjectDomain(projectRef, OCCUPANCYNPV_WWW_HOST);
  const apexAlias = await vercel.getAlias(OCCUPANCYNPV_DOMAIN);
  const preview = await fetchText(fetchImpl, DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL);
  const previewServesAccepted =
    preview.ok &&
    (preview.body.includes(`data-dpl-id="${HISTORICAL_DEPLOYMENT}"`) ||
      preview.body.includes(HISTORICAL_DEPLOYMENT) ||
      historical.url.includes(PREVIEW_HOST));

  const historicalExists = historical.ok;
  const histState = historicalState(historical);
  const equivalentFromList = deployments.deployments.find(
    (row) =>
      row.readyState === "READY" &&
      (row.id === HISTORICAL_DEPLOYMENT || row.url.includes(PREVIEW_HOST) || row.aliases.includes(PREVIEW_HOST)),
  );
  const equivalentId =
    historicalExists && histState === "READY"
      ? historical.id
      : equivalentFromList?.id ?? (previewServesAccepted && historicalExists ? historical.id : "NONE");
  const equivalentExists = equivalentId !== "NONE";
  const exactRedeploySupported = historicalExists && histState === "READY" ? "YES" : historicalExists ? "UNKNOWN" : "NO";

  const classification = classifyRootCause({
    projectOk: project.ok,
    apexAttached: apexDomain.ok,
    apexProject: apexDomain.ok ? project.id : "NONE",
    expectedProject: project.id !== "UNKNOWN" ? project.id : "NONE",
    historicalExists,
    historicalState: histState,
    equivalentExists,
    productionDeployment: project.productionDeploymentId,
    productionState: project.productionReadyState,
    aliasDeployment: apexAlias.deploymentId,
  });

  const emptyHost: {
    canonical: string;
    sitemap: string;
    leakage: string;
    configuration: "NOT_EVALUATED" | "PASS" | "UPDATE_REQUIRED";
  } = {
    canonical: "NOT_EVALUATED",
    sitemap: "NOT_EVALUATED",
    leakage: "NOT_EVALUATED",
    configuration: "NOT_EVALUATED",
  };
  const emptyRoutes = {
    expected: 93,
    notFound: "NOT_EVALUATED" as const,
    runtimeFailures: "NOT_EVALUATED" as const,
    unexpectedRedirects: "NOT_EVALUATED" as const,
    missingRoutes: "NOT_EVALUATED" as const,
  };

  const finish = (
    nextState: OccupancynpvBindingRepairNextState,
    extra: {
      repairAttempted?: "YES" | "NO";
      domainRebound?: "YES" | "NO";
      boundDeployment?: string;
      https?: ReturnType<typeof readHttps>;
      productionHost?: typeof emptyHost;
      routes?: { expected: number; notFound: number | "NOT_EVALUATED"; runtimeFailures: number | "NOT_EVALUATED"; unexpectedRedirects: number | "NOT_EVALUATED"; missingRoutes: number | "NOT_EVALUATED" };
      persist?: boolean;
    } = {},
  ) => {
    const persist = extra.persist === true && input.persistRecord !== false;
    const record = persist
      ? reconcileRecordAfterDnsVercelBinding({
          dnsConfigured: true,
          bound: true,
          sslConfigured: true,
          zoneId: "dbc6bd7446d67b25699aa62c88d9e5a5",
        })
      : null;
    return {
      mission: CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1,
      project: {
        exists: project.ok ? "YES" as const : "NO" as const,
        name: project.ok ? project.name : CRE_VERCEL_PROJECT,
        id: project.id,
        currentProductionDeployment: project.productionDeploymentId,
        productionDeploymentState: project.productionReadyState,
      },
      historical: {
        deployment: HISTORICAL_DEPLOYMENT,
        exists: historicalExists ? "YES" as const : "NO" as const,
        state: histState,
      },
      domain: {
        apexAttached: apexDomain.ok ? "YES" as const : "NO" as const,
        wwwAttached: wwwDomain.ok ? "YES" as const : "NO" as const,
        apexProject: apexDomain.ok ? project.name : "NONE",
        wwwProject: wwwDomain.ok ? project.name : "NONE",
        productionAlias: apexAlias.deploymentId,
        wwwRedirect: wwwDomain.redirect ?? "NONE",
        configurationValid: apexDomain.verified && wwwDomain.redirect === OCCUPANCYNPV_DOMAIN ? "YES" as const : "NO" as const,
      },
      rootCause: classification,
      equivalent: {
        exists: equivalentExists ? "YES" as const : "NO" as const,
        deployment: equivalentId,
        previewServesAccepted: previewServesAccepted ? "YES" as const : "NO" as const,
        exactRedeploySupported,
      },
      repair: {
        attempted: extra.repairAttempted ?? "NO",
        domainRebound: extra.domainRebound ?? "NO",
        deployment: extra.boundDeployment ?? equivalentId,
        cloudflareDnsChanged: "NO" as const,
      },
      https: extra.https ?? {
        apex: "FAIL" as const,
        httpStatus: 0,
        tls: "FAIL" as const,
        wwwRedirect: "FAIL" as const,
        vercel404: "UNKNOWN" as const,
      },
      artifact: {
        id: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
        digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
        contentChanged: "NO" as const,
        regenerated: "NO" as const,
        founderReviewPreserved: "YES" as const,
      },
      productionHost: extra.productionHost ?? emptyHost,
      routes: extra.routes ?? emptyRoutes,
      record: record
        ? {
            dnsConfigured: "YES" as const,
            productionDomainBound: "YES" as const,
            sslConfigured: "YES" as const,
            productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
            publiclyLaunched: "NO" as const,
            remainingBlockers: record.blocked_actions,
          }
        : {
            dnsConfigured: "YES" as const,
            productionDomainBound: extra.domainRebound === "YES" ? "YES" as const : "NO" as const,
            sslConfigured: "NO" as const,
            productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
            publiclyLaunched: "NO" as const,
            remainingBlockers: [] as string[],
          },
      nextState,
      actions: {
        dnsWrites: 0 as const,
        domainPurchases: 0 as const,
        vercelPurchases: 0 as const,
        vercelUpgrades: 0 as const,
        vercelMutations: vercel.aliasAssigns + vercel.domainPosts,
        deployments: 0 as const,
        stripeWrites: 0 as const,
        customerCharges: 0 as const,
        searchSubmissions: 0 as const,
        publiclyLaunched: "NO" as const,
      },
    };
  };

  function readHttps(home: Awaited<ReturnType<typeof fetchText>>, www: Awaited<ReturnType<typeof fetchText>>) {
    const vercel404 = /DEPLOYMENT_NOT_FOUND|NOT_FOUND/i.test(home.body);
    const wwwRedirects = www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "");
    return {
      apex: home.ok && home.status === 200 && !vercel404 ? "PASS" as const : "FAIL" as const,
      httpStatus: home.status,
      tls: home.status > 0 && home.status !== 525 && home.status !== 526 ? "PASS" as const : "FAIL" as const,
      wwwRedirect: wwwRedirects ? "PASS" as const : "FAIL" as const,
      vercel404: vercel404 ? "YES" as const : "NO" as const,
    };
  }

  if (classification.cause === "DOMAIN_ATTACHED_TO_WRONG_PROJECT") {
    return finish("CRE_VERCEL_BINDING_FAILED");
  }
  if (!equivalentExists) {
    return finish("ACCEPTED_ARTIFACT_REDEPLOYMENT_REQUIRED");
  }

  const assigned = await vercel.assignDeploymentAlias(equivalentId, OCCUPANCYNPV_DOMAIN);
  let promoted = { ok: true, status: 0, safeError: null as string | null };
  if (wwwDomain.redirect !== OCCUPANCYNPV_DOMAIN) {
    await vercel.ensureProjectDomain({
      project: projectRef,
      domain: OCCUPANCYNPV_WWW_HOST,
      redirect: OCCUPANCYNPV_DOMAIN,
    });
  }
  let home = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/`);
  let https = readHttps(home, await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}/`, "manual"));
  if ((!assigned.ok || https.apex !== "PASS") && project.id !== "UNKNOWN") {
    promoted = await vercel.promoteDeployment(project.id, equivalentId);
    await vercel.assignDeploymentAlias(equivalentId, OCCUPANCYNPV_DOMAIN);
    home = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/`);
    https = readHttps(home, await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}/`, "manual"));
  }
  const rebound = (assigned.ok || promoted.ok) && https.apex === "PASS" ? "YES" as const : assigned.ok ? "YES" as const : "NO" as const;
  if (https.apex !== "PASS") {
    return finish("CRE_VERCEL_BINDING_FAILED", {
      repairAttempted: "YES",
      domainRebound: rebound,
      boundDeployment: equivalentId,
      https,
    });
  }

  const sitemap = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`);
  const canonicalMatch =
    home.body.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
    home.body.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const canonicalHref = canonicalMatch?.[1] ?? "";
  const sitemapHasValidation = sitemap.body.includes(PREVIEW_HOST);
  const homeHasValidation = home.body.includes(PREVIEW_HOST);
  const canonical =
    canonicalHref.startsWith("/") || canonicalHref.includes(OCCUPANCYNPV_DOMAIN)
      ? OCCUPANCYNPV_DOMAIN
      : canonicalHref.includes(PREVIEW_HOST)
        ? PREVIEW_HOST
        : "UNKNOWN";
  const sitemapHost = sitemapHasValidation ? PREVIEW_HOST : sitemap.ok ? OCCUPANCYNPV_DOMAIN : "UNKNOWN";
  const leakage = sitemapHasValidation || (/canonical/i.test(home.body) && homeHasValidation) ? "YES" : "NO";
  const hostConfig =
    leakage === "YES" || canonical === PREVIEW_HOST || sitemapHost === PREVIEW_HOST
      ? "UPDATE_REQUIRED" as const
      : "PASS" as const;
  const productionHost = { canonical, sitemap: sitemapHost, leakage, configuration: hostConfig };
  if (hostConfig === "UPDATE_REQUIRED") {
    return finish("CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED", {
      repairAttempted: "YES",
      domainRebound: rebound,
      boundDeployment: equivalentId,
      https,
      productionHost,
    });
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
      const slashOnly =
        location.replace(/https?:\/\/occupancynpv\.com/i, "") === `${route.endsWith("/") ? route.slice(0, -1) : `${route}/`}` ||
        location.endsWith(`${route}/`) ||
        location.endsWith(route);
      if (!slashOnly) unexpectedRedirects += 1;
    }
  }
  const routes = { expected: 93, notFound, runtimeFailures, unexpectedRedirects, missingRoutes };
  const footer = {
    privacy: footerPass(home.body, CANONICAL_PRIVACY_LABEL, CANONICAL_PRIVACY_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`),
    terms: footerPass(home.body, CANONICAL_TERMS_LABEL, CANONICAL_TERMS_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`),
    sitemap: footerPass(home.body, CANONICAL_SITEMAP_LABEL, CANONICAL_SITEMAP_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`),
    infinityOs: home.body.includes(CANONICAL_INFINITY_OS_LABEL) && home.body.includes(CANONICAL_INFINITY_OS_URL) ? "PASS" : "FAIL",
    imr: home.body.includes(CANONICAL_IMR_LABEL) && home.body.includes(CANONICAL_IMR_URL) ? "PASS" : "FAIL",
  };
  const ready =
    notFound === 0 &&
    runtimeFailures === 0 &&
    unexpectedRedirects === 0 &&
    missingRoutes === 0 &&
    footer.privacy === "PASS" &&
    footer.terms === "PASS" &&
    footer.sitemap === "PASS" &&
    footer.infinityOs === "PASS" &&
    footer.imr === "PASS" &&
    https.wwwRedirect === "PASS";
  if (!ready) {
    return finish("CRE_VERCEL_BINDING_FAILED", {
      repairAttempted: "YES",
      domainRebound: rebound,
      boundDeployment: equivalentId,
      https,
      productionHost,
      routes,
    });
  }
  return finish("CRE_VERCEL_BINDING_REPAIRED", {
    repairAttempted: "YES",
    domainRebound: rebound,
    boundDeployment: equivalentId,
    https,
    productionHost,
    routes,
    persist: true,
  });
}

export type OccupancynpvVercelBindingRepairResult = Awaited<
  ReturnType<typeof executeCreOccupancynpvVercelDeploymentBindingRepair>
>;
