import {
  CLUB_THROTTLE_CANONICAL_ORIGIN,
  CLUB_THROTTLE_VENTURE_ID,
} from "@/lib/infinity/commerce/club-throttle";
import { CRE_VENTURE_ID, CRE_VENTURE_NAME, OCCUPANCYNPV_DOMAIN } from "./constants";
import { listVentureOperationalRecords, readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { UNCONFIGURED, type VentureOperationalRecord } from "./types";
import { unconfiguredSecretReference } from "./secrets";

/** Durable venture-created timestamp for Club Throttle in the canonical registry. */
export const CLUB_THROTTLE_VENTURE_CREATED_AT = "2026-09-22T12:00:00.000Z" as const;

/** Durable venture-created timestamp for OccupancyNPV in the canonical registry. */
export const OCCUPANCYNPV_VENTURE_CREATED_AT = "2026-06-06T06:00:00.000Z" as const;

export function resolveVentureCreatedAt(record: Pick<VentureOperationalRecord, "venture_id" | "venture_created_at" | "domain_history">): string {
  if (record.venture_created_at) return record.venture_created_at;
  const fromHistory = (record.domain_history ?? [])
    .map((row) => row.at)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  if (fromHistory) return fromHistory;
  if (record.venture_id === CLUB_THROTTLE_VENTURE_ID) return CLUB_THROTTLE_VENTURE_CREATED_AT;
  if (record.venture_id === CRE_VENTURE_ID || record.venture_id === "occupancynpv") return OCCUPANCYNPV_VENTURE_CREATED_AT;
  return record.venture_id;
}

function emptyOperationalShell(venture_id: string, venture_name: string): VentureOperationalRecord {
  return {
    venture_id,
    venture_name,
    venture_status: "ACTIVE",
    operating_stage: "OPERATING",
    business_model: UNCONFIGURED,
    primary_offer: UNCONFIGURED,
    monetization_model: UNCONFIGURED,
    primary_domain: UNCONFIGURED,
    domain_history: [],
    public_url: UNCONFIGURED,
    canonical_url: UNCONFIGURED,
    public_launch_state: "NO",
    deployment_provider: UNCONFIGURED,
    deployment_project: UNCONFIGURED,
    active_artifact: UNCONFIGURED,
    active_artifact_digest: UNCONFIGURED,
    active_deployment: UNCONFIGURED,
    active_deployment_url: UNCONFIGURED,
    deployment_state: UNCONFIGURED,
    domain_provider: UNCONFIGURED,
    domain_registration_state: UNCONFIGURED,
    dns_provider: UNCONFIGURED,
    dns_zone: UNCONFIGURED,
    dns_state: UNCONFIGURED,
    ssl_state: UNCONFIGURED,
    commercialization_state: "NOT_CONFIGURED",
    pricing_state: UNCONFIGURED,
    checkout_state: UNCONFIGURED,
    payment_provider: UNCONFIGURED,
    payment_account_binding: unconfiguredSecretReference(),
    payment_products: [],
    payment_prices: [],
    payment_webhooks: unconfiguredSecretReference(),
    revenue_state: UNCONFIGURED,
    fulfillment_state: UNCONFIGURED,
    analytics_provider: UNCONFIGURED,
    analytics_property: UNCONFIGURED,
    search_console_binding: UNCONFIGURED,
    sitemap_url: UNCONFIGURED,
    robots_state: UNCONFIGURED,
    indexability_state: UNCONFIGURED,
    primary_sender_identity: UNCONFIGURED,
    communication_provider: UNCONFIGURED,
    communication_capabilities: {},
    inbound_observer_state: UNCONFIGURED,
    suppression_state: UNCONFIGURED,
    privacy_policy_url: UNCONFIGURED,
    terms_of_service_url: UNCONFIGURED,
    legal_configuration_state: UNCONFIGURED,
    legal_entity: UNCONFIGURED,
    company_address: UNCONFIGURED,
    jurisdiction: UNCONFIGURED,
    support_email: UNCONFIGURED,
    privacy_operator: UNCONFIGURED,
    terms_operator: UNCONFIGURED,
    active_channels: [],
    current_experiment: UNCONFIGURED,
    outreach_strategy: UNCONFIGURED,
    acquisition_state: UNCONFIGURED,
    primary_kpis: [],
    current_metric_state: UNCONFIGURED,
    performance_source_bindings: [],
    latest_learning_decision: UNCONFIGURED,
    optimization_state: UNCONFIGURED,
    current_missions: [],
    active_authorizations: [],
    blocked_actions: [],
    risk_state: UNCONFIGURED,
    secret_references: [],
  };
}

export function canonicalClubThrottleVentureOperationalRecord(): VentureOperationalRecord {
  return {
    ...emptyOperationalShell(CLUB_THROTTLE_VENTURE_ID, "Club Throttle"),
    venture_created_at: CLUB_THROTTLE_VENTURE_CREATED_AT,
    business_model: "D2C_APPAREL",
    primary_offer: "Original rider apparel",
    monetization_model: "POD_COMMERCE",
    primary_domain: "clubthrottle.com",
    domain_history: [
      {
        domain: "clubthrottle.com",
        event: "BOUND",
        at: CLUB_THROTTLE_VENTURE_CREATED_AT,
        evidence: "canonical_club_throttle_registry",
      },
    ],
    public_url: CLUB_THROTTLE_CANONICAL_ORIGIN,
    canonical_url: `${CLUB_THROTTLE_CANONICAL_ORIGIN}/`,
    public_launch_state: "YES",
    deployment_provider: "vercel",
    deployment_project: "club-throttle",
    commercialization_state: "PUBLICLY_LAUNCHED",
    deployment_state: "PUBLIC_STOREFRONT",
    active_artifact: "club-throttle-storefront-compose",
    fulfillment_state: "FULFILLMENT_READY",
  };
}

export function backfillClubThrottleVentureOperationalRecord(): VentureOperationalRecord {
  return writeVentureOperationalRecord(canonicalClubThrottleVentureOperationalRecord());
}

export function canonicalOccupancyNpvPublicVentureOperationalRecord(): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID);
  if (existing) {
    return {
      ...existing,
      venture_created_at: existing.venture_created_at ?? resolveVentureCreatedAt(existing),
      public_launch_state: existing.public_launch_state === "YES" ? "YES" : existing.public_launch_state,
      public_url: existing.public_url !== UNCONFIGURED ? existing.public_url : `https://${OCCUPANCYNPV_DOMAIN}`,
      primary_domain: existing.primary_domain !== UNCONFIGURED ? existing.primary_domain : OCCUPANCYNPV_DOMAIN,
    };
  }
  return {
    ...emptyOperationalShell(CRE_VENTURE_ID, CRE_VENTURE_NAME),
    venture_created_at: OCCUPANCYNPV_VENTURE_CREATED_AT,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    public_url: `https://${OCCUPANCYNPV_DOMAIN}`,
    canonical_url: `https://${OCCUPANCYNPV_DOMAIN}/`,
    public_launch_state: "YES",
    commercialization_state: "PUBLICLY_LAUNCHED",
    deployment_provider: "vercel",
    deployment_state: "PUBLICLY_LAUNCHED",
  };
}

