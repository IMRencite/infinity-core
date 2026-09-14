import { buildProviderInventory } from "@/lib/infinity/commercialization/probes/inventory";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { projectPortfolioActualEconomics } from "@/lib/infinity/financial-truth/portfolio-actual-economics";
import { CRE_VENTURE_ID, OCCUPANCYNPV_DOMAIN } from "@/lib/infinity/venture-operating-scale/constants";
import { readOccupancynpvDurableAuthority } from "@/lib/infinity/venture-operating-scale/occupancynpv-durable-authority";
import { occupancynpvPaymentActivationEnabled } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched, readOccupancynpvPublicLaunchEvidence } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { readOccupancynpvProductionEvidence } from "@/lib/infinity/venture-operating-scale/occupancynpv-production-evidence";
import { listVentureOperationalRecords } from "@/lib/infinity/venture-operating-scale/persist";
import { projectCodingCapability } from "./coding";
import {
  CANONICAL_CAPABILITY_PROJECTION,
  CAPABILITY_IDS,
  type CapabilityId,
  type CapabilityRecord,
  type CapabilityScope,
  type CapabilityValue,
  type CanonicalCapabilityProjection,
} from "./types";

const DEFAULT_STALE_MS = 6 * 60 * 60 * 1000;
const COMMUNICATION_STALE_MS = 6 * 60 * 60 * 1000;

function hostProvider(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  const host = hostname.toLowerCase();
  if (host.endsWith("vercel.app") || host === "vercel.com") return "Vercel";
  if (host.endsWith("netlify.app") || host === "netlify.com") return "Netlify";
  if (host.includes("cloudflare")) return "Cloudflare";
  return null;
}

