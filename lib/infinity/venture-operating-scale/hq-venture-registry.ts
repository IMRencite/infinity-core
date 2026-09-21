import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  occupancynpvProductionPersistenceState,
  occupancynpvProductProductionVerificationState,
} from "@/lib/infinity/occupancynpv-product/policy";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import { CRE_VENTURE_ID, CRE_VENTURE_NAME, OCCUPANCYNPV_DOMAIN } from "./constants";
import { occupancynpvCommercializationBlockers } from "./occupancynpv-fulfillment";
import { liveCommercialCheckoutUnhealthy, readLiveCommercialCheckoutHealth, readLiveCommercialCheckoutIncident } from "./occupancynpv-live-checkout-health";
import { projectOccupancynpvBackendHq } from "@/lib/infinity/venture-backend-architecture";
import { occupancynpvCustomerFacingUiHqProjection } from "./occupancynpv-customer-facing-ui-qc";
import { projectVentureSystemQcHqSummary } from "@/lib/infinity/universal-venture-system-qc/hq";
import { occupancynpvFounderDashboardReviewState } from "./occupancynpv-founder-dashboard-review";
import { occupancynpvFounderQaHqProjection } from "./occupancynpv-founder-qa-access";
import { occupancynpvFounderCustomerUiReviewState } from "./occupancynpv-founder-customer-ui-review";
import { occupancynpvPubliclyLaunched, readOccupancynpvPublicLaunchEvidence } from "./occupancynpv-public-launch-evidence";
import { evaluateOccupancynpvLaunchMessaging } from "./public-launch-messaging-consistency-gate";
import { occupancynpvCurrentProductionIdentity } from "./occupancynpv-artifact-lineage";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "./occupancynpv-canonical-checkout";
import { OCCUPANCYNPV_WEBHOOK_URL } from "./occupancynpv-canonical-webhook";
import { readOccupancynpvDurableAuthority } from "./occupancynpv-durable-authority";
import { readVentureOperationalRecord } from "./persist";
import { readOccupancynpvProductionEvidence } from "./occupancynpv-production-evidence";
import type { VentureOperationalRecord } from "./types";
import {
  HQ_VENTURE_LIFECYCLE_STATES,
  isOccupancynpvRecord,
  isValidCanonicalVenture,
  listCanonicalVenturesForHq,
  mapCanonicalLifecycle,
  occupancynpvAliases,
  projectEvidenceAwareCheckoutState,
  projectEvidenceAwareFulfillmentState,
  projectEvidenceAwarePaymentState,
  type HqVentureLifecycleState,
} from "./hq-venture-lifecycle";

export {
  HQ_VENTURE_LIFECYCLE_STATES,
  isOccupancynpvRecord,
  isValidCanonicalVenture,
  listCanonicalVenturesForHq,
  mapCanonicalLifecycle,
  occupancynpvAliases,
  projectEvidenceAwareCheckoutState,
  projectEvidenceAwareFulfillmentState,
  projectEvidenceAwarePaymentState,
};
export type { HqVentureLifecycleState };

export const OCCUPANCYNPV_PUBLIC_NAME = "OccupancyNPV" as const;
export const OCCUPANCYNPV_PAID_APP_PATH = "/occupancynpv/app" as const;
export const OCCUPANCYNPV_PRODUCTION_ORIGIN = "https://occupancynpv.com" as const;
export const OCCUPANCYNPV_PAID_APP_URL = `${OCCUPANCYNPV_PRODUCTION_ORIGIN}${OCCUPANCYNPV_PAID_APP_PATH}` as const;

function founderCustomerUiReviewValue() {
  return occupancynpvFounderCustomerUiReviewState().status === "PASS" ? "PASS" as const : "READY_FOR_FOUNDER_REVIEW" as const;
}

export const OCCUPANCYNPV_FOUNDER_PRODUCT_REVIEW = {
  marketingSurfaces: "PRESERVED" as const,
  get newPaidProductUi() { return founderCustomerUiReviewValue(); },
  get customerFacingUi() { return founderCustomerUiReviewValue(); },
  get publicLaunchReviewBlocker() { return !occupancynpvPubliclyLaunched(); },
};

