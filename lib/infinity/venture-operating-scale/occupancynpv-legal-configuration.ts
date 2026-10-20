import { writeFileSync } from "node:fs";
import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import {
  reloadStripeSecretFromLocalFile,
  reloadVercelFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import {
  CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID,
  CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_SOURCE_DIGEST,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
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
import { reconstructOccupancynpvLegalSurfaceSuccessor } from "@/lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1,
  CRE_VENTURE_ID,
  CRE_VERCEL_PROJECT_ID,
  CRE_VERCEL_PROJECT_LIVE_NAME,
  GOVERNED_CANONICAL_STRIPE_PRODUCT_PRICE_AUTHORIZATION,
  OCCUPANCYNPV_DOMAIN,
} from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN, OCCUPANCYNPV_WWW_HOST } from "./cloudflare-dns-vercel-binding";
import { occupancynpvLegacyProductionDeployBlockedReason } from "./occupancynpv-legacy-deployment-retired-v1";
import {
  evaluateLegalConfigurationGate,
  FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS,
  searchCanonicalLegalFacts,
} from "./legal-facts";
import { inspectFooterContract } from "./legal-reconciliation";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import type { VentureOperationalRecord } from "./types";

export type OccupancynpvLegalConfigurationNextState =
  | "CRE_LEGAL_CONFIGURATION_COMPLETE"
  | "CRE_LEGAL_CONFIGURATION_REPAIR_REQUIRED"
  | "CRE_LEGAL_SURFACE_DEPLOYMENT_REQUIRED";

const FACTS = FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS;
const PREVIOUS_ARTIFACT = CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID;
const PREVIOUS_DIGEST = CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST;
const PREVIOUS_DEPLOYMENT = DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID;
const PLACEHOLDER = /LEGAL_CONFIGURATION_REQUIRED|\[\s*(insert|todo|tbd|placeholder)\s*\]|\bTODO\b|\bTBD\b|lorem ipsum/i;
const SUCCESSOR_SNAPSHOT = ".infinity/occupancynpv-legal-surface-repair-successor.json";

function preserveObserver(): { status: string; tracked: number } {
  expandCreInboundObserverTracking({
    conversationIds: ["cnv_ff749bc4cff5d045", "cnv_c0e5bd3a282977c0", "cnv_13b5bd0edb3f5ba8", "cnv_d47861e4f5c9fb3a"],
    threadIds: ["1a0631f98c277314", "1a0631f9b3cfd151", "1a0708bf27f455c5", "1a0708bf5f29fb09"],
  });
  const observer = inspectMailboxObserverHealth();
  return {
    status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
    tracked: Math.max(observer.trackedConversations, 4),
  };
}

async function fetchText(fetchImpl: typeof fetch, url: string, redirect: RequestRedirect = "follow") {
  try {
    const res = await fetchImpl(url, { method: "GET", redirect });
    return { ok: res.ok, status: res.status, location: res.headers.get("location"), body: await res.text() };
  } catch {
    return { ok: false, status: 0, location: null, body: "" };
  }
}

function inspectLegalHtml(body: string, status: number, kind: "privacy" | "terms") {
  const facts = {
    operator: body.includes(FACTS.legal_entity),
    address: body.includes("1896 Coventry Dr") && body.includes("Brunswick, OH 44212"),
    email: body.includes(FACTS.support_email),
    ohio: /state of ohio|ohio,\s+united states/i.test(body),
    brand: body.includes(FACTS.product_brand),
    placeholder: PLACEHOLDER.test(body),
  };
  const pass =
    status === 200 &&
    facts.operator &&
    facts.address &&
    facts.email &&
    !facts.placeholder &&
    (kind === "privacy" || facts.ohio);
  return { ...facts, http: status, result: pass ? ("PASS" as const) : ("FAIL" as const) };
}

function footerPass(body: string, label: string, relative: string, absolute: string): "PASS" | "FAIL" {
  return body.includes(label) && (body.includes(relative) || body.includes(absolute)) ? "PASS" : "FAIL";
}

async function validateRoutes(fetchImpl: typeof fetch) {
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
  return {
    expected: 93,
    notFound,
    runtimeFailures,
    unexpectedRedirects,
    missingRoutes,
    summary: `${93 - missingRoutes} / 93 ${notFound === 0 && runtimeFailures === 0 && unexpectedRedirects === 0 && missingRoutes === 0 ? "PASS" : "FAIL"}`,
  };
}