function hostnameOf(url: string | null | undefined): string | null {
  if (!url || url === "UNCONFIGURED") return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function displayProviderToken(value: string | null | undefined): string | null {
  if (!value || value === "UNCONFIGURED") return null;
  if (value.toLowerCase() === "vercel") return "Vercel";
  if (value.toLowerCase() === "stripe") return "Stripe";
  if (value.toLowerCase().includes("cloudflare")) return "Cloudflare";
  if (value.toLowerCase().includes("namecheap")) return "Namecheap";
  return value;
}

function freshness(lastVerifiedAt: string | null, thresholdMs: number, nowMs: number): CapabilityRecord["freshness"] {
  if (!lastVerifiedAt) return "UNKNOWN";
  const at = Date.parse(lastVerifiedAt);
  if (!Number.isFinite(at)) return "UNKNOWN";
  return nowMs - at > thresholdMs ? "STALE" : "CURRENT";
}

function record(input: Omit<CapabilityRecord, "capability_type">): CapabilityRecord {
  return { ...input, capability_type: input.capability_id };
}

export function projectCanonicalCapabilities(now = new Date().toISOString()): CanonicalCapabilityProjection {
  const nowMs = Date.parse(now);
  const inventory = buildProviderInventory();
  const records = listVentureOperationalRecords();
  const cre = records.find((row) => row.venture_id === CRE_VENTURE_ID) ?? null;
  const authority = readOccupancynpvDurableAuthority();
  const launch = readOccupancynpvPublicLaunchEvidence();
  const production = readOccupancynpvProductionEvidence();
  const observer = inspectMailboxObserverHealth();
  const coding = projectCodingCapability(now);
  const launched = occupancynpvPubliclyLaunched() || authority?.publicly_launched === "YES";
  const paymentActivated = occupancynpvPaymentActivationEnabled() || authority?.payment_activation === "YES";
  const domainKnown = Boolean(launch?.production_url || (launched && authority?.domain) || (launched && OCCUPANCYNPV_DOMAIN));
  const runtimeUrl = process.env.INFINITY_RUNTIME_URL?.trim() || process.env.HQ_PRODUCTION_RUNTIME_URL?.trim() || null;
  const runtimeHost = hostnameOf(runtimeUrl);
  const ventureHost = hostnameOf(launch?.production_url ?? cre?.active_deployment_url ?? null);
  const hostingProvider =
    hostProvider(runtimeHost) ??
    hostProvider(ventureHost) ??
    displayProviderToken(cre?.deployment_provider) ??
    (inventory.hosting.configured === "CONFIGURED" ? inventory.hosting.providerName : null);
  const hostingExists = Boolean(hostingProvider || cre?.deployment_state?.includes("DEPLOYED") || launched);
  const stripeKnown = Boolean(
    paymentActivated ||
      (cre?.payment_provider === "stripe" && cre.payment_products.length > 0) ||
      inventory.payments.configured === "CONFIGURED",
  );
  const registrarProvider =
    displayProviderToken(cre?.domain_provider) ??
    (inventory.registrar.configured === "CONFIGURED" ? inventory.registrar.providerName : null);
  const dnsProvider =
    displayProviderToken(cre?.dns_provider) ??
    (inventory.dns.configured === "CONFIGURED" ? inventory.dns.providerName : null);
  const registrarConnected = inventory.registrar.configured === "CONFIGURED";
  const dnsConnected = inventory.dns.configured === "CONFIGURED";
  const hostingConnected = inventory.hosting.configured === "CONFIGURED" || hostingExists;
  const observerAge = freshness(observer.lastSuccessfulObservation, COMMUNICATION_STALE_MS, nowMs);
  const emailValue: CapabilityValue =
    observer.status === "DEGRADED"
      ? observerAge === "STALE"
        ? "STALE"
        : "DEGRADED"
      : observer.status === "RUNNING"
        ? "CONNECTED"
        : observer.status === "STOPPED"
          ? "PRESENT_IDLE"
          : "UNKNOWN";

  const capabilities: CapabilityRecord[] = [
    record({
      capability_id: "CODING",
      provider: "Cursor + Infinity Native Coder",
      provider_account_reference: null,
      scope: "HQ",
      value: coding.external_implementation_agent.value,
      configured: true,
      connected: coding.connector_status === "CONNECTED",
      available: true,
      read_capability: true,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: "VERIFIED",
      verification_source: coding.external_implementation_agent.source,
      last_verified_at: coding.external_implementation_agent.last_activity_at ?? now,
      staleness_threshold_ms: 15_000,
      freshness: "CURRENT",
      error_state: null,
      metadata: {
        native_coder: coding.native_coder.value,
        external_implementation_agent: coding.external_implementation_agent.value,
        connector_status: coding.connector_status,
        current_coding_runs: coding.current_coding_runs,
      },
    }),
    record({
      capability_id: "DOMAIN_REGISTRAR",
      provider: registrarProvider,
      provider_account_reference: domainKnown ? OCCUPANCYNPV_DOMAIN : null,
      scope: domainKnown ? "VENTURE" : "PORTFOLIO",
      value: registrarConnected ? "CONNECTED" : domainKnown ? "KNOWN_EXTERNAL" : inventory.registrar.configured === "NOT_CONFIGURED" ? "NOT_CONNECTED" : "UNKNOWN",
      configured: domainKnown || registrarConnected,
      connected: registrarConnected,
      available: domainKnown || registrarConnected,
      read_capability: registrarConnected,
      write_capability: false,
      mutation_authority: "LOCKED",
      verification_status: domainKnown ? "VERIFIED" : "UNVERIFIED",
      verification_source: domainKnown ? "occupancynpv_public_launch_or_authority" : "provider_inventory",
      last_verified_at: launch?.launched_at ?? now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: { domain: domainKnown ? OCCUPANCYNPV_DOMAIN : null },
    }),
    record({
      capability_id: "DNS",
      provider: dnsProvider,
      provider_account_reference: domainKnown ? OCCUPANCYNPV_DOMAIN : null,
      scope: domainKnown ? "VENTURE" : "PORTFOLIO",
      value: dnsConnected ? "CONNECTED" : domainKnown ? "CONFIGURED" : "UNKNOWN",
      configured: domainKnown || dnsConnected,
      connected: dnsConnected,
      available: domainKnown || dnsConnected,
      read_capability: dnsConnected || domainKnown,
      write_capability: false,
      mutation_authority: dnsConnected ? "GOVERNED" : "NOT_CONNECTED",
      verification_status: domainKnown ? "VERIFIED" : "UNVERIFIED",
      verification_source: domainKnown ? "occupancynpv_production_domain" : "provider_inventory",
      last_verified_at: launch?.launched_at ?? now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: { mutation_available: dnsConnected },
    }),
    record({
      capability_id: "HOSTING",
      provider: hostingProvider,
      provider_account_reference: runtimeHost ?? ventureHost,
      scope: hostingProvider && runtimeHost ? "INFINITY_RUNTIME" : "PROJECT",
      value: hostingExists ? (inventory.hosting.configured === "CONFIGURED" ? "CONNECTED" : "CONFIGURED") : "UNKNOWN",
      configured: hostingExists,
      connected: inventory.hosting.configured === "CONFIGURED" || hostingExists,
      available: hostingExists,
      read_capability: hostingExists,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: hostingExists ? "VERIFIED" : "UNKNOWN",
      verification_source: hostingExists ? "deployment_and_runtime_url" : "provider_inventory",
      last_verified_at: now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {
        runtime_url: runtimeUrl,
        venture_url: launch?.production_url ?? null,
      },
    }),
    record({
      capability_id: "PAYMENTS",
      provider: stripeKnown ? "Stripe" : inventory.payments.configured === "CONFIGURED" ? inventory.payments.providerName : null,
      provider_account_reference: stripeKnown && paymentActivated ? "shared_parent_stripe" : null,
      scope: "PARENT_IMR",
      value: stripeKnown ? "LIVE" : inventory.payments.configured === "NOT_CONFIGURED" ? "NOT_CONNECTED" : "UNKNOWN",
      configured: stripeKnown,
      connected: stripeKnown,
      available: stripeKnown,
      read_capability: stripeKnown,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: stripeKnown ? "VERIFIED" : "UNKNOWN",
      verification_source: paymentActivated ? "occupancynpv_payment_activation" : "stripe_account_binding",
      last_verified_at: now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {
        occupancynpv_activation: paymentActivated ? "YES" : "NO",
        askreview_activation: "NO",
      },
    }),
    record({
      capability_id: "TREASURY",
      provider: "Mercury",
      provider_account_reference: null,
      scope: "PARENT_IMR",
      value: "AVAILABLE",
      configured: true,
      connected: null,
      available: true,
      read_capability: true,
      write_capability: false,
      mutation_authority: "LOCKED",
      verification_status: "VERIFIED",
      verification_source: "financial_truth_mercury",
      last_verified_at: now,
      staleness_threshold_ms: 15 * 60 * 1000,
      freshness: "CURRENT",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "EMAIL",
      provider: observer.provider,
      provider_account_reference: null,
      scope: "PORTFOLIO",
      value: emailValue,
      configured: true,
      connected: observer.status === "RUNNING",
      available: observer.status !== "STOPPED",
      read_capability: observer.status === "RUNNING",
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: observerAge === "STALE" ? "STALE" : observer.status === "DEGRADED" ? "UNVERIFIED" : "VERIFIED",
      verification_source: "mailbox_observer",
      last_verified_at: observer.lastSuccessfulObservation,
      staleness_threshold_ms: COMMUNICATION_STALE_MS,
      freshness: observerAge,
      error_state: observer.lastProviderError,
      metadata: { observer_status: observer.status },
    }),
    record({
      capability_id: "DEPLOYMENT",
      provider: hostingProvider,
      provider_account_reference: cre?.active_deployment ?? production?.deployment_id ?? null,
      scope: "DEPLOYMENT",
      value: hostingExists ? "AVAILABLE" : "UNKNOWN",
      configured: hostingExists,
      connected: hostingExists,
      available: hostingExists,
      read_capability: hostingExists,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: hostingExists ? "VERIFIED" : "UNKNOWN",
      verification_source: "deployment_evidence",
      last_verified_at: now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "DATABASE",
      provider: production?.identity_verified ? "Supabase" : null,
      provider_account_reference: null,
      scope: "VENTURE",
      value: production?.tables_exist ? "CONNECTED" : "UNKNOWN",
      configured: Boolean(production?.tables_exist),
      connected: Boolean(production?.persistence_live_verified),
      available: Boolean(production?.tables_exist),
      read_capability: Boolean(production?.tables_exist),
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: production?.identity_verified ? "VERIFIED" : "UNKNOWN",
      verification_source: "occupancynpv_production_evidence",
      last_verified_at: now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "AUTH",
      provider: production?.production_auth_backend === "SUPABASE_AUTH" ? "Supabase Auth" : null,
      provider_account_reference: null,
      scope: "VENTURE",
      value: production?.production_auth_backend === "SUPABASE_AUTH" ? "CONFIGURED" : "UNKNOWN",
      configured: production?.production_auth_backend === "SUPABASE_AUTH",
      connected: production?.production_auth_backend === "SUPABASE_AUTH",
      available: production?.production_auth_backend === "SUPABASE_AUTH",
      read_capability: Boolean(production),
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: production?.production_auth_backend === "SUPABASE_AUTH" ? "VERIFIED" : "UNKNOWN",
      verification_source: "occupancynpv_production_evidence",
      last_verified_at: now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "ANALYTICS",
      provider: cre?.analytics_provider && cre.analytics_provider !== "UNCONFIGURED" ? String(cre.analytics_provider) : null,
      provider_account_reference: null,
      scope: "VENTURE",
      value: cre?.analytics_provider && cre.analytics_provider !== "UNCONFIGURED" ? "CONFIGURED" : "NOT_CONFIGURED",
      configured: Boolean(cre?.analytics_provider && cre.analytics_provider !== "UNCONFIGURED"),
      connected: false,
      available: false,
      read_capability: false,
      write_capability: false,
      mutation_authority: "NOT_CONNECTED",
      verification_status: "UNVERIFIED",
      verification_source: "venture_operational_record",
      last_verified_at: now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "UNKNOWN",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "GROWTH",
      provider: launch?.organic === "ACTIVE" ? "organic_growth" : null,
      provider_account_reference: null,
      scope: "VENTURE",
      value: launch?.organic === "ACTIVE" ? "ACTIVE" : launched ? "AVAILABLE" : "NOT_CONFIGURED",
      configured: launched,
      connected: launch?.organic === "ACTIVE",
      available: launched,
      read_capability: launched,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: launched ? "VERIFIED" : "UNVERIFIED",
      verification_source: "occupancynpv_public_launch",
      last_verified_at: launch?.launched_at ?? now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "CREATIVE_MEDIA",
      provider: launch?.creative_media === "ACTIVE" ? "creative_media_engine" : null,
      provider_account_reference: null,
      scope: "PORTFOLIO",
      value: launch?.creative_media === "ACTIVE" ? "ACTIVE" : "AVAILABLE",
      configured: true,
      connected: launch?.creative_media === "ACTIVE",
      available: true,
      read_capability: true,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: "VERIFIED",
      verification_source: "occupancynpv_public_launch",
      last_verified_at: launch?.launched_at ?? now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "FULFILLMENT",
      provider: "occupancynpv_fulfillment",
      provider_account_reference: null,
      scope: "VENTURE",
      value: authority?.fulfillment_readiness_gate === "PASS" ? "READY" : authority?.fulfillment_readiness_gate === "FAIL" ? "FAILED" : "AVAILABLE",
      configured: true,
      connected: true,
      available: true,
      read_capability: true,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: "VERIFIED",
      verification_source: "occupancynpv_durable_authority",
      last_verified_at: now,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {},
    }),
    record({
      capability_id: "PERFORMANCE_LEARNING",
      provider: "portfolio_actual_economics",
      provider_account_reference: null,
      scope: "PORTFOLIO",
      value: "AVAILABLE",
      configured: true,
      connected: true,
      available: true,
      read_capability: true,
      write_capability: false,
      mutation_authority: "GOVERNED",
      verification_status: "VERIFIED",
      verification_source: "PortfolioActualEconomicsProjection",
      last_verified_at: projectPortfolioActualEconomics(now).last_updated_at,
      staleness_threshold_ms: DEFAULT_STALE_MS,
      freshness: "CURRENT",
      error_state: null,
      metadata: {
        lifetime_gross_revenue: projectPortfolioActualEconomics(now).lifetime_gross_revenue,
      },
    }),
  ];

  const missing = CAPABILITY_IDS.filter((id) => !capabilities.some((row) => row.capability_id === id));
  for (const id of missing) {
    capabilities.push(unknownCapability(id, now));
  }

  return {
    contract: CANONICAL_CAPABILITY_PROJECTION,
    generated_at: now,
    capabilities,
  };
}

function unknownCapability(id: CapabilityId, now: string): CapabilityRecord {
  return record({
    capability_id: id,
    provider: null,
    provider_account_reference: null,
    scope: "PORTFOLIO",
    value: "UNKNOWN",
    configured: null,
    connected: null,
    available: false,
    read_capability: false,
    write_capability: false,
    mutation_authority: "UNKNOWN",
    verification_status: "UNKNOWN",
    verification_source: "none",
    last_verified_at: now,
    staleness_threshold_ms: DEFAULT_STALE_MS,
    freshness: "UNKNOWN",
    error_state: null,
    metadata: {},
  });
}

export function capabilityById(
  projection: CanonicalCapabilityProjection,
  id: CapabilityId,
): CapabilityRecord | undefined {
  return projection.capabilities.find((row) => row.capability_id === id);
}

export function formatCapabilityCard(row: CapabilityRecord): {
  status: string;
  detail: string;
  scope: CapabilityScope;
} {
  const provider = row.provider ? `${row.provider} — ` : "";
  return {
    status: `${provider}${row.value}`.replace(/_/g, " "),
    detail: `Scope ${row.scope} · Mutation ${row.mutation_authority}`,
    scope: row.scope,
  };
}