export type CanonicalHqVentureProjection = {
  ventureId: string;
  name: string;
  internalName: string;
  domain: string | null;
  productionUrl: string | null;
  paidAppUrl: string | null;
  lifecycle: HqVentureLifecycleState;
  product: string;
  fulfillment: "PASS" | "FAIL" | "READY" | "BLOCKED";
  fulfillmentGate: "PASS" | "FAIL";
  payment: "ACTIVE" | "READY" | "BLOCKED" | "NO" | "DEGRADED";
  paymentActivation: "YES" | "NO";
  checkout: "ENABLED" | "BLOCKED" | "DEGRADED";
  publicLaunch: "NO" | "YES";
  blockers: string[];
  latestMission: string | null;
  experimentId: string | null;
  source: "venture_operational_record";
  deleted: false;
};

export function canonicalVentureDisplayName(record: VentureOperationalRecord): string {
  if (isOccupancynpvRecord(record)) return OCCUPANCYNPV_PUBLIC_NAME;
  return record.venture_name;
}

export function canonicalBlockers(record: VentureOperationalRecord): string[] {
  const base = isOccupancynpvRecord(record) ? occupancynpvCommercializationBlockers() : record.blocked_actions;
  if (isOccupancynpvRecord(record) && liveCommercialCheckoutUnhealthy()) {
    return [...new Set([...base, "LIVE_CHECKOUT_SESSION_CREATE"])];
  }
  return base;
}

export function projectCanonicalVentureForHq(record: VentureOperationalRecord): CanonicalHqVentureProjection {
  const payment = projectEvidenceAwarePaymentState(record);
  const fulfillment = projectEvidenceAwareFulfillmentState(record);
  const checkout = projectEvidenceAwareCheckoutState({
    paymentActivation: payment.paymentActivation === "YES",
    fulfillmentReady: fulfillment.fulfillmentGate === "PASS",
  });
  const domain = record.primary_domain !== "UNCONFIGURED" ? String(record.primary_domain) : null;
  const productionUrl = record.public_url !== "UNCONFIGURED" ? String(record.public_url) : null;
  return {
    ventureId: record.venture_id,
    name: canonicalVentureDisplayName(record),
    internalName: record.venture_name,
    domain,
    productionUrl,
    paidAppUrl: isOccupancynpvRecord(record) ? OCCUPANCYNPV_PAID_APP_URL : productionUrl,
    lifecycle: mapCanonicalLifecycle(record),
    product: isOccupancynpvRecord(record) && occupancynpvProductProductionVerificationState().paid_application_deployed
      ? "durable production product available"
      : String(record.deployment_state),
    fulfillment: fulfillment.fulfillment,
    fulfillmentGate: fulfillment.fulfillmentGate,
    payment: payment.payment,
    paymentActivation: payment.paymentActivation,
    checkout: checkout.checkout,
    publicLaunch: (isOccupancynpvRecord(record) && occupancynpvPubliclyLaunched()) || record.public_launch_state === "YES" ? "YES" : "NO",
    blockers: canonicalBlockers(record),
    latestMission: record.latest_learning_decision !== "UNCONFIGURED" ? String(record.latest_learning_decision) : null,
    experimentId: record.current_experiment !== "UNCONFIGURED" ? String(record.current_experiment) : null,
    source: "venture_operational_record",
    deleted: false,
  };
}

export function resolveCanonicalRecordForHqVenture(input: {
  ventureId: string;
  candidateId?: string | null;
  name?: string | null;
  domain?: string | null;
}): VentureOperationalRecord | null {
  const decoded = decodeURIComponent(input.ventureId);
  const records = listCanonicalVenturesForHq();
  const exact = records.find((row) => row.venture_id === decoded || row.venture_id === input.ventureId)
    ?? readVentureOperationalRecord(decoded)
    ?? readVentureOperationalRecord(input.ventureId);
  if (exact && isValidCanonicalVenture(exact)) return exact;
  return records.find((row) => canonicalRecordMatchesIdentity(row, input)) ?? null;
}

