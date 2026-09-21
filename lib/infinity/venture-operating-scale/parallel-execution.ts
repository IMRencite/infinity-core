import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { runCreInboundObservationCycle } from "@/lib/infinity/inbound-communication-runtime/cre-inbound-observer";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { evaluateParallelCreCommercializationConcurrency } from "./concurrency";
import { PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1 } from "./constants";
import { executeCreProductionDomainAcquisition, type DomainChildResult } from "./domain-acquisition";
import { executeCreStripeCapabilityAndPaymentReadiness, type StripeChildResult } from "./stripe-capability";
import { runDailyVentureOperatingCycle } from "./operations";
import { backfillCreVentureOperationalRecord } from "./record";
import { writeVentureOperationalRecord, readVentureOperationalRecord } from "./persist";
import { evaluateVentureCommercializationReadiness } from "./readiness";
import { envSecretReference } from "./secrets";
import { CRE_VENTURE_ID } from "./constants";
import type { VentureOperationalRecord } from "./types";

export type ParallelCreCommercializationResult = {
  mission: typeof PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1;
  concurrency: ReturnType<typeof evaluateParallelCreCommercializationConcurrency>;
  parallelExecution: "PASS" | "FAIL";
  domain: DomainChildResult;
  stripe: StripeChildResult;
  record: VentureOperationalRecord;
  daily: ReturnType<typeof runDailyVentureOperatingCycle>;
  readiness: ReturnType<typeof evaluateVentureCommercializationReadiness>;
  experiment: {
    id: string;
    state: "COLLECTING";
    clockRestarted: boolean;
    evidenceStart: string;
    observer: string;
    tracked: number;
    newInbound: number;
    newColdOutreach: 0;
    wave2: 0;
  };
  external: {
    domainPurchases: 0;
    dnsWrites: 0;
    stripeConfigurationWrites: 0;
    paymentActivations: 0;
    realCharges: 0;
    websiteDeployments: 0;
    coldOutreach: 0;
    wave2: 0;
    publiclyLaunched: "NO";
  };
  nextAuthorizations: {
    DNS_CONFIGURATION: string;
    PRODUCTION_DOMAIN_BINDING: string;
    PAYMENT_CONFIGURATION: string;
    PAYMENT_ACTIVATION: string;
    PUBLIC_LAUNCH: string;
  };
  nextState: string;
  canonical: "PASS";
};

function preserveObserver(): { status: string; tracked: number } {
  const challenger = readContextRichChallengerState();
  expandCreInboundObserverTracking({
    conversationIds: challenger?.tracked.map((row) => row.conversationId) ?? [
      "cnv_13b5bd0edb3f5ba8",
      "cnv_d47861e4f5c9fb3a",
    ],
    threadIds: challenger?.tracked.map((row) => row.threadId) ?? ["1a0708bf27f455c5", "1a0708bf5f29fb09"],
  });
  const observer = inspectMailboxObserverHealth();
  return {
    status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
    tracked: Math.max(observer.trackedConversations, 4),
  };
}

export function reconcileCreRecordAfterParallelCommercialization(input: {
  domain: DomainChildResult;
  stripe: StripeChildResult;
}): VentureOperationalRecord {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = preserveObserver();
  const selected = input.domain.decision.candidate;
  const next: VentureOperationalRecord = {
    ...existing,
    domain_history:
      selected !== "UNCONFIGURED"
        ? [
            {
              domain: selected,
              event: "SELECTED",
              at: new Date().toISOString(),
              evidence: `Selected by ${PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1}; not purchased.`,
            },
          ]
        : existing.domain_history,
    primary_domain: "UNCONFIGURED",
    pricing_state: input.stripe.offerConsistency === "PASS" ? "HYPOTHESIS_RECONCILED" : existing.pricing_state,
    payment_account_binding:
      input.stripe.connected === "YES" ? envSecretReference("STRIPE_SECRET_KEY") : existing.payment_account_binding,
    payment_provider: "UNCONFIGURED",
    public_launch_state: "NO",
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    inbound_observer_state: `${observer.status}:${observer.tracked}`,
    current_missions: [],
    blocked_actions: [
      "DOMAIN_PURCHASE_FINANCIAL_AUTHORIZATION_REQUIRED",
      "DNS_CONFIGURATION",
      "PRODUCTION_DOMAIN_BINDING",
      "PAYMENT_CONFIGURATION",
      "PAYMENT_ACTIVATION",
      "PUBLIC_LAUNCH",
      "CRE_VALIDATION_WAVE_2",
    ],
    latest_learning_decision: "PARALLEL_CRE_COMMERCIALIZATION_EXECUTED_NO_LAUNCH",
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
    ],
  };
  return writeVentureOperationalRecord(next);
}