export function backfillOccupancyNpvPublicVentureOperationalRecord(): VentureOperationalRecord {
  return writeVentureOperationalRecord(canonicalOccupancyNpvPublicVentureOperationalRecord());
}

export function listCanonicalPublicVentureBackfillRecords(): VentureOperationalRecord[] {
  return [canonicalOccupancyNpvPublicVentureOperationalRecord(), canonicalClubThrottleVentureOperationalRecord()];
}

export function mergeCanonicalVentureRecordsForPublicProjection(): VentureOperationalRecord[] {
  const byId = new Map<string, VentureOperationalRecord>();
  for (const row of listVentureOperationalRecords()) {
    byId.set(row.venture_id, row);
  }
  for (const row of listCanonicalPublicVentureBackfillRecords()) {
    if (!byId.has(row.venture_id)) byId.set(row.venture_id, row);
    else {
      const current = byId.get(row.venture_id)!;
      byId.set(row.venture_id, {
        ...current,
        venture_created_at: current.venture_created_at ?? row.venture_created_at,
        public_url: current.public_url !== UNCONFIGURED ? current.public_url : row.public_url,
        public_launch_state: current.public_launch_state === "YES" || row.public_launch_state === "YES" ? "YES" : current.public_launch_state,
        primary_domain: current.primary_domain !== UNCONFIGURED ? current.primary_domain : row.primary_domain,
      });
    }
  }
  return [...byId.values()];
}

export function ensureCanonicalPublicVentureRegistryHydrated(): void {
  for (const row of listCanonicalPublicVentureBackfillRecords()) {
    if (!readVentureOperationalRecord(row.venture_id)) writeVentureOperationalRecord(row);
  }
}