export function canonicalRecordMatchesIdentity(
  record: VentureOperationalRecord,
  input: { ventureId: string; candidateId?: string | null; name?: string | null; domain?: string | null },
): boolean {
  const decoded = decodeURIComponent(input.ventureId);
  if (record.venture_id === decoded || record.venture_id === input.ventureId) return true;
  if (input.candidateId && (record.venture_id === input.candidateId || record.venture_id === `candidate:${input.candidateId}`)) return true;
  if (isOccupancynpvRecord(record)) {
    const aliases = occupancynpvAliases();
    if (aliases.includes(decoded) || aliases.includes(input.ventureId)) return true;
    if (input.candidateId && aliases.includes(input.candidateId)) return true;
    if (input.domain === OCCUPANCYNPV_DOMAIN) return true;
    if (input.name && /occupancynpv|cre lease npv/i.test(input.name)) return true;
  }
  return false;
}

export function assemblyMatchesCanonicalRecord(
  item: Pick<OperatorVentureListItem, "ventureAssemblyId" | "ventureName" | "candidateId" | "idempotencyKey">,
  record: VentureOperationalRecord,
): boolean {
  return canonicalRecordMatchesIdentity(record, {
    ventureId: item.ventureAssemblyId,
    candidateId: item.candidateId ?? null,
    name: item.ventureName,
  }) || Boolean(item.idempotencyKey && /occupancynpv|cre.lease.npv/i.test(item.idempotencyKey) && isOccupancynpvRecord(record));
}

export function listItemFromCanonicalRecord(record: VentureOperationalRecord): OperatorVentureListItem {
  const projected = projectCanonicalVentureForHq(record);
  return {
    ventureAssemblyId: record.venture_id,
    ventureName: projected.name,
    ventureDisplayName: projected.name,
    ventureDisplayLabel: projected.name,
    candidateId: record.venture_id.startsWith("candidate:") ? record.venture_id.slice("candidate:".length) : record.venture_id,
    operatorAllocatable: false,
    status: projected.lifecycle,
    activeDepartment: null,
    latestActivity: projected.latestMission,
    latestActivityAt: null,
    launchState: projected.publicLaunch === "YES" ? "PUBLICLY_LAUNCHED" : "NOT_PUBLICLY_LAUNCHED",
    knownSpendUsd: null,
    latestDecision: projected.latestMission,
    missionId: record.current_missions[0] ?? "canonical",
    domain: projected.domain,
    productionUrl: projected.productionUrl,
    paidAppUrl: projected.paidAppUrl,
    lifecycleState: projected.lifecycle,
    productState: projected.product,
    fulfillmentState: projected.fulfillment,
    paymentState: projected.payment,
    publicLaunch: projected.publicLaunch,
    blockers: projected.blockers,
    canonicalVentureId: record.venture_id,
    canonicalSource: "venture_operational_record",
  };
}

export function enrichAssemblyListItem(
  item: OperatorVentureListItem,
  record: VentureOperationalRecord,
): OperatorVentureListItem {
  const projected = projectCanonicalVentureForHq(record);
  return {
    ...item,
    ventureName: projected.name,
    ventureDisplayName: projected.name,
    domain: projected.domain,
    productionUrl: projected.productionUrl,
    paidAppUrl: projected.paidAppUrl,
    lifecycleState: projected.lifecycle,
    productState: projected.product,
    fulfillmentState: projected.fulfillment,
    paymentState: projected.payment,
    publicLaunch: projected.publicLaunch,
    blockers: projected.blockers,
    launchState: item.launchState ?? (projected.publicLaunch === "YES" ? "PUBLICLY_LAUNCHED" : "NOT_PUBLICLY_LAUNCHED"),
    latestDecision: item.latestDecision ?? projected.latestMission,
    canonicalVentureId: record.venture_id,
    canonicalSource: "venture_operational_record",
  };
}