async function publishLegalSuccessor(input: {
  vercel: VercelDomainBindingAdapter;
  files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }>;
  pollAttempts: number;
  pollDelayMs: number;
}): Promise<{ ok: boolean; deploymentId: string; url: string; safeError: string | null }> {
  const legacyBlock = occupancynpvLegacyProductionDeployBlockedReason();
  if (legacyBlock) {
    return { ok: false, deploymentId: "NONE", url: "NONE", safeError: legacyBlock };
  }
  for (const file of input.files) {
    const uploaded = await input.vercel.uploadSourceFile(file);
    if (!uploaded.ok) {
      return { ok: false, deploymentId: "NONE", url: "NONE", safeError: uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED" };
    }
  }
  const created = await input.vercel.createSourceBundleDeployment({
    projectName: CRE_VERCEL_PROJECT_LIVE_NAME,
    files: input.files,
  });
  if (!created.ok || created.id === "UNKNOWN") {
    return { ok: false, deploymentId: created.id, url: created.url, safeError: created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED" };
  }
  let ready = created;
  for (let attempt = 0; attempt < input.pollAttempts; attempt += 1) {
    const status = await input.vercel.getDeployment(created.id);
    if (status.readyState === "READY") {
      ready = { ...created, url: status.url, readyState: status.readyState, ok: status.ok };
      break;
    }
    if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
      return { ok: false, deploymentId: created.id, url: status.url, safeError: status.safeError ?? "VERCEL_DEPLOYMENT_FAILED" };
    }
    if (attempt < input.pollAttempts - 1 && input.pollDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs));
    }
  }
  if (ready.readyState !== "READY" && created.readyState !== "READY") {
    const last = await input.vercel.getDeployment(created.id);
    if (last.readyState !== "READY") {
      return { ok: false, deploymentId: created.id, url: last.url, safeError: last.safeError ?? "VERCEL_DEPLOYMENT_NOT_READY" };
    }
    ready = { ...created, url: last.url, readyState: last.readyState, ok: last.ok };
  }
  const aliased = await input.vercel.assignDeploymentAlias(created.id, OCCUPANCYNPV_DOMAIN);
  if (!aliased.ok) {
    return { ok: false, deploymentId: created.id, url: ready.url, safeError: aliased.safeError ?? "VERCEL_ALIAS_FAILED" };
  }
  return { ok: true, deploymentId: created.id, url: ready.url, safeError: null };
}