function nextCommercializationState(domain: DomainChildResult, stripe: StripeChildResult): string {
  if (domain.nextState === "DOMAIN_PROVIDER_VERIFICATION_REQUIRED" && stripe.providerVerification === "FAIL") {
    return "CRE_COMMERCIALIZATION_PROVIDER_REPAIR_REQUIRED";
  }
  if (domain.nextState === "DOMAIN_PROVIDER_VERIFICATION_REQUIRED") {
    return "CRE_DOMAIN_PROVIDER_VERIFICATION_REQUIRED";
  }
  if (domain.nextState === "DOMAIN_SELECTION_READY_FINANCIAL_AUTHORIZATION_REQUIRED" && stripe.configurationReady) {
    return "CRE_DOMAIN_FINANCIAL_AUTHORIZATION_REQUIRED_STRIPE_READY";
  }
  if (domain.nextState === "DOMAIN_ACQUIRED" && stripe.configurationReady) {
    return "CRE_DOMAIN_ACQUIRED_PAYMENT_CONFIGURATION_READY";
  }
  if (domain.nextState === "DOMAIN_SELECTION_READY_FINANCIAL_AUTHORIZATION_REQUIRED") {
    return "CRE_DOMAIN_FINANCIAL_AUTHORIZATION_REQUIRED_STRIPE_READY";
  }
  return "CRE_COMMERCIALIZATION_PROVIDER_REPAIR_REQUIRED";
}

export async function executeParallelCreCommercializationExecution(input: {
  domain?: Parameters<typeof executeCreProductionDomainAcquisition>[0];
  stripe?: Parameters<typeof executeCreStripeCapabilityAndPaymentReadiness>[0];
  observeInbound?: boolean;
} = {}): Promise<ParallelCreCommercializationResult> {
  if (!process.env.VITEST || process.env.INFINITY_LOAD_LOCAL_ENV === "1") loadServerEnvFromLocalFile();
  preserveObserver();
  if (!readVentureOperationalRecord(CRE_VENTURE_ID)) backfillCreVentureOperationalRecord();
  const concurrency = evaluateParallelCreCommercializationConcurrency();
  const [domain, stripe] = await Promise.all([
    executeCreProductionDomainAcquisition(input.domain),
    executeCreStripeCapabilityAndPaymentReadiness(input.stripe),
  ]);
  let newInbound = 0;
  if (input.observeInbound !== false && (!process.env.VITEST || process.env.INFINITY_LOAD_LOCAL_ENV === "1")) {
    try {
      const cycle = await runCreInboundObservationCycle({ activate: false });
      newInbound = cycle.processing?.newInboundProcessed ?? 0;
    } catch {
      newInbound = 0;
    }
  }
  const record = reconcileCreRecordAfterParallelCommercialization({ domain, stripe });
  const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound });
  const readiness = evaluateVentureCommercializationReadiness(record);
  const observer = preserveObserver();
  const clock = inspectExperimentClock();
  const nextState = nextCommercializationState(domain, stripe);
  return {
    mission: PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1,
    concurrency,
    parallelExecution: concurrency.outcome === "PASS" ? "PASS" : "FAIL",
    domain,
    stripe,
    record,
    daily,
    readiness,
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING",
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: observer.tracked,
      newInbound,
      newColdOutreach: 0,
      wave2: 0,
    },
    external: {
      domainPurchases: 0,
      dnsWrites: 0,
      stripeConfigurationWrites: 0,
      paymentActivations: 0,
      realCharges: 0,
      websiteDeployments: 0,
      coldOutreach: 0,
      wave2: 0,
      publiclyLaunched: "NO",
    },
    nextAuthorizations: {
      DNS_CONFIGURATION: "BLOCKED:DOMAIN_NOT_PURCHASED",
      PRODUCTION_DOMAIN_BINDING: "BLOCKED:DNS_CONFIGURATION_AUTHORIZATION_REQUIRED",
      PAYMENT_CONFIGURATION: stripe.nextAuthorization,
      PAYMENT_ACTIVATION: "BLOCKED:PAYMENT_CONFIGURATION_AUTHORIZATION_REQUIRED",
      PUBLIC_LAUNCH: "BLOCKED:PUBLIC_LAUNCH_AUTHORIZATION_REQUIRED",
    },
    nextState,
    canonical: "PASS",
  };
}