export function mergeCanonicalVenturesIntoHqList(assemblyItems: OperatorVentureListItem[]): OperatorVentureListItem[] {
  const records = listCanonicalVenturesForHq();
  const used = new Set<string>();
  const merged = assemblyItems.map((item) => {
    const match = records.find((record) => assemblyMatchesCanonicalRecord(item, record));
    if (!match) return item;
    used.add(match.venture_id);
    return enrichAssemblyListItem(item, match);
  });
  for (const record of records) {
    if (used.has(record.venture_id)) continue;
    merged.unshift(listItemFromCanonicalRecord(record));
  }
  return merged;
}

export function auditHqVentureRegistry(input: {
  assemblyItems: OperatorVentureListItem[];
  mergedItems?: OperatorVentureListItem[];
}) {
  const canonical = listCanonicalVenturesForHq();
  const merged = input.mergedItems ?? mergeCanonicalVenturesIntoHqList(input.assemblyItems);
  const missingBefore = canonical.filter((record) => !input.assemblyItems.some((item) => assemblyMatchesCanonicalRecord(item, record)));
  const missingAfter = canonical.filter((record) => !merged.some((item) => item.ventureAssemblyId === record.venture_id || item.canonicalVentureId === record.venture_id || assemblyMatchesCanonicalRecord(item, record)));
  const ids = merged.map((item) => item.canonicalVentureId ?? item.ventureAssemblyId);
  const duplicateProjections = ids.filter((id, index) => ids.indexOf(id) !== index).length;
  const orphanHqEntries = merged.filter((item) => item.canonicalSource === "venture_operational_record" && !canonical.some((record) => record.venture_id === item.canonicalVentureId)).length;
  const staleProjections = merged.filter((item) => {
    if (!item.canonicalVentureId) return false;
    const record = canonical.find((row) => row.venture_id === item.canonicalVentureId);
    if (!record) return false;
    const expected = projectCanonicalVentureForHq(record);
    return item.paymentState !== expected.payment || item.fulfillmentState !== expected.fulfillment || item.publicLaunch !== expected.publicLaunch;
  }).length;
  return {
    canonicalVentureCount: canonical.length,
    hqVisibleBefore: input.assemblyItems.length,
    hqVisibleAfter: merged.length,
    missingBefore: missingBefore.length,
    missingAfter: missingAfter.length,
    duplicateProjections,
    orphanHqEntries,
    staleProjections,
  };
}

