import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { listVentureOperationalRecords } from "./persist";
import { orderedCommercializationBlockers } from "./readiness";
import type {
  DailyVentureOperatingCycleResult,
  PortfolioOperatingCycleResult,
  VentureOperatingSnapshot,
  VentureOperationalRecord,
} from "./types";

function snapshotFromRecord(record: VentureOperationalRecord, newInbound: number): VentureOperatingSnapshot {
  const observer = inspectMailboxObserverHealth();
  void observer;
  const inboundIdle =
    newInbound === 0 &&
    record.operating_stage === "VALIDATING" &&
    record.public_launch_state === "NO";
  const concreteCommercialization =
    record.domain_history.some((row) => row.event === "SELECTED" || row.event === "PURCHASED") ||
    record.pricing_state === "HYPOTHESIS_RECONCILED" ||
    record.payment_products.length > 0 ||
    record.legal_configuration_state !== "UNCONFIGURED";
  const commercializationPending = record.blocked_actions.some(
    (row) => /DOMAIN|PAYMENT|DNS|LAUNCH|LEGAL|CHECKOUT|WEBHOOK|NAMECHEAP|STRIPE|PROVIDER/i.test(row),
  );
  const providerAccessBlocked = record.blocked_actions.some(
    (row) => /NAMECHEAP_ACCOUNT_ACTION|STRIPE_ACCOUNT_ACTION|PROVIDER_ACCOUNT|API_USER_BLOCKED/i.test(row),
  ) || /NAMECHEAP_API_USER_BLOCKED|PROVIDER_ACCOUNT_BLOCKED/i.test(record.domain_registration_state);
  const idle = inboundIdle && !concreteCommercialization && !providerAccessBlocked;
  const launchedSteady =
    record.public_launch_state === "YES"
    && newInbound === 0
    && record.blocked_actions.length === 0
    && !providerAccessBlocked;
  const experimentWaiting = record.current_experiment !== "UNCONFIGURED" && newInbound === 0;
  const nextWork = launchedSteady
    ? []
    : providerAccessBlocked || concreteCommercialization
      ? orderedCommercializationBlockers(record)
      : idle
        ? ["WAIT_FOR_INBOUND_OR_SEPARATE_COMMERCIALIZATION_AUTHORIZATION"]
        : ["EVALUATE_EXISTING_GOVERNED_ENGINES"];
  return {
    ventureId: record.venture_id,
    currentStage: record.operating_stage,
    publicStatus: record.public_launch_state,
    revenueStatus: record.revenue_state,
    trafficPerformanceState: record.current_metric_state,
    activeExperiments: record.current_experiment === "UNCONFIGURED" ? [] : [record.current_experiment],
    activeMissions: record.current_missions,
    newInbound,
    blockedActions: record.blocked_actions,
    importantChangesSincePriorCycle: idle ? [] : ["operating_record_reconciled"],
    learningSignals: [
      ...(idle ? [] : ["foundation_ready"]),
      ...(experimentWaiting ? ["experiment_waiting_externally"] : []),
      ...(record.primary_domain === "UNCONFIGURED" || record.domain_history.some((row) => row.event === "SELECTED")
        ? ["domain_acquisition_status"]
        : []),
      ...(record.payment_provider === "UNCONFIGURED" || record.pricing_state === "HYPOTHESIS_RECONCILED"
        ? ["payment_verification_status"]
        : []),
      ...(commercializationPending ? ["commercialization_blockers_present"] : []),
      ...(providerAccessBlocked ? ["provider_access_blocker"] : []),
    ],
    nextGovernedWork: nextWork,
    riskAlerts: [],
    dailyResult: launchedSteady
      ? "NO_ACTION_REQUIRED"
      : concreteCommercialization || !idle
        ? "ORCHESTRATE_EXISTING_ENGINES"
        : "NO_ACTION_REQUIRED",
  };
}

export function runDailyVentureOperatingCycle(input: {
  ventureId: string;
  newInbound?: number;
} ): DailyVentureOperatingCycleResult {
  const record = listVentureOperationalRecords().find((row) => row.venture_id === input.ventureId);
  if (!record) {
    return {
      orchestrator: "DailyVentureOperatingCycle",
      replacesDecisionEngine: false,
      snapshot: {
        ventureId: input.ventureId,
        currentStage: "DISCOVERY",
        publicStatus: "NO",
        revenueStatus: "UNCONFIGURED",
        trafficPerformanceState: "UNKNOWN",
        activeExperiments: [],
        activeMissions: [],
        newInbound: 0,
        blockedActions: [],
        importantChangesSincePriorCycle: [],
        learningSignals: [],
        nextGovernedWork: ["BACKFILL_VENTURE_OPERATIONAL_RECORD"],
        riskAlerts: ["RECORD_MISSING"],
        dailyResult: "NO_ACTION_REQUIRED",
      },
      enginesConsulted: [
        "Decision Engine",
        "Performance Intelligence",
        "Economic Action Governance",
        "Mission Runtime",
        "Communication Runtime",
        "Deployment Governance",
        "Treasury",
        "Validation systems",
      ],
      commercializationWorkRecognized: false,
      externalWaitingRecognized: false,
      providerAccessBlockerRecognized: false,
    };
  }
  void inspectExperimentClock();
  void LOCKED_CRE_EXPERIMENT_ID;
  const snapshot = snapshotFromRecord(record, input.newInbound ?? 0);
  return {
    orchestrator: "DailyVentureOperatingCycle",
    replacesDecisionEngine: false,
    snapshot,
    enginesConsulted: [
      "Decision Engine",
      "Performance Intelligence",
      "Economic Action Governance",
      "Mission Runtime",
      "Communication Runtime",
      "Deployment Governance",
      "Treasury",
      "Validation systems",
    ],
    commercializationWorkRecognized:
      snapshot.learningSignals.includes("domain_acquisition_status") ||
      snapshot.learningSignals.includes("payment_verification_status") ||
      snapshot.learningSignals.includes("commercialization_blockers_present") ||
      snapshot.learningSignals.includes("provider_access_blocker"),
    externalWaitingRecognized: snapshot.learningSignals.includes("experiment_waiting_externally"),
    providerAccessBlockerRecognized: snapshot.learningSignals.includes("provider_access_blocker"),
  };
}

export function runPortfolioOperatingCycle(): PortfolioOperatingCycleResult {
  return {
    orchestrator: "PortfolioOperatingCycle",
    secondDecisionEngineCreated: false,
    ventures: listVentureOperationalRecords().map((row) => ({
      ventureId: row.venture_id,
      health: row.risk_state,
      commercializationState: row.commercialization_state,
      revenue: row.revenue_state,
      growth: row.acquisition_state,
      experiments: row.current_experiment === "UNCONFIGURED" ? [] : [row.current_experiment],
      blockedActions: row.blocked_actions,
      missionActivity: row.current_missions[0] ?? "IDLE",
      economicOpportunities: [],
      risk: row.risk_state,
    })),
  };
}
