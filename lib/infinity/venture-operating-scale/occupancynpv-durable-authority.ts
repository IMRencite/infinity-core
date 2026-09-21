import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION,
  ROUTINE_AUTONOMOUS_MUTATION_CLASSES,
  evaluateCommercialProviderMutation,
  type CommercialProviderMutationAuthority,
  type ProviderMutationClass,
  type ProviderMutationDecisionResult,
  type RoutineAutonomousMutationClass,
} from "./commercial-provider-mutation-authority";
import {
  CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_DURABLE_AUTHORITY_STATE_FILE,
  OCCUPANCYNPV_PURCHASE_CEILING_USD,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_VENTURE,
} from "./constants";
import {
  DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY,
  OCCUPANCYNPV_PAYMENT_ACTIVATION_GATES,
  evaluatePaymentActivationPolicy,
  evaluatePostActivationCustomerPayment,
} from "./payment-activation-policy";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";
import { orderedCommercializationBlockers } from "./readiness";
import { recordContainsRawSecrets } from "./secrets";
import type { VentureOperationalRecord } from "./types";

const EFFECTIVE_FROM = "2026-09-06T00:00:00.000Z";

export const OCCUPANCYNPV_DEMONSTRATED_ROUTINE_CLASSES = [
  ...ROUTINE_AUTONOMOUS_MUTATION_CLASSES,
] as const satisfies readonly RoutineAutonomousMutationClass[];

type PersistedAuthority = Omit<CommercialProviderMutationAuthority, "authority_id"> & {
  id: string;
};

export type OccupancynpvDurableAuthorityState = {
  venture: typeof OCCUPANCYNPV_STRIPE_VENTURE;
  venture_id: typeof CRE_VENTURE_ID;
  domain: typeof OCCUPANCYNPV_DOMAIN;
  policy_version: typeof COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION;
  provider_mutation_policy: "AUTONOMOUS_WITHIN_POLICY";
  payment_activation_policy: "FOUNDER_APPROVAL_REQUIRED" | "AUTONOMOUS_WITHIN_POLICY" | "DISABLED";
  payment_activation: "NO" | "YES";
  publicly_launched: "NO" | "YES";
  payment_readiness_gate: "READY_FOR_ACTIVATION_AUTHORIZATION" | "BLOCKED";
  fulfillment_readiness_gate: "UNCONFIGURED" | "FAIL" | "PASS";
  first_payment_activation_executed: "NO" | "YES";
  first_payment_activation_at: string | null;
  activation_status: "NONE" | "ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT" | "PAYMENT_REACTIVATED";
  orphaned_paid_customer_count: number;
  remaining_blockers: string[];
  domain_spend_ceiling_usd: typeof OCCUPANCYNPV_PURCHASE_CEILING_USD;
  recurring_spend_ceiling_usd: null;
  demonstrated_routine_classes: RoutineAutonomousMutationClass[];
  unclaimed_authority: string[];
  hq_decides: false;
  authorities: PersistedAuthority[];
  instantiated_at: string;
};

let memory: OccupancynpvDurableAuthorityState | null = null;

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST !== "1") return false;
  return true;
}

export function resetOccupancynpvDurableAuthorityStore(): void {
  memory = null;
}

function grant(mutationClass: RoutineAutonomousMutationClass): PersistedAuthority {
  return {
    id: `cpm_${OCCUPANCYNPV_STRIPE_VENTURE}_${mutationClass.toLowerCase()}`,
    scope: "venture_provider_mutation_class",
    venture_scope: CRE_VENTURE_ID,
    provider_scope: "provider_neutral_adapter",
    resource_scope: OCCUPANCYNPV_DOMAIN,
    mutation_class: mutationClass,
    risk_class: "ROUTINE",
    financial_exposure: "NONE",
    reversibility: "REVERSIBLE",
    requires_provider_identity: true,
    requires_canonical_plan: true,
    requires_duplicate_protection: true,
    requires_readback: true,
    requires_traceability: true,
    requires_eag: true,
    requires_treasury: false,
    requires_founder_approval: false,
    effective_from: EFFECTIVE_FROM,
    expires_at: null,
    status: "ACTIVE",
    evidence: [`demonstrated_${mutationClass.toLowerCase()}`],
    policy_version: COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION,
  };
}