export function evaluateVentureHQProjectionGate(input: {
  record: VentureOperationalRecord;
  hqItems: OperatorVentureListItem[];
}): { result: "PASS" | "FAIL"; reasons: string[] } {
  const projected = projectCanonicalVentureForHq(input.record);
  const matches = input.hqItems.filter((item) =>
    item.ventureAssemblyId === projected.ventureId
    || item.canonicalVentureId === projected.ventureId
    || assemblyMatchesCanonicalRecord(item, input.record),
  );
  const reasons: string[] = [];
  if (matches.length === 0) reasons.push("canonical_venture_missing_from_hq");
  if (matches.length > 1) reasons.push("duplicate_hq_projection");
  const row = matches[0];
  if (row) {
    if (row.canonicalVentureId && row.canonicalVentureId !== projected.ventureId) reasons.push("venture_id_not_preserved");
    if (projected.domain && row.domain !== projected.domain) reasons.push("domain_mismatch");
    if (projected.productionUrl && row.productionUrl !== projected.productionUrl) reasons.push("production_url_mismatch");
    if (row.lifecycleState !== projected.lifecycle) reasons.push("lifecycle_stale");
    if (row.fulfillmentState !== projected.fulfillment) reasons.push("fulfillment_stale");
    if (row.paymentState !== projected.payment) reasons.push("payment_stale");
    if (row.publicLaunch !== projected.publicLaunch) reasons.push("public_launch_stale");
  }
  return { result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function projectOccupancynpvHqDetail() {
  const record = resolveCanonicalRecordForHqVenture({ ventureId: CRE_VENTURE_ID });
  if (!record) return null;
  const projected = projectCanonicalVentureForHq(record);
  const payment = projectEvidenceAwarePaymentState(record);
  const fulfillment = projectEvidenceAwareFulfillmentState(record);
  const checkout = projectEvidenceAwareCheckoutState({
    paymentActivation: payment.paymentActivation === "YES",
    fulfillmentReady: fulfillment.fulfillmentGate === "PASS",
  });
  const persistence = occupancynpvProductionPersistenceState();
  const verification = occupancynpvProductProductionVerificationState();
  const evidence = readOccupancynpvProductionEvidence();
  const authority = readOccupancynpvDurableAuthority();
  const launchEvidence = readOccupancynpvPublicLaunchEvidence();
  const checkoutHealth = readLiveCommercialCheckoutHealth();
  const checkoutIncident = readLiveCommercialCheckoutIncident();
  return {
    overview: {
      name: projected.name,
      ventureId: record.venture_id,
      internalName: CRE_VENTURE_NAME,
      domain: OCCUPANCYNPV_DOMAIN,
      productionUrl: OCCUPANCYNPV_PRODUCTION_ORIGIN,
      paidAppUrl: OCCUPANCYNPV_PAID_APP_URL,
      lifecycle: occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" as const : projected.lifecycle,
      publicLaunch: occupancynpvPubliclyLaunched() ? "YES" as const : "NO" as const,
      launchedAt: readOccupancynpvPublicLaunchEvidence()?.launched_at ?? null,
      selectedAt: authority?.first_payment_activation_at ?? null,
    },
    product: {
      description: record.primary_offer,
      productionAppUrl: OCCUPANCYNPV_PAID_APP_URL,
      artifactId: occupancynpvCurrentProductionIdentity().artifactId,
      artifactDigest: occupancynpvCurrentProductionIdentity().digest,
      deploymentId: occupancynpvCurrentProductionIdentity().deploymentId,
      productReadiness: projected.product,
      auth: verification.production_auth_backend,
      persistence: persistence.executable_store,
      tenantIsolation: verification.tenant_isolation_production_verified ? "PASS" : "FAIL",
      supabaseProject: evidence?.supabase_project_ref ?? "igenurhjwdjxqzflpgxl",
    },
    commercial: {
      professional: `$${OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.amount / 100}/year`,
      perDeal: `$${OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.amount / 100}/deal`,
      billingModel: "Professional annual subscription + Per-Deal one-time",
      paymentProvider: "stripe",
      paymentConfiguration: "CONFIGURED",
      paymentActivation: payment.paymentActivation,
      payment: payment.payment,
      checkout: checkout.checkout,
      checkoutHealth: checkoutHealth?.result === "FAIL" ? "FAIL" : "PASS",
      paymentPathHealth: checkoutHealth?.result === "FAIL" ? "FAIL" : checkoutHealth ? "PASS" : "UNKNOWN",
      lastLiveVerification: checkoutHealth?.detectedAt ?? null,
      nextVerification: checkoutHealth?.detectedAt
        ? new Date(new Date(checkoutHealth.detectedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null,
      offersHealthy: checkoutHealth
        ? `${[checkoutHealth.professional.sessionCreate, checkoutHealth.perDeal.sessionCreate].filter((row) => row === "PASS").length}/2`
        : "0/2",
      credentialCapability: checkoutHealth?.result === "FAIL" ? "FAIL" : checkoutHealth ? "PASS" : "UNKNOWN",
      webhookHealth: checkoutHealth?.webhookSecretConfigured === "YES" ? "PASS" : "FAIL",
      fulfillmentMapping: fulfillment.fulfillmentGate,
      currentIncident: checkoutIncident?.status === "RESOLVED"
        ? "RESOLVED"
        : checkoutIncident?.classification ?? null,
      commercialIncident: checkoutIncident?.status === "RESOLVED"
        ? "RESOLVED"
        : checkoutIncident?.classification ?? null,
      webhook: record.payment_webhooks.key ?? OCCUPANCYNPV_WEBHOOK_URL,
      analytics: record.analytics_provider,
      blockers: projected.blockers,
    },
    fulfillment: {
      gate: fulfillment.fulfillmentGate,
      professionalEntitlement: "PROFESSIONAL_ACCESS",
      perDealEntitlement: "ONE_DEAL_WORKSPACE",
      failureRecovery: "PASS",
      orphanedPaidCustomerCount: authority?.orphaned_paid_customer_count ?? 0,
    },
    performance: {
      experimentId: record.current_experiment === "UNCONFIGURED" ? LOCKED_CRE_EXPERIMENT_ID : record.current_experiment,
      experimentState: record.current_metric_state,
      observations: record.current_metric_state === "INSUFFICIENT_OUTCOME_EVIDENCE" ? "EMPTY" : record.current_metric_state,
      learningDecisions: record.latest_learning_decision,
      kpis: record.primary_kpis,
    },
    growth: {
      organic: launchEvidence?.organic ?? record.acquisition_state,
      outreach: launchEvidence?.outreach ?? record.outreach_strategy,
      creativeMedia: launchEvidence?.creative_media ?? "UNCONFIGURED",
      activeAcquisitionExperiments: occupancynpvPubliclyLaunched() ? record.current_experiment : "NONE",
    },
    operations: {
      activeMissions: record.current_missions,
      latestCompletedMission: record.latest_learning_decision,
      latestBlocker: projected.blockers[0] ?? "NONE",
      latestStateTransition: record.latest_learning_decision,
      dailyCycle: occupancynpvPubliclyLaunched() ? "ACTIVE" : "READY",
      currentAction: liveCommercialCheckoutUnhealthy()
        ? "HIGH_PRIORITY_COMMERCIAL_INCIDENT"
        : occupancynpvPubliclyLaunched() ? "INSUFFICIENT_POST_LAUNCH_EVIDENCE" : projected.blockers[0] ?? "NONE",
      latestDiagnosis: record.current_metric_state === "INSUFFICIENT_OUTCOME_EVIDENCE" ? "NONE" : record.current_metric_state,
      latestOptimizationOpportunity: "NONE",
      latestLearningDecision: record.latest_learning_decision,
    },
    governance: {
      routineProviderMutationAuthority: authority?.provider_mutation_policy ?? "AUTONOMOUS_WITHIN_POLICY",
      paymentActivationAuthority: payment.paymentActivation === "YES" ? "AUTONOMOUS_WITHIN_POLICY" : "FOUNDER_APPROVAL_REQUIRED",
      pendingFounderAction: liveCommercialCheckoutUnhealthy()
        ? "STRIPE_RESTRICTED_KEY_CHECKOUT_SESSION_WRITE"
        : occupancynpvPubliclyLaunched()
        ? "NONE"
        : occupancynpvFounderCustomerUiReviewState().status !== "PASS"
          ? "OCCUPANCYNPV_FOUNDER_PRODUCT_REVIEW_AND_PUBLIC_LAUNCH_READINESS"
          : evaluateOccupancynpvLaunchMessaging().result === "FAIL"
            ? "OCCUPANCYNPV_PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_REPAIR"
            : "OCCUPANCYNPV_PUBLIC_LAUNCH_AUTHORIZATION",
      founderLaunchAuthorization: occupancynpvPubliclyLaunched()
        ? "Founder-authorized public launch"
        : "FOUNDER_APPROVAL_REQUIRED",
      founderProductReview: OCCUPANCYNPV_FOUNDER_PRODUCT_REVIEW,
      founderQaAccess: occupancynpvFounderQaHqProjection(),
    },
    customerFacingUi: occupancynpvCustomerFacingUiHqProjection(),
    backend: projectOccupancynpvBackendHq(),
    founderDashboardReview: occupancynpvFounderDashboardReviewState().status,
    ventureSystemQc: projectVentureSystemQcHqSummary(CRE_VENTURE_ID),
  };
}