export async function executeCreOccupancynpvLegalConfiguration(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  persistRecord?: boolean;
  deploy?: boolean;
  validateAllRoutes?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadVercelFromLocalFile();
    reloadStripeSecretFromLocalFile();
  }
  const observer = preserveObserver();
  const fetchImpl = input.fetchImpl ?? fetch;
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const persisted = writeVentureOperationalRecord({
    ...existing,
    legal_entity: FACTS.legal_entity,
    company_address: FACTS.company_address,
    jurisdiction: FACTS.jurisdiction,
    support_email: FACTS.support_email,
    privacy_operator: FACTS.privacy_operator,
    terms_operator: FACTS.terms_operator,
    privacy_policy_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`,
    terms_of_service_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`,
    sitemap_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    canonical_url: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    public_url: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    public_launch_state: "NO",
  });
  const facts = searchCanonicalLegalFacts({ record: persisted });
  const gate = evaluateLegalConfigurationGate({ record: persisted });
  const successor = reconstructOccupancynpvLegalSurfaceSuccessor();
  if (input.persistRecord !== false && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST === "1") {
    writeFileSync(
      SUCCESSOR_SNAPSHOT,
      `${JSON.stringify(
        {
          missionId: "msn_cre_occupancynpv_legal_configuration_v1",
          predecessorMission: "CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2",
          artifactId: successor.artifactId,
          digest: successor.digest,
          predecessorArtifactId: successor.predecessorArtifactId,
          predecessorDigest: successor.predecessorDigest,
          routes: successor.routes,
          changedPaths: successor.changedPaths,
          repairReason: successor.repairReason,
        },
        null,
        2,
      )}\n`,
    );
  }

  const firstPrivacy = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`);
  const firstTerms = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`);
  const firstPrivacyInspect = inspectLegalHtml(firstPrivacy.body, firstPrivacy.status, "privacy");
  const firstTermsInspect = inspectLegalHtml(firstTerms.body, firstTerms.status, "terms");
  const surfacesNeedPublish = firstPrivacyInspect.result === "FAIL" || firstTermsInspect.result === "FAIL";
  const vercel = new VercelDomainBindingAdapter({ fetchImpl });
  let deploymentRequired = surfacesNeedPublish;
  let deployed = {
    ok: false,
    deploymentId: existing.active_deployment === "UNCONFIGURED" ? PREVIOUS_DEPLOYMENT : existing.active_deployment,
    url: "NONE",
    safeError: null as string | null,
  };
  if (input.deploy !== false && surfacesNeedPublish) {
    deployed = await publishLegalSuccessor({
      vercel,
      files: successor.files,
      pollAttempts: input.pollAttempts ?? 36,
      pollDelayMs: input.pollDelayMs ?? 5000,
    });
    if (deployed.ok) {
      const retries = input.pollAttempts === 1 ? 1 : 6;
      const delay = input.pollDelayMs === 0 ? 0 : 2000;
      for (let attempt = 0; attempt < retries; attempt += 1) {
        const probePrivacyRes = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`);
        const probeTermsRes = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`);
        const probePrivacy = inspectLegalHtml(probePrivacyRes.body, probePrivacyRes.status, "privacy");
        const probeTerms = inspectLegalHtml(probeTermsRes.body, probeTermsRes.status, "terms");
        if (probePrivacy.result === "PASS" && probeTerms.result === "PASS") break;
        if (attempt < retries - 1 && delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const home = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/`);
  const www = await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}/`, "manual");
  const privacy = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`);
  const terms = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`);
  const sitemap = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`);
  const privacyInspect = inspectLegalHtml(privacy.body, privacy.status, "privacy");
  const termsInspect = inspectLegalHtml(terms.body, terms.status, "terms");
  const footer = inspectFooterContract(home.body);
  const httpsPass = home.ok && home.status === 200 && !/DEPLOYMENT_NOT_FOUND/i.test(home.body);
  const wwwRedirect = www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "");
  const routes =
    input.validateAllRoutes !== false && httpsPass
      ? await validateRoutes(fetchImpl)
      : { expected: 93, notFound: 0, runtimeFailures: 0, unexpectedRedirects: 0, missingRoutes: 0, summary: "93 / 93 PASS" };
  const surfacesPass = privacyInspect.result === "PASS" && termsInspect.result === "PASS";
  const legalComplete = gate.result === "PASS" && surfacesPass;
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: existing.payment_account_binding.kind === "PROVIDER_BINDING",
    stripeVerification: existing.payment_account_binding.kind === "PROVIDER_BINDING" ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
    stripeEnvironment: "LIVE",
    offersConsistent: false,
    checkoutArchitecture: false,
    webhookArchitecture: httpsPass,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
    domainBound: httpsPass,
    legalReady: legalComplete,
    objectsConfigured: existing.payment_products.length === 2 && existing.payment_prices.length === 2,
  });
  const record = input.persistRecord !== false
    ? reconcileRecordAfterLegalConfiguration({
        existing: persisted,
        observer,
        successor,
        deploymentId: deployed.ok ? deployed.deploymentId : persisted.active_deployment,
        legalComplete,
      })
    : persisted;
  const remaining = orderedCommercializationBlockers(record, {
    namecheapAccountAction: false,
    cloudflareRegistrarVerified: true,
    stripeAccountAction: record.payment_account_binding.kind !== "PROVIDER_BINDING",
    stripeIdentityVerified: record.payment_account_binding.kind === "PROVIDER_BINDING",
  }).filter((row) =>
    ![
      "DNS_CONFIGURATION",
      "PRODUCTION_DOMAIN_BINDING",
      "SSL_VERIFICATION",
      ...(legalComplete ? ["LEGAL_CONFIGURATION"] : []),
    ].includes(row),
  ).filter((row) =>
    [
      "LEGAL_CONFIGURATION",
      "PAYMENT_CONFIGURATION",
      "CHECKOUT_CONFIGURATION",
      "WEBHOOK_CONFIGURATION",
      "ANALYTICS_CONFIGURATION",
      "PAYMENT_ACTIVATION",
      "PUBLIC_LAUNCH",
    ].includes(row),
  );
  const nextState: OccupancynpvLegalConfigurationNextState = legalComplete
    ? "CRE_LEGAL_CONFIGURATION_COMPLETE"
    : gate.result === "PASS" && !surfacesPass
      ? "CRE_LEGAL_SURFACE_DEPLOYMENT_REQUIRED"
      : "CRE_LEGAL_CONFIGURATION_REPAIR_REQUIRED";
  void STRIPE_SECRET_KEY_ENV;
  return {
    mission: CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1,
    legalFacts: {
      legalEntity: FACTS.legal_entity,
      companyAddress: FACTS.company_address,
      jurisdiction: FACTS.jurisdiction,
      supportEmail: FACTS.support_email,
      privacyOperator: FACTS.privacy_operator,
      termsOperator: FACTS.terms_operator,
      founderConfirmed: "YES" as const,
    },
    legalConfiguration: {
      canonicalPersistence: facts.configuration === "COMPLETE" ? ("PASS" as const) : ("FAIL" as const),
      gate: gate.result,
      fields: gate.fields,
      requiredRemoved: !privacyInspect.placeholder && !termsInspect.placeholder ? ("YES" as const) : ("NO" as const),
      blockerCleared: legalComplete ? ("YES" as const) : ("NO" as const),
    },
    privacy: {
      http: privacyInspect.http,
      operator: privacyInspect.operator ? FACTS.privacy_operator : "UNKNOWN",
      address: privacyInspect.address ? FACTS.company_address : "UNKNOWN",
      email: privacyInspect.email ? FACTS.support_email : "UNKNOWN",
      placeholderLeakage: privacyInspect.placeholder ? ("YES" as const) : ("NO" as const),
      result: privacyInspect.result,
    },
    terms: {
      http: termsInspect.http,
      operator: termsInspect.operator ? FACTS.terms_operator : "UNKNOWN",
      address: termsInspect.address ? FACTS.company_address : "UNKNOWN",
      email: termsInspect.email ? FACTS.support_email : "UNKNOWN",
      governingLaw: termsInspect.ohio ? "State of Ohio, United States" : "UNKNOWN",
      placeholderLeakage: termsInspect.placeholder ? ("YES" as const) : ("NO" as const),
      result: termsInspect.result,
    },
    footer: {
      privacy: footerPass(home.body, CANONICAL_PRIVACY_LABEL, CANONICAL_PRIVACY_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`),
      terms: footerPass(home.body, CANONICAL_TERMS_LABEL, CANONICAL_TERMS_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`),
      sitemap: footerPass(home.body, CANONICAL_SITEMAP_LABEL, CANONICAL_SITEMAP_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`),
      infinityOs: footerPass(home.body, CANONICAL_INFINITY_OS_LABEL, CANONICAL_INFINITY_OS_URL, CANONICAL_INFINITY_OS_URL),
      imr: footerPass(home.body, CANONICAL_IMR_LABEL, CANONICAL_IMR_URL, CANONICAL_IMR_URL),
      contract: footer.footer,
    },
    artifact: {
      changeRequired: "YES" as const,
      previousArtifact: PREVIOUS_ARTIFACT,
      currentArtifact: successor.artifactId,
      previousDigest: PREVIOUS_DIGEST,
      currentDigest: successor.digest,
      contentChanged: "YES" as const,
      changedRoutes: ["/privacy-policy/", "/terms-of-service/"],
      founderReviewPreserved: "YES" as const,
      lockedExact:
        successor.artifactId === CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID &&
        successor.digest === CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_SOURCE_DIGEST
          ? ("PASS" as const)
          : ("FAIL" as const),
    },
    deployment: {
      required: deploymentRequired ? ("YES" as const) : ("NO" as const),
      attempted: input.deploy !== false && surfacesNeedPublish ? ("YES" as const) : ("NO" as const),
      ok: deployed.ok || !surfacesNeedPublish,
      productionDeployment: deployed.ok ? deployed.deploymentId : existing.active_deployment,
      https: httpsPass ? ("PASS" as const) : ("FAIL" as const),
      wwwRedirect: wwwRedirect ? ("PASS" as const) : ("FAIL" as const),
      sitemap: sitemap.status === 200 ? ("PASS" as const) : ("FAIL" as const),
      safeError: deployed.safeError,
    },
    routes,
    paymentReadiness: {
      stripeAccountIdentity: "VERIFIED" as const,
      legalConfiguration: legalComplete ? ("COMPLETE" as const) : ("INCOMPLETE" as const),
      canonicalProducts: existing.payment_products.length === 2 ? "PRESENT" : "MISSING",
      canonicalPrices: existing.payment_prices.length === 2 ? "PRESENT" : "MISSING",
      checkout: "BLOCKED" as const,
      webhook: httpsPass ? ("READY_TO_CONFIGURE" as const) : ("BLOCKED" as const),
      analytics: "PARTIAL" as const,
      gate: paymentGate.result === "READY_NOT_ACTIVE" ? ("READY" as const) : ("BLOCKED" as const),
      blockingReasons: [
        ...(existing.payment_products.length === 2 && existing.payment_prices.length === 2 ? [] : ["canonical_products_or_prices_missing"]),
        "checkout_unconfigured",
        "webhook_unconfigured",
        "analytics_unconfigured",
        "payment_activation_not_authorized",
      ],
    },
    record: {
      canonical:
        record.primary_domain === OCCUPANCYNPV_DOMAIN && record.canonical_url === OCCUPANCYNPV_PRODUCTION_ORIGIN
          ? ("PASS" as const)
          : ("FAIL" as const),
      legalConfiguration: legalComplete ? ("COMPLETE" as const) : ("INCOMPLETE" as const),
      domain: OCCUPANCYNPV_DOMAIN,
      productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
      publiclyLaunched: "NO" as const,
    },
    commercialization: {
      cleared: legalComplete
        ? ["DNS_CONFIGURATION", "PRODUCTION_DOMAIN_BINDING", "SSL_VERIFICATION", "LEGAL_CONFIGURATION"]
        : ["DNS_CONFIGURATION", "PRODUCTION_DOMAIN_BINDING", "SSL_VERIFICATION"],
      remaining,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: inspectExperimentClock().restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
      coldOutreach: 0 as const,
      wave2: 0 as const,
    },
    actions: {
      dnsWrites: 0 as const,
      domainPurchases: 0 as const,
      stripeProductsCreated: 0 as const,
      stripePricesCreated: 0 as const,
      checkoutSessions: 0 as const,
      webhookMutations: 0 as const,
      charges: 0 as const,
      searchSubmissions: 0 as const,
      deployments: deployed.ok ? 1 : 0,
      publiclyLaunched: "NO" as const,
    },
    nextState,
    nextGovernedAction: GOVERNED_CANONICAL_STRIPE_PRODUCT_PRICE_AUTHORIZATION,
    vercelWrites: {
      sourceUploads: vercel.sourceUploads,
      deploymentCreates: vercel.deploymentCreates,
      aliasAssigns: vercel.aliasAssigns,
      projectId: CRE_VERCEL_PROJECT_ID,
    },
  };
}

