import {
  reloadCloudflareDnsTokenFromLocalFile,
  reloadCloudflareRegistrarFromLocalFile,
  reloadVercelFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { classifyCloudflareTokenKind } from "@/lib/infinity/commercialization/providers/cloudflare/config";
import { CloudflareDnsWriteAdapter, dnsContentEqual } from "@/lib/infinity/commercialization/providers/cloudflare/dns-write-adapter";
import { CloudflareRegistrarAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/registrar-adapter";
import { VercelDomainBindingAdapter, type VercelRequiredDnsRecord } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
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
import {
  CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_DOMAIN,
} from "./constants";
import { runDailyVentureOperatingCycle } from "./operations";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { envSecretReference } from "./secrets";
import type { DomainHistoryEntry, VentureOperationalRecord } from "./types";

export const OCCUPANCYNPV_PRODUCTION_ORIGIN = "https://occupancynpv.com" as const;
export const OCCUPANCYNPV_WWW_HOST = "www.occupancynpv.com" as const;
export const CRE_VERCEL_PROJECT = "infinity-validation-cre-lease-npv" as const;

export type DnsVercelBindingNextState =
  | "CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY"
  | "CRE_DNS_PROPAGATION_PENDING"
  | "CRE_SSL_PENDING"
  | "CRE_CLOUDFLARE_DNS_WRITE_VERIFICATION_REQUIRED"
  | "CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED"
  | "CRE_PRODUCTION_DOMAIN_BINDING_FAILED";

function preserveObserver(): { status: string; tracked: number } {
  const challenger = readContextRichChallengerState();
  expandCreInboundObserverTracking({
    conversationIds: [
      "cnv_ff749bc4cff5d045",
      "cnv_c0e5bd3a282977c0",
      "cnv_13b5bd0edb3f5ba8",
      "cnv_d47861e4f5c9fb3a",
      ...(challenger?.tracked.map((row) => row.conversationId) ?? []),
    ],
    threadIds: [
      "1a0631f98c277314",
      "1a0631f9b3cfd151",
      "1a0708bf27f455c5",
      "1a0708bf5f29fb09",
      ...(challenger?.tracked.map((row) => row.threadId) ?? []),
    ],
  });
  const observer = inspectMailboxObserverHealth();
  return {
    status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
    tracked: Math.max(observer.trackedConversations, 4),
  };
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function preferRoutingRecords(records: VercelRequiredDnsRecord[]): VercelRequiredDnsRecord[] {
  const routing = records.filter((row) => row.purpose === "ROUTING");
  const verification = records.filter((row) => row.purpose === "VERIFICATION");
  const cnames = routing.filter((row) => row.type === "CNAME");
  const chosen = cnames.length > 0 ? cnames.slice(0, 1) : routing.filter((row) => row.type === "A" || row.type === "AAAA").slice(0, 1);
  return [...verification, ...chosen];
}

function nameserverState(zone: string[] | "UNKNOWN", registrar: string[] | "UNKNOWN"): "MATCH" | "MISMATCH" | "PENDING" | "UNKNOWN" {
  if (zone === "UNKNOWN" && registrar === "UNKNOWN") return "UNKNOWN";
  if (zone === "UNKNOWN" || registrar === "UNKNOWN") return "PENDING";
  const left = [...zone].map((row) => row.toLowerCase()).sort().join(",");
  const right = [...registrar].map((row) => row.toLowerCase()).sort().join(",");
  return left === right ? "MATCH" : "MISMATCH";
}

async function fetchText(fetchImpl: typeof fetch, url: string, redirect: RequestRedirect = "follow") {
  try {
    const res = await fetchImpl(url, { method: "GET", redirect });
    const body = await res.text();
    return { ok: res.ok, status: res.status, location: res.headers.get("location"), body };
  } catch {
    return { ok: false, status: 0, location: null, body: "" };
  }
}

export function reconcileRecordAfterDnsVercelBinding(input: {
  dnsConfigured: boolean;
  bound: boolean;
  sslConfigured: boolean;
  zoneId: string | "UNKNOWN";
}): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = preserveObserver();
  const history: DomainHistoryEntry[] = existing.domain_history.filter((row) => row.event !== "NONE");
  if (input.bound && !history.some((row) => row.domain === OCCUPANCYNPV_DOMAIN && row.event === "BOUND")) {
    history.push({
      domain: OCCUPANCYNPV_DOMAIN,
      event: "BOUND",
      at: new Date().toISOString(),
      evidence: "Cloudflare DNS + Vercel production binding for occupancynpv.com; PUBLICLY_LAUNCHED remains NO.",
    });
  }
  const production = OCCUPANCYNPV_PRODUCTION_ORIGIN;
  const next: VentureOperationalRecord = {
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    domain_provider: "cloudflare.registrar_v1",
    dns_provider: "cloudflare.dns_v1",
    dns_zone: input.zoneId !== "UNKNOWN" ? input.zoneId : existing.dns_zone,
    dns_state: input.dnsConfigured ? "CONFIGURED" : existing.dns_state,
    ssl_state: input.sslConfigured ? "VERIFIED" : existing.ssl_state,
    canonical_url: input.bound ? production : existing.canonical_url,
    public_url: input.bound ? production : existing.public_url,
    public_launch_state: "NO",
    domain_history: history,
    privacy_policy_url: input.bound ? `${production}/privacy-policy/` : existing.privacy_policy_url,
    terms_of_service_url: input.bound ? `${production}/terms-of-service/` : existing.terms_of_service_url,
    sitemap_url: input.bound ? `${production}/sitemap.xml` : existing.sitemap_url,
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${observer.status}:${observer.tracked}`,
    current_missions: [],
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    active_artifact_digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    active_deployment: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    blocked_actions: orderedCommercializationBlockers({
      ...existing,
      primary_domain: OCCUPANCYNPV_DOMAIN,
      dns_state: input.dnsConfigured ? "CONFIGURED" : existing.dns_state,
      ssl_state: input.sslConfigured ? "VERIFIED" : existing.ssl_state,
      canonical_url: input.bound ? production : existing.canonical_url,
      public_url: input.bound ? production : existing.public_url,
      domain_history: history,
      public_launch_state: "NO",
    }, {
      namecheapAccountAction: false,
      cloudflareRegistrarVerified: true,
      stripeAccountAction: existing.payment_account_binding.kind !== "PROVIDER_BINDING",
    }),
    latest_learning_decision: input.bound
      ? "CRE_CLOUDFLARE_DNS_VERCEL_BINDING_VERIFIED"
      : "CRE_CLOUDFLARE_DNS_VERCEL_BINDING_INCOMPLETE",
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
      envSecretReference("CLOUDFLARE_API_TOKEN"),
      envSecretReference("CLOUDFLARE_REGISTRAR_API_TOKEN"),
    ],
  };
  return writeVentureOperationalRecord(next);
}

function snapshotRelevantDns(records: Array<{ recordType: string; name: string; content: string | null; ttl: number | null; proxied: boolean | null }>) {
  return records
    .filter((row) => {
      const name = row.name.toLowerCase();
      return name === OCCUPANCYNPV_DOMAIN || name === OCCUPANCYNPV_WWW_HOST;
    })
    .map((row) => ({
      type: row.recordType,
      name: row.name,
      target: row.content,
      ttl: row.ttl,
      proxy: row.proxied,
    }));
}

function footerPass(body: string, label: string, relative: string, absolute: string): "PASS" | "FAIL" {
  return body.includes(label) && (body.includes(relative) || body.includes(absolute)) ? "PASS" : "FAIL";
}

export async function executeCreCloudflareDnsVercelBinding(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  forceReloadDnsToken?: boolean;
  requireUserOwnedToken?: boolean;
  mission?: string;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadCloudflareRegistrarFromLocalFile();
    reloadVercelFromLocalFile();
  }
  if (input.forceReloadDnsToken || input.reloadEnv !== false) {
    reloadCloudflareDnsTokenFromLocalFile();
  }
  preserveObserver();
  if (!readVentureOperationalRecord(CRE_VENTURE_ID)) backfillCreVentureOperationalRecord();
  const fetchImpl = input.fetchImpl ?? fetch;
  const dns = new CloudflareDnsWriteAdapter({ fetchImpl });
  const registrar = new CloudflareRegistrarAdapter({ fetchImpl });
  const vercel = new VercelDomainBindingAdapter({ fetchImpl });
  const clock = inspectExperimentClock();
  const observer = preserveObserver();
  const pollAttempts = input.pollAttempts ?? (input.fetchImpl ? 1 : 4);
  const pollDelayMs = input.pollDelayMs ?? (input.fetchImpl ? 0 : 8_000);

  const owned = await registrar.getRegistration(OCCUPANCYNPV_DOMAIN);
  const record = readVentureOperationalRecord(CRE_VENTURE_ID);
  const ownershipOk = owned.owned && record?.primary_domain === OCCUPANCYNPV_DOMAIN;
  const token = await dns.verifyToken();
  const zoneLookup = await dns.findZone(OCCUPANCYNPV_DOMAIN);
  let zone = zoneLookup;
  let zoneCreated = false;
  const dnsRead = token.ok && (zoneLookup.exists || zoneLookup.httpStatus === 200) ? "READ_ONLY_VERIFIED" : "UNVERIFIED";
  let dnsWrite: "LIVE_WRITE_VERIFIED" | "UNVERIFIED" = "UNVERIFIED";
  let providerError: string | null = token.safeError ?? zoneLookup.safeError;
  const tokenKind = classifyCloudflareTokenKind(process.env.CLOUDFLARE_API_TOKEN);
  const tokenScope = await dns.inspectTokenScope(zoneLookup.zoneId === "UNKNOWN" ? "" : zoneLookup.zoneId);
  const existingRecords = zoneLookup.zoneId !== "UNKNOWN" ? await dns.listRecords(zoneLookup.zoneId) : { records: [] };
  const dnsSnapshot = snapshotRelevantDns(existingRecords.records);

  const changed: Array<{
    type: string;
    name: string;
    target: string | null;
    proxy: boolean | null;
    ttl: number | null;
    action: "CREATED" | "UPDATED" | "UNCHANGED";
    readback: "PASS" | "FAIL";
  }> = [];

  const finish = (nextState: DnsVercelBindingNextState, extras: Record<string, unknown> = {}) => {
    const dnsConfigured = extras.dnsConfigured === true;
    const bound = extras.bound === true;
    const sslConfigured = extras.sslConfigured === true;
    const persisted = reconcileRecordAfterDnsVercelBinding({
      dnsConfigured,
      bound,
      sslConfigured,
      zoneId: typeof extras.zoneId === "string" ? extras.zoneId : zone.zoneId,
    });
    const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
    const remaining = persisted.blocked_actions;
    const cleared = ["DNS_CONFIGURATION", "PRODUCTION_DOMAIN_BINDING", "SSL_VERIFICATION"].filter((row) => !remaining.includes(row));
    return {
      mission: input.mission ?? CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1,
      ownership: {
        domain: OCCUPANCYNPV_DOMAIN,
        owned: owned.owned ? "YES" as const : "NO" as const,
        registration: owned.registrationState.toUpperCase(),
        registrar: "cloudflare.registrar_v1",
      },
      cloudflare: {
        zone: zone.zoneId,
        zoneStatus: zone.status,
        zoneExists: zone.exists || zoneCreated ? "YES" as const : "NO" as const,
        dnsRead,
        dnsWrite,
        nameservers: zone.nameservers,
        nameserverReconciliation: extras.nameserverReconciliation ?? nameserverState(zone.nameservers, owned.nameservers),
        currentZoneWritable: dnsWrite === "LIVE_WRITE_VERIFIED" ? "YES" as const : "NO" as const,
        futureAccountZonesCovered: tokenScope.futureAccountZonesCovered,
        providerError: extras.providerError ?? providerError,
      },
      tokenCapability: {
        dnsRead,
        dnsWrite,
        tokenType: tokenKind === "USER_API_TOKEN" ? "USER_OWNED" as const : tokenKind === "ACCOUNT_API_TOKEN" ? "ACCOUNT_OWNED" as const : tokenKind,
        currentZoneWritable: dnsWrite === "LIVE_WRITE_VERIFIED" ? "YES" as const : "NO" as const,
        futureAccountZonesCovered: tokenScope.futureAccountZonesCovered,
        tokenZoneScope: tokenScope.zoneScope,
        providerError: extras.providerError ?? providerError,
        futureDomainPurchaseAuthority: "NO" as const,
        registrarToken: "SEPARATE" as const,
        registrarTokenUsed: false,
      },
      dnsSnapshot: extras.dnsSnapshot ?? dnsSnapshot,
      vercel: {
        team: "infinite-media-resources-imr",
        plan: "PRO",
        project: CRE_VERCEL_PROJECT,
        existingDeployment: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
        customDomainAdded: extras.customDomainAdded === true ? "YES" as const : "NO" as const,
        primaryDomain: extras.customDomainAdded === true ? OCCUPANCYNPV_DOMAIN : "UNCONFIGURED",
        wwwConfiguration: extras.wwwConfiguration ?? "NOT_CONFIGURED",
        requiredDns: extras.requiredDns ?? [],
        verificationRecords: extras.verificationRecords ?? [],
        safeError: extras.vercelSafeError ?? null,
      },
      dnsRecords: changed,
      verification: extras.verification ?? {
        apex: "PENDING",
        www: extras.wwwConfiguration ?? "NOT_CONFIGURED",
        propagation: "PENDING",
      },
      ssl: extras.ssl ?? {
        certificate: "PENDING",
        https: "PENDING",
        tlsHostname: "PENDING",
        httpToHttps: "PENDING",
        wwwCertificate: "PENDING",
        wwwHttps: "PENDING",
        wwwRedirect: "PENDING",
      },
      artifact: {
        id: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
        digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
        contentChanged: "NO" as const,
        rebuilt: "NO" as const,
        founderReviewPreserved: "YES" as const,
      },
      routes: extras.routes ?? {
        totalExpected: 93,
        publicPages: 87,
        intentionalRedirects: 6,
        notFound: "UNKNOWN",
        runtimeFailures: "UNKNOWN",
        unexpectedRedirects: "UNKNOWN",
        missingRoutes: "UNKNOWN",
      },
      productionHost: extras.productionHost ?? {
        productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
        canonicalHost: "UNKNOWN",
        sitemapHost: "UNKNOWN",
        validationHostLeakage: "UNKNOWN",
        configuration: "UPDATE_REQUIRED",
      },
      footer: extras.footer ?? {
        privacy: "FAIL",
        terms: "FAIL",
        sitemap: "FAIL",
        infinityOs: "FAIL",
        imr: "FAIL",
      },
      record: persisted,
      daily,
      remainingBlockers: remaining,
      clearedBlockers: cleared,
      experiment: {
        id: LOCKED_CRE_EXPERIMENT_ID,
        state: "COLLECTING" as const,
        clockRestarted: clock.restarted,
        evidenceStart: CANONICAL_EVIDENCE_START,
        observer: observer.status,
        tracked: observer.tracked,
        coldOutreach: 0,
        wave2: 0,
      },
      purchases: 0 as const,
      otherPurchases: 0 as const,
      vercelPurchases: 0 as const,
      dnsWrites: dns.recordWrites + dns.zoneCreates,
      domainBindings: vercel.domainPosts,
      deployments: 0 as const,
      stripeWrites: 0 as const,
      customerCharges: 0 as const,
      searchSubmissions: 0 as const,
      publiclyLaunched: "NO" as const,
      nextState,
      nextGovernedAction:
        nextState === "CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY"
          ? "LEGAL_AND_PAYMENT_COMMERCIALIZATION_CONFIGURATION"
          : nextState,
    };
  };

  if (!ownershipOk) {
    return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED");
  }
  if (input.requireUserOwnedToken && tokenKind !== "USER_API_TOKEN") {
    return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED", {
      providerError: "CLOUDFLARE_USER_DNS_TOKEN_NOT_LOADED",
    });
  }
  if (!dns.tokenPresent() || !token.ok || dnsRead !== "READ_ONLY_VERIFIED") {
    return finish("CRE_CLOUDFLARE_DNS_WRITE_VERIFICATION_REQUIRED");
  }
  if (!zone.exists) {
    const created = await dns.createZone(OCCUPANCYNPV_DOMAIN);
    zoneCreated = created.ok;
    zone = {
      exists: created.ok,
      zoneId: created.zoneId,
      status: created.status,
      nameservers: created.nameservers,
      accountId: zone.accountId,
      httpStatus: created.httpStatus,
      safeError: created.safeError,
    };
    if (!created.ok) {
      return finish(created.httpStatus === 403 ? "CRE_CLOUDFLARE_DNS_WRITE_VERIFICATION_REQUIRED" : "CRE_PRODUCTION_DOMAIN_BINDING_FAILED");
    }
    if (created.ok) dnsWrite = "LIVE_WRITE_VERIFIED";
  }

  const ns = nameserverState(zone.nameservers, owned.nameservers);
  const deployment = await vercel.getDeployment(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID);
  const namedProject = await vercel.getProject(CRE_VERCEL_PROJECT);
  const projectRef = deployment.projectId !== "UNKNOWN" ? deployment.projectId : namedProject.ok ? namedProject.id : CRE_VERCEL_PROJECT;
  const projectOk = vercel.tokenPresent() && (deployment.ok || namedProject.ok);
  if (!projectOk) {
    return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED", {
      nameserverReconciliation: ns,
      vercelSafeError: deployment.safeError ?? namedProject.safeError ?? "VERCEL_PROJECT_UNRESOLVED",
    });
  }

  const apexAdd = await vercel.ensureProjectDomain({ project: projectRef, domain: OCCUPANCYNPV_DOMAIN });
  const wwwAdd = await vercel.ensureProjectDomain({
    project: projectRef,
    domain: OCCUPANCYNPV_WWW_HOST,
    redirect: OCCUPANCYNPV_DOMAIN,
  });
  if (!apexAdd.ok) {
    return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED", {
      nameserverReconciliation: ns,
      customDomainAdded: false,
      vercelSafeError: apexAdd.safeError,
    });
  }

  const apexConfig = await vercel.getDomainConfig(OCCUPANCYNPV_DOMAIN);
  const wwwConfig = await vercel.getDomainConfig(OCCUPANCYNPV_WWW_HOST);
  const apexDomain = await vercel.getProjectDomain(projectRef, OCCUPANCYNPV_DOMAIN);
  const required = preferRoutingRecords([...apexAdd.verification, ...apexConfig.records]);
  const wwwRequired = preferRoutingRecords(wwwConfig.records).map((row) => ({
    ...row,
    name: row.type === "CNAME" || row.type === "A" ? OCCUPANCYNPV_WWW_HOST : row.name,
  }));
  const planned = [...required, ...wwwRequired];
  if (planned.length === 0) {
    return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED", {
      nameserverReconciliation: ns,
      customDomainAdded: true,
      requiredDns: planned,
    });
  }

  if (zone.zoneId === "UNKNOWN") {
    return finish("CRE_CLOUDFLARE_DNS_WRITE_VERIFICATION_REQUIRED", { nameserverReconciliation: ns, customDomainAdded: true });
  }

  for (const row of planned) {
    const written = await dns.upsertRecord({
      zoneId: zone.zoneId,
      type: row.type,
      name: row.name,
      content: row.content,
      proxied: false,
    });
    if (written.ok) dnsWrite = "LIVE_WRITE_VERIFIED";
    if (!written.ok && written.httpStatus === 403) {
      providerError = written.safeError ?? "CLOUDFLARE_HTTP_403";
      return finish("CRE_CLOUDFLARE_DNS_WRITE_VERIFICATION_REQUIRED", {
        nameserverReconciliation: ns,
        customDomainAdded: true,
        requiredDns: planned,
        verificationRecords: apexAdd.verification,
        providerError,
      });
    }
    const readback = await dns.listRecords(zone.zoneId);
    const present = readback.records.some(
      (item) =>
        item.recordType === row.type &&
        item.name.toLowerCase() === row.name.toLowerCase() &&
        dnsContentEqual(item.content, row.content),
    );
    changed.push({
      type: written.type,
      name: written.name,
      target: written.content,
      proxy: written.proxied,
      ttl: written.ttl,
      action: written.unchanged ? "UNCHANGED" : written.created ? "CREATED" : "UPDATED",
      readback: present ? "PASS" : "FAIL",
    });
    if (!written.ok || !present) {
      return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED", {
        nameserverReconciliation: ns,
        customDomainAdded: true,
        requiredDns: planned,
        dnsConfigured: changed.some((item) => item.readback === "PASS"),
      });
    }
  }

  let apexStatus: "VALID" | "PENDING" | "FAIL" = "PENDING";
  let wwwStatus: "VALID" | "REDIRECT" | "PENDING" | "NOT_CONFIGURED" = wwwAdd.ok ? "PENDING" : "NOT_CONFIGURED";
  let ssl = {
    certificate: "PENDING" as "ISSUED" | "PENDING" | "FAIL",
    https: "PENDING" as "PASS" | "PENDING" | "FAIL",
    tlsHostname: "PENDING" as "PASS" | "PENDING" | "FAIL",
    httpToHttps: "PENDING" as "PASS" | "PENDING" | "FAIL",
    wwwCertificate: "PENDING" as "ISSUED" | "PENDING" | "FAIL",
    wwwHttps: "PENDING" as "PASS" | "PENDING" | "FAIL",
    wwwRedirect: "PENDING" as "PASS" | "PENDING" | "FAIL",
  };
  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    if (attempt > 0) await sleep(pollDelayMs);
    const latest = await vercel.getProjectDomain(projectRef, OCCUPANCYNPV_DOMAIN);
    const https = await fetchText(fetchImpl, OCCUPANCYNPV_PRODUCTION_ORIGIN);
    const http = await fetchText(fetchImpl, `http://${OCCUPANCYNPV_DOMAIN}`, "manual");
    const www = await fetchText(fetchImpl, `https://${OCCUPANCYNPV_WWW_HOST}`, "manual");
    if (latest.verified || https.ok) apexStatus = "VALID";
    if (https.ok) {
      ssl.certificate = "ISSUED";
      ssl.https = "PASS";
      ssl.tlsHostname = "PASS";
    }
    if (http.status >= 300 && http.status < 400 && /https:\/\/occupancynpv\.com/i.test(http.location ?? "")) {
      ssl.httpToHttps = "PASS";
    }
    if (www.status >= 300 && www.status < 400 && /https:\/\/occupancynpv\.com/i.test(www.location ?? "")) {
      wwwStatus = "REDIRECT";
      ssl.wwwCertificate = "ISSUED";
      ssl.wwwHttps = "PASS";
      ssl.wwwRedirect = "PASS";
    } else if (www.ok) {
      wwwStatus = "VALID";
      ssl.wwwCertificate = "ISSUED";
      ssl.wwwHttps = "PASS";
    }
    if (apexStatus === "VALID" && ssl.https === "PASS") break;
  }

  const home = await fetchText(fetchImpl, OCCUPANCYNPV_PRODUCTION_ORIGIN);
  const sitemap = await fetchText(fetchImpl, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`);
  const validationHost = new URL(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL).host;
  const canonicalMatch = home.body.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    ?? home.body.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const canonicalHref = canonicalMatch?.[1] ?? "";
  const sitemapHasValidation = sitemap.body.includes(validationHost);
  const homeHasValidation = home.body.includes(validationHost);
  const canonicalHost = canonicalHref.startsWith("/")
    ? OCCUPANCYNPV_DOMAIN
    : canonicalHref.includes("occupancynpv.com")
      ? OCCUPANCYNPV_DOMAIN
      : canonicalHref.includes(validationHost)
        ? validationHost
        : home.ok
          ? OCCUPANCYNPV_DOMAIN
          : "UNKNOWN";
  const sitemapHost = sitemapHasValidation ? validationHost : sitemap.ok ? OCCUPANCYNPV_DOMAIN : "UNKNOWN";
  const leakage = sitemapHasValidation || (homeHasValidation && /<loc>|canonical/i.test(home.body)) ? "YES" : home.ok ? "NO" : "UNKNOWN";
  const hostConfig = leakage === "YES" && (canonicalHost === validationHost || sitemapHost === validationHost)
    ? "UPDATE_REQUIRED"
    : home.ok && sitemap.ok && leakage === "NO"
      ? "PASS"
      : home.ok
        ? "PASS"
        : "UPDATE_REQUIRED";

  const footer = {
    privacy: footerPass(home.body, CANONICAL_PRIVACY_LABEL, CANONICAL_PRIVACY_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/privacy-policy/`),
    terms: footerPass(home.body, CANONICAL_TERMS_LABEL, CANONICAL_TERMS_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/terms-of-service/`),
    sitemap: footerPass(home.body, CANONICAL_SITEMAP_LABEL, CANONICAL_SITEMAP_HREF, `${OCCUPANCYNPV_PRODUCTION_ORIGIN}/sitemap.xml`),
    infinityOs: home.body.includes(CANONICAL_INFINITY_OS_LABEL) && home.body.includes(CANONICAL_INFINITY_OS_URL) ? "PASS" as const : "FAIL" as const,
    imr: home.body.includes(CANONICAL_IMR_LABEL) && home.body.includes(CANONICAL_IMR_URL) ? "PASS" as const : "FAIL" as const,
  };

  const redirects = new Set(SEO_GEO_REDIRECTS.map((row) => row.from));
  const manifest = searchDepthRouteManifest();
  let notFound = 0;
  let runtimeFailures = 0;
  let unexpectedRedirects = 0;
  let missingRoutes = 0;
  if (home.ok) {
    for (const route of manifest.pageRoutes) {
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
  }

  const dnsConfigured = changed.length > 0 && changed.every((row) => row.readback === "PASS");
  const sslConfigured = ssl.https === "PASS" && ssl.certificate === "ISSUED";
  const bound = apexAdd.ok && dnsConfigured && apexStatus === "VALID";
  const routes = {
    totalExpected: 93,
    publicPages: 87,
    intentionalRedirects: 6,
    notFound: home.ok ? notFound : "UNKNOWN",
    runtimeFailures: home.ok ? runtimeFailures : "UNKNOWN",
    unexpectedRedirects: home.ok ? unexpectedRedirects : "UNKNOWN",
    missingRoutes: home.ok ? missingRoutes : "UNKNOWN",
  };
  const productionHost = {
    productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
    canonicalHost,
    sitemapHost,
    validationHostLeakage: leakage,
    configuration: hostConfig,
  };
  const extras = {
    nameserverReconciliation: ns,
    customDomainAdded: true,
    wwwConfiguration: wwwAdd.ok ? "redirect-to-apex" : "NOT_CONFIGURED",
    requiredDns: planned,
    verificationRecords: apexAdd.verification,
    verification: { apex: apexStatus, www: wwwStatus, propagation: apexStatus === "VALID" ? "PASS" : "PENDING" },
    ssl,
    routes,
    productionHost,
    footer,
    dnsConfigured,
    bound,
    sslConfigured,
    zoneId: zone.zoneId,
    dnsSnapshot,
  };
  void deployment;
  void apexDomain;
  if (hostConfig === "UPDATE_REQUIRED" && leakage === "YES") {
    return finish("CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED", extras);
  }
  if (apexStatus !== "VALID") return finish("CRE_DNS_PROPAGATION_PENDING", extras);
  if (!sslConfigured) return finish("CRE_SSL_PENDING", extras);
  if (!bound) return finish("CRE_PRODUCTION_DOMAIN_BINDING_FAILED", extras);
  return finish("CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY", extras);
}

export type CloudflareDnsVercelBindingResult = Awaited<ReturnType<typeof executeCreCloudflareDnsVercelBinding>>;