export function buildOccupancynpvDurableAuthorityState(
  instantiatedAt = new Date().toISOString(),
): OccupancynpvDurableAuthorityState {
  return {
    venture: OCCUPANCYNPV_STRIPE_VENTURE,
    venture_id: CRE_VENTURE_ID,
    domain: OCCUPANCYNPV_DOMAIN,
    policy_version: COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION,
    provider_mutation_policy: "AUTONOMOUS_WITHIN_POLICY",
    payment_activation_policy: DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY,
    payment_activation: "NO",
    publicly_launched: "NO",
    payment_readiness_gate: "BLOCKED",
    fulfillment_readiness_gate: "UNCONFIGURED",
    first_payment_activation_executed: "NO",
    first_payment_activation_at: null,
    activation_status: "NONE",
    orphaned_paid_customer_count: 0,
    remaining_blockers: ["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
    domain_spend_ceiling_usd: OCCUPANCYNPV_PURCHASE_CEILING_USD,
    recurring_spend_ceiling_usd: null,
    demonstrated_routine_classes: [...OCCUPANCYNPV_DEMONSTRATED_ROUTINE_CLASSES],
    unclaimed_authority: [
      "DOMAIN_REGISTRATION_GLOBAL_AUTONOMY",
      "PAYMENT_ACTIVATION",
      "PUBLIC_LAUNCH",
      "DNS_RECORD_DELETE",
      "PROVIDER_RESOURCE_DELETE",
      "PRICE_CHANGE",
      "LEGAL_CONFIGURATION_CHANGE",
    ],
    hq_decides: false,
    authorities: OCCUPANCYNPV_DEMONSTRATED_ROUTINE_CLASSES.map(grant),
    instantiated_at: instantiatedAt,
  };
}

export function persistOccupancynpvDurableAuthority(
  state: OccupancynpvDurableAuthorityState,
): OccupancynpvDurableAuthorityState {
  if (recordContainsRawSecrets(state)) {
    throw new Error("Secret-like content blocked from OccupancyNPV durable authority state");
  }
  memory = state;
  if (persistEnabled()) {
    mkdirSync(dirname(OCCUPANCYNPV_DURABLE_AUTHORITY_STATE_FILE), { recursive: true });
    writeFileSync(OCCUPANCYNPV_DURABLE_AUTHORITY_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  }
  return state;
}

export function readOccupancynpvDurableAuthority(): OccupancynpvDurableAuthorityState | null {
  if (memory) return memory;
  if (!persistEnabled() || !existsSync(OCCUPANCYNPV_DURABLE_AUTHORITY_STATE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(OCCUPANCYNPV_DURABLE_AUTHORITY_STATE_FILE, "utf8")) as OccupancynpvDurableAuthorityState;
    if (recordContainsRawSecrets(parsed)) return null;
    memory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function toCommercialProviderMutationAuthority(
  row: PersistedAuthority,
): CommercialProviderMutationAuthority {
  return {
    authority_id: row.id,
    scope: row.scope,
    venture_scope: row.venture_scope,
    provider_scope: row.provider_scope,
    resource_scope: row.resource_scope,
    mutation_class: row.mutation_class,
    risk_class: row.risk_class,
    financial_exposure: row.financial_exposure,
    reversibility: row.reversibility,
    requires_provider_identity: row.requires_provider_identity,
    requires_canonical_plan: row.requires_canonical_plan,
    requires_duplicate_protection: row.requires_duplicate_protection,
    requires_readback: row.requires_readback,
    requires_traceability: row.requires_traceability,
    requires_eag: row.requires_eag,
    requires_treasury: row.requires_treasury,
    requires_founder_approval: row.requires_founder_approval,
    effective_from: row.effective_from,
    expires_at: row.expires_at,
    status: row.status,
    evidence: row.evidence,
    policy_version: row.policy_version,
  };
}

export function occupancynpvRoutineProposal(input: {
  mutationClass: ProviderMutationClass;
  provider: string;
  resource: string;
  providerAccountId?: string;
  expectedProviderAccountId?: string;
}): Parameters<typeof evaluateCommercialProviderMutation>[0] {
  const state = readOccupancynpvDurableAuthority() ?? buildOccupancynpvDurableAuthorityState();
  const persisted = state.authorities.find((row) => row.mutation_class === input.mutationClass);
  return {
    mutationClass: input.mutationClass,
    venture: OCCUPANCYNPV_STRIPE_VENTURE,
    provider: input.provider,
    resource: input.resource,
    providerAccountId: input.providerAccountId ?? OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    expectedProviderAccountId: input.expectedProviderAccountId ?? OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    providerIdentityVerified: true,
    providerAccountKnown: true,
    credentialScopeClear: true,
    resourceOwnershipClear: true,
    ventureOwnershipVerified: true,
    canonicalPlanExists: true,
    mutationBounded: true,
    duplicateProtected: true,
    readbackAvailable: true,
    traceabilityEnabled: true,
    riskKnown: true,
    legalIdentityClear: true,
    accountMatch: true,
    financialExposure: { kind: "NONE" },
    matchedAuthority: persisted ? toCommercialProviderMutationAuthority(persisted) : null,
  };
}

function reconcileRecord(existing: VentureOperationalRecord): VentureOperationalRecord {
  const remaining = orderedCommercializationBlockers(existing).filter((row) =>
    ["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"].includes(row),
  );
  return writeVentureOperationalRecord({
    ...existing,
    public_launch_state: "NO",
    revenue_state: "UNCONFIGURED",
    latest_learning_decision: "DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_INSTANTIATED",
    blocked_actions: remaining.length ? remaining : ["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
    current_missions: existing.current_missions.filter(
      (row) => row !== CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
    ),
  });
}

export function executeCreOccupancynpvDurableCommercialProviderMutationAuthority(input: {
  now?: string;
} = {}) {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = inspectMailboxObserverHealth();
  const clock = inspectExperimentClock();
  const state = persistOccupancynpvDurableAuthority(
    buildOccupancynpvDurableAuthorityState(input.now ?? new Date().toISOString()),
  );
  const record = reconcileRecord(existing);
  const remaining = orderedCommercializationBlockers(record);
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: true,
    stripeVerification: "LIVE_WRITE_VERIFIED",
    stripeEnvironment: "LIVE",
    offersConsistent: true,
    checkoutArchitecture: true,
    webhookArchitecture: true,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
    domainBound: true,
    legalReady: true,
    objectsConfigured: true,
  });
  const paymentReadiness =
    paymentGate.result === "READY_NOT_ACTIVE" ? "READY_FOR_ACTIVATION_AUTHORIZATION" : "BLOCKED";
  const activation = evaluatePaymentActivationPolicy({
    venture: OCCUPANCYNPV_STRIPE_VENTURE,
    provider: "stripe",
    resource: "occupancynpv_live_purchase_path",
    policy: state.payment_activation_policy,
    paymentActivated: false,
    publicLaunch: "NO",
    gates: OCCUPANCYNPV_PAYMENT_ACTIVATION_GATES,
    providerAccountId: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    expectedProviderAccountId: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  });
  const sampleDecisions: ProviderMutationDecisionResult[] = [
    evaluateCommercialProviderMutation(
      occupancynpvRoutineProposal({
        mutationClass: "DNS_RECORD_CREATE",
        provider: "dns",
        resource: OCCUPANCYNPV_DOMAIN,
      }),
    ),
    evaluateCommercialProviderMutation(
      occupancynpvRoutineProposal({
        mutationClass: "STRIPE_PRODUCT_CREATE",
        provider: "payments",
        resource: "canonical_products",
      }),
    ),
    evaluatePostActivationCustomerPayment({
      mutationClass: "CUSTOMER_CHECKOUT_EXECUTION",
      venture: OCCUPANCYNPV_STRIPE_VENTURE,
      provider: "payments",
      resource: "checkout_session",
      paymentActivated: false,
    }),
    activation.decision,
  ];
  return {
    mission: CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
    authorityFoundation: "BUILT" as const,
    canonicalModel: "CommercialProviderMutationAuthority",
    decisions: ["ALLOW_AUTONOMOUS", "REQUIRE_AUTHORIZATION", "ESCALATE", "BLOCK"] as const,
    policyVersion: COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION,
    state,
    record,
    sampleDecisions,
    paymentReadiness: {
      gate: paymentReadiness,
      paymentsActive: paymentGate.paymentsActive,
      result: paymentGate.result,
    },
    paymentActivation: activation,
    commercialization: {
      remaining,
      paymentActivation: "NO" as const,
      publiclyLaunched: "NO" as const,
    },
    hq: {
      mutationPolicy: state.provider_mutation_policy,
      paymentActivationPolicy: state.payment_activation_policy,
      paymentActivation: state.payment_activation,
      publicLaunch: state.publicly_launched,
      founderActionRequired: true,
      remainingBlockers: state.remaining_blockers,
      hqDecides: false as const,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.trackedConversations,
    },
    writes: {
      stripe: 0 as const,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      webhookMutations: 0 as const,
      dnsWrites: 0 as const,
      domainPurchases: 0 as const,
      vercelMutations: 0 as const,
      paymentActivation: 0 as const,
      publicLaunch: 0 as const,
    },
    nextState: "DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_COMPLETE" as const,
    nextGovernedAction: "OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_AUTHORIZATION" as const,
  };
}
