function deriveInfinityDecisionCoreState(input: {
  commandRoomStatus?: string | null;
  nowInspectingStatus?: string | null;
}): "ACTIVE_WORK" | "READY_BLOCKED" | "PRESENT_IDLE" | "FAILED" {
  const status = input.commandRoomStatus ?? input.nowInspectingStatus ?? "";
  if (status === "FAILED") return "FAILED";
  if (status === "ACTIVE_WORK") return "ACTIVE_WORK";
  if (status === "READY_BLOCKED" || status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL") {
    return "READY_BLOCKED";
  }
  return "PRESENT_IDLE";
}

import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import {
  CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2,
  CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2_MISSION_ID,
  OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2_STEPS,
} from "./constants";
import { executeCreOccupancynpvLegalStripeCommercializationAudit } from "./occupancynpv-legal-stripe-audit";

export async function executeCreOccupancynpvLegalStripeCommercializationAuditV2Mission(
  input: Parameters<typeof executeCreOccupancynpvLegalStripeCommercializationAudit>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2_MISSION_ID,
      missionType: CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2,
      source: "cre_occupancynpv_legal_stripe_commercialization_audit_v2",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_OCCUPANCYNPV_LEGAL_STRIPE_AUDIT",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "RECONCILE_INFRASTRUCTURE_STATE",
        engine: "launch_operations",
        summary: "Persisting proven occupancynpv.com DNS, binding, and SSL without rewriting DNS.",
        run: () => executeCreOccupancynpvLegalStripeCommercializationAudit(input),
      });
      await handle.step({
        stepType: "AUDIT_LEGAL_FACTS_AND_SURFACES",
        engine: "quality_control",
        summary: "Auditing legal facts and production privacy/terms without inventing missing facts.",
        run: () => built.legal,
      });
      await handle.step({
        stepType: "VERIFY_STRIPE_ACCOUNT_AND_CAPABILITIES",
        engine: "quality_control",
        summary: "Verifying Stripe identity and read capabilities without activating payments.",
        run: () => built.stripe,
      });
      await handle.step({
        stepType: "RECONCILE_CANONICAL_OFFERS",
        engine: "monetization_engine",
        summary: "Searching existing Professional and Per-deal objects before any write.",
        run: () => ({ professional: built.professional, perDeal: built.perDeal, writes: built.writes }),
      });
      await handle.step({
        stepType: "PLAN_CHECKOUT_WEBHOOK_AND_ANALYTICS",
        engine: "quality_control",
        summary: "Building checkout and webhook plans only, and auditing analytics.",
        run: () => ({ checkout: built.checkout, webhook: built.webhook, analytics: built.analytics }),
      });
      await handle.step({
        stepType: "EVALUATE_PAYMENT_READINESS",
        engine: "quality_control",
        summary: "Running PaymentReadinessGate without activating payments.",
        run: () => built.paymentReadiness,
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Persisting infrastructure and verified bindings without public launch.",
        run: () => built.record,
      });
      await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "inbound_communication",
        summary: "Preserving the CRE experiment clock and inbound observer.",
        run: () => ({ clock: inspectExperimentClock(), observer: inspectMailboxObserverHealth() }),
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "AUDIT_LEGAL_FACTS_AND_SURFACES" },
      { stepType: "VERIFY_STRIPE_ACCOUNT_AND_CAPABILITIES" },
      { stepType: "EVALUATE_PAYMENT_READINESS" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "PRESENT_IDLE",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "ACTIVE_WORK",
      research_department: "PRESENT_IDLE",
      intelligence_center: "PRESENT_IDLE",
      launch_operations: "ACTIVE_WORK",
      growth_department: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2,
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      after: {
        active: after.counts.activeMissions,
        infinityDecisionCore: deriveInfinityDecisionCoreState({
          commandRoomStatus:
            after.nowInspecting.status === "PRESENT_IDLE" ? "PRESENT_IDLE" : after.rooms.executive_office.status,
          nowInspectingStatus: after.nowInspecting.status,
        }),
        fakeContinuousActiveWork: after.counts.activeMissions > 0 || after.nowInspecting.status === "ACTIVE_WORK",
      },
    },
  };
}