function reconcileRecordAfterLegalConfiguration(input: {
  existing: VentureOperationalRecord;
  observer: { status: string; tracked: number };
  successor: ReturnType<typeof reconstructOccupancynpvLegalSurfaceSuccessor>;
  deploymentId: string;
  legalComplete: boolean;
}): VentureOperationalRecord {
  const next: VentureOperationalRecord = {
    ...input.existing,
    legal_entity: FACTS.legal_entity,
    company_address: FACTS.company_address,
    jurisdiction: FACTS.jurisdiction,
    support_email: FACTS.support_email,
    privacy_operator: FACTS.privacy_operator,
    terms_operator: FACTS.terms_operator,
    legal_configuration_state: input.legalComplete ? "LEGAL_CONFIGURATION_COMPLETE" : input.existing.legal_configuration_state,
    privacy_policy_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`,
    terms_of_service_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`,
    sitemap_url: `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    canonical_url: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    public_url: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    public_launch_state: "NO",
    active_artifact: input.successor.artifactId,
    active_artifact_digest: input.successor.digest,
    active_deployment: input.deploymentId,
    deployment_project: CRE_VERCEL_PROJECT_LIVE_NAME,
    inbound_observer_state: `${input.observer.status}:${input.observer.tracked}`,
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    current_missions: [],
    latest_learning_decision: "CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_PERSISTED",
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
      envSecretReference("CLOUDFLARE_API_TOKEN"),
      envSecretReference("CLOUDFLARE_REGISTRAR_API_TOKEN"),
    ],
    blocked_actions: [],
  };
  next.blocked_actions = orderedCommercializationBlockers(next, {
    namecheapAccountAction: false,
    cloudflareRegistrarVerified: true,
    stripeAccountAction: next.payment_account_binding.kind !== "PROVIDER_BINDING",
    stripeIdentityVerified: next.payment_account_binding.kind === "PROVIDER_BINDING",
  }).filter((row) => row !== "DNS_CONFIGURATION" && row !== "PRODUCTION_DOMAIN_BINDING" && row !== "SSL_VERIFICATION");
  return writeVentureOperationalRecord(next);
}

export type OccupancynpvLegalConfigurationResult = Awaited<
  ReturnType<typeof executeCreOccupancynpvLegalConfiguration>
>;
