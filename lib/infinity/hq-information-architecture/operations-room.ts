import "server-only";

import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { deriveHqSystemState } from "@/lib/infinity/hq-canonical-projection/system-state";
import { readLiveCommercialCheckoutHealth, readLiveCommercialCheckoutIncident } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import {
  isCanonicalOperatingVenture,
  isCanonicalValidatingVenture,
  isOccupancynpvRecord,
  listCanonicalVenturesForHq,
  mapCanonicalLifecycle,
  projectEvidenceAwareFulfillmentState,
  projectEvidenceAwarePaymentState,
} from "@/lib/infinity/venture-operating-scale/hq-venture-lifecycle";
import {
  occupancynpvGrowthExperimentIsActive,
  readOccupancynpvFirstGrowthExperiment,
} from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import {
  readDailyVentureOperatingRuntime,
  readPostLaunchObservationBaseline,
} from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { readVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/persist";
import type {
  DepartmentUiState,
  OperatorDepartmentSnapshot,
  OperatorRoomArtifact,
  OperatorWorkerNode,
} from "@/lib/infinity/operator-console/types";
import { OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";
import { RUNTIME_UNREACHABLE, type HqProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-projection";
import { financialControlArtifacts } from "@/lib/infinity/venture-financial-governance/projection";
import { materialQcIncidentsForOperations, projectVentureSystemQcHqSummary } from "@/lib/infinity/universal-venture-system-qc/hq";
import { ensureOccupancyNpvCanonicalWork, operationsCopyForWork, projectCanonicalWorkHq } from "@/lib/infinity/canonical-work";

function isOperatingCycleExecuting(runtime: { last_run_at: string | null; last_outcome: string | null } | null): boolean {
  return Boolean(runtime?.last_run_at) && !runtime?.last_outcome;
}

function worker(input: {
  role: string;
  displayRole: string;
  status: DepartmentUiState;
  task: string;
  executing: boolean;
}): OperatorWorkerNode {
  return {
    nodeId: `operations-${input.role.toLowerCase()}`,
    departmentId: OPERATIONS_ROOM_ID,
    role: input.role,
    displayRole: input.displayRole,
    status: input.status,
    task: input.task,
    displayTask: input.task,
    provider: null,
    model: null,
    isActive: input.executing,
    isDormant: !input.executing,
    motionActive: input.executing,
  };
}

export function projectOperationsRoom(
  production?: HqProductionOperatingState | typeof RUNTIME_UNREACHABLE | null,
): {
  department: OperatorDepartmentSnapshot;
  workers: OperatorWorkerNode[];
} {
  const records = listCanonicalVenturesForHq();
  const occupancy = records.find((row) => isOccupancynpvRecord(row)) ?? readVentureOperationalRecord(CRE_VENTURE_ID);
  const askreview = records.find((row) => row.venture_id === ASKREVIEW_VENTURE_ID) ?? readVentureOperationalRecord(ASKREVIEW_VENTURE_ID);
  const runtime = readDailyVentureOperatingRuntime();
  const observations = readPostLaunchObservationBaseline();
  const occupancyLifecycle = occupancy ? mapCanonicalLifecycle(occupancy) : occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" : "UNKNOWN";
  const scheduled = Boolean(runtime?.next_run_at || occupancynpvPubliclyLaunched());
  const growthExperiment = readOccupancynpvFirstGrowthExperiment();
  const growthActive = occupancynpvGrowthExperimentIsActive(growthExperiment);
  const waitingForEvidence = occupancynpvPubliclyLaunched() && observations.observations === 0 && !growthActive;
  const cycleExecuting = isOperatingCycleExecuting(runtime);
  const payment = occupancy ? projectEvidenceAwarePaymentState(occupancy) : { paymentActivation: "NO" as const, payment: "NO" as const };
  const fulfillment = occupancy ? projectEvidenceAwareFulfillmentState(occupancy) : { fulfillmentGate: "FAIL" as const, fulfillment: "BLOCKED" as const };
  const askBlocked = Boolean(askreview?.blocked_actions.length);
  const systemState = deriveHqSystemState({
    activeInteractiveMissions: cycleExecuting ? 1 : 0,
    blockedMissions: 0,
    authorizationRequired: askBlocked,
    scheduledRuntimeActive: scheduled,
    waitingForEvidence,
    criticalFulfillmentAlert: fulfillment.fulfillmentGate === "FAIL" && occupancynpvPubliclyLaunched() === false,
  });
  const operating = occupancy ? isCanonicalOperatingVenture(occupancy) : occupancynpvPubliclyLaunched();
  const validating = askreview ? isCanonicalValidatingVenture(askreview) : false;
  if (!(process.env.VITEST && process.env.INFINITY_CANONICAL_WORK_PERSIST !== "1")) {
    ensureOccupancyNpvCanonicalWork();
  }
  const canonical = projectCanonicalWorkHq();
  const operationsWorkActive =
    canonical.work?.status === "ACTIVE"
    && canonical.work.assigned_rooms.includes(OPERATIONS_ROOM_ID);
  const roomState: DepartmentUiState = canonical.work?.status === "ACTIVE"
    ? "RUNNING"
    : canonical.work?.status === "BLOCKED"
      ? "BLOCKED"
    : cycleExecuting
    ? "RUNNING"
    : systemState === "BLOCKED"
      ? "BLOCKED"
      : systemState === "AUTHORIZATION_REQUIRED"
        ? "BLOCKED"
        : systemState === "WAITING_FOR_EVIDENCE" || scheduled || canonical.work
          ? "WAITING"
          : "UNKNOWN";
  const currentTask = canonical.work
    ? operationsCopyForWork(canonical.work)
    : cycleExecuting
    ? `DailyVentureOperatingCycle executing${runtime?.last_cycle_id ? ` (${runtime.last_cycle_id})` : ""}`
    : growthActive
      ? `OccupancyNPV first growth experiment active · next cycle${runtime?.next_run_at ? ` (${runtime.next_run_at})` : ""}`
      : waitingForEvidence
        ? `Observe until next operating cycle${runtime?.next_run_at ? ` (${runtime.next_run_at})` : ""}`
        : runtime?.last_outcome ?? "Report canonical operating state";
  const occupancyQc = projectVentureSystemQcHqSummary(CRE_VENTURE_ID);
  const workers = [
    worker({
      role: "VENTURE_OPERATOR",
      displayRole: "Venture Operator",
      status: cycleExecuting || operationsWorkActive ? "RUNNING" : operating ? "WAITING" : "UNKNOWN",
      task: operationsWorkActive && canonical.work
        ? operationsCopyForWork(canonical.work)
        : cycleExecuting
        ? `DailyVentureOperatingCycle executing · ${occupancyLifecycle}`
        : `${occupancyLifecycle} · ${observations.observations} real observations`,
      executing: cycleExecuting || operationsWorkActive,
    }),
    worker({
      role: "PORTFOLIO_OPERATOR",
      displayRole: "Portfolio Operator",
      status: scheduled ? "WAITING" : "UNKNOWN",
      task: runtime?.next_run_at ? `Next portfolio/operating cycle ${runtime.next_run_at}` : "No scheduled portfolio cycle",
      executing: false,
    }),
    worker({
      role: "PERFORMANCE_OBSERVER",
      displayRole: "Performance Observer",
      status: waitingForEvidence ? "WAITING" : observations.observations > 0 ? "COMPLETE" : "UNKNOWN",
      task: waitingForEvidence
        ? "0 real observations · waiting for evidence"
        : `${observations.observations} real observations`,
      executing: false,
    }),
    worker({
      role: "PAYMENT_MONITOR",
      displayRole: "Payment Monitor",
      status: readLiveCommercialCheckoutHealth()?.result === "FAIL"
        ? "BLOCKED"
        : payment.payment === "ACTIVE" ? "WAITING" : payment.payment === "BLOCKED" ? "BLOCKED" : "UNKNOWN",
      task: readLiveCommercialCheckoutHealth()?.result === "FAIL"
        ? "PAYMENT / CHECKOUT DEGRADED · live Checkout Session create failed"
        : `Payment ${payment.payment} · path ${readLiveCommercialCheckoutHealth()?.result ?? "UNKNOWN"} · last ${readLiveCommercialCheckoutHealth()?.detectedAt ?? "NEVER"} · next ${readLiveCommercialCheckoutHealth()?.detectedAt ? new Date(new Date(readLiveCommercialCheckoutHealth()!.detectedAt).getTime() + 24 * 60 * 60 * 1000).toISOString() : "UNSCHEDULED"}`,
      executing: false,
    }),
    worker({
      role: "FULFILLMENT_MONITOR",
      displayRole: "Fulfillment Monitor",
      status: fulfillment.fulfillmentGate === "PASS" ? "WAITING" : "BLOCKED",
      task: `Fulfillment ${fulfillment.fulfillment} · gate ${fulfillment.fulfillmentGate}`,
      executing: false,
    }),
    worker({
      role: "GROWTH_OPERATOR",
      displayRole: "Growth Operator",
      status: cycleExecuting ? "RUNNING" : growthActive ? "WAITING" : "UNKNOWN",
      task: production && production !== RUNTIME_UNREACHABLE
        ? `infinity-runtime · ${production.selectedProvider} · raw ${production.funnel.rawDiscovered} · qualified ${production.funnel.qualified} · sent ${production.funnel.sent}`
        : growthActive
        ? `${growthExperiment?.campaign_id ?? "campaign"} · ${growthExperiment?.status ?? "ACTIVE"} · sourced ${growthExperiment?.ledger.prospectsSourced ?? 0} · sent ${growthExperiment?.ledger.attempted ?? 0}`
        : "No OccupancyNPV growth experiment",
      executing: cycleExecuting && growthActive,
    }),
    worker({
      role: "OUTREACH_OPERATOR",
      displayRole: "Outreach Operator",
      status: cycleExecuting ? "RUNNING" : growthActive ? "WAITING" : "UNKNOWN",
      task: growthActive
        ? `Recipient-local windows · replies ${growthExperiment?.ledger.replied ?? 0} · deliverability unmeasured until send`
        : "No outreach campaign executing",
      executing: cycleExecuting && growthActive,
    }),
    worker({
      role: "QC_MONITOR",
      displayRole: "Venture QC Monitor",
      status: occupancyQc.overall === "PASS" ? "WAITING" : "BLOCKED",
      task: `OccupancyNPV QC ${occupancyQc.overall} · coverage ${occupancyQc.coverage_percent}% · incidents ${occupancyQc.current_incidents.join(", ") || "NONE"}`,
      executing: false,
    }),
    worker({
      role: "RECOVERY_OPERATOR",
      displayRole: "Recovery Operator",
      status: readLiveCommercialCheckoutIncident()?.status === "OPEN"
        ? "BLOCKED"
        : readLiveCommercialCheckoutIncident()?.status === "RESOLVED"
          ? "WAITING"
          : askBlocked ? "UNKNOWN" : "UNKNOWN",
      task: readLiveCommercialCheckoutIncident()?.status === "OPEN"
        ? `${readLiveCommercialCheckoutIncident()?.classification} · ${readLiveCommercialCheckoutIncident()?.repairMission}`
        : readLiveCommercialCheckoutIncident()?.status === "RESOLVED"
          ? `${readLiveCommercialCheckoutIncident()?.repairMission} · COMPLETED`
          : askBlocked
            ? `AskReview paused · ${askreview?.blocked_actions[0] ?? "SELECTION_UNDER_REVIEW"}`
            : "No recovery action required",
      executing: false,
    }),
  ];

  const artifacts: OperatorRoomArtifact[] = [
    { id: "ops-system", label: `System ${systemState}`, tone: waitingForEvidence ? "pending" : "neutral" },
    { id: "ops-runtime", label: runtime?.last_cycle_id ?? "No cycle yet", tone: "neutral" },
  ];
  if (runtime?.last_outcome) {
    artifacts.push({ id: "ops-last-outcome", label: `Operating cycle: ${runtime.last_outcome}`, tone: "neutral" });
  }
  const checkoutHealth = readLiveCommercialCheckoutHealth();
  const checkoutIncident = readLiveCommercialCheckoutIncident();
  if (checkoutHealth?.result === "FAIL" || checkoutIncident?.status === "OPEN") {
    artifacts.push({
      id: "ops-checkout-incident",
      label: `OccupancyNPV PAYMENT / CHECKOUT DEGRADED · ${checkoutIncident?.classification ?? "HIGH_PRIORITY_COMMERCIAL_INCIDENT"}`,
      tone: "warning",
    });
    artifacts.push({
      id: "ops-checkout-repair",
      label: `${checkoutIncident?.repairMission ?? "OCCUPANCYNPV_LIVE_CHECKOUT_REGRESSION_REPAIR_V1"} · ${checkoutIncident?.status ?? "OPEN"}`,
      tone: "pending",
    });
  } else if (checkoutIncident?.status === "RESOLVED") {
    artifacts.push({
      id: "ops-checkout-incident-resolved",
      label: `OccupancyNPV checkout incident RESOLVED · ${checkoutIncident.repairMission} COMPLETED`,
      tone: "success",
    });
    artifacts.push({ id: "ops-payment", label: "Payment health check passed", tone: "success" });
  } else if (payment.payment === "ACTIVE") {
    artifacts.push({ id: "ops-payment", label: "Payment health check passed", tone: "success" });
  }
  if (fulfillment.fulfillmentGate === "PASS") {
    artifacts.push({ id: "ops-fulfillment", label: "Fulfillment check passed", tone: "success" });
  }
  if (production === RUNTIME_UNREACHABLE) {
    artifacts.push({
      id: "ops-runtime-unreachable",
      label: "RUNTIME_UNREACHABLE — production operating state not silently replaced by local working-tree counts",
      tone: "warning",
    });
  } else if (production) {
    artifacts.push({
      id: "ops-production-runtime",
      label: `${production.runtime.project} · ${production.selectedProvider} · last ${production.cycle.lastCycleAt ?? "UNKNOWN"} · next ${production.cycle.nextCycleAt}`,
      tone: "neutral",
    });
    artifacts.push({
      id: "ops-production-funnel",
      label: `Discovery ${production.funnel.rawDiscovered} raw / ${production.funnel.relevant} relevant / ${production.funnel.qualified} qualified · ${production.funnel.queueState} depth ${production.durableQueue?.depth ?? production.funnel.durableQueueDepth ?? production.funnel.queuedCycleLocal} · waiting ${production.durableQueue?.waitingForWindow ?? 0} · sent ${production.funnel.sent}`,
      tone: "neutral",
    });
    artifacts.push({
      id: "ops-production-durable-work",
      label: production.workers.executionsRunning > 0
        ? `Runtime work: sourcing/queue/send/replies/follow-up · ${production.durableQueue?.nextSourceDecision ?? "cycle"}`
        : `No runtime execution this moment · cron is scheduled, not active work · next source ${production.durableQueue?.nextSourceDecision ?? "UNKNOWN"}`,
      tone: "neutral",
    });
    artifacts.push({
      id: "ops-production-gmail",
      label: `Gmail ${production.gmail} · incidents ${production.incidents.activeSelectedProvider}`,
      tone: production.gmail === "PASS" ? "success" : "warning",
    });
  }
  if (growthActive) {
    artifacts.push({
      id: "ops-growth-campaign",
      label: production && production !== RUNTIME_UNREACHABLE
        ? `OccupancyNPV outbound validation ${production.campaign.status} · sourced ${production.funnel.rawDiscovered} · sent ${production.funnel.sent} · replies ${production.funnel.replied}`
        : `OccupancyNPV growth campaign ${growthExperiment?.status ?? "ACTIVE"} · sourced ${growthExperiment?.ledger.prospectsSourced ?? 0} · sent ${growthExperiment?.ledger.attempted ?? 0} · replies ${growthExperiment?.ledger.replied ?? 0}`,
      tone: "neutral",
    });
    artifacts.push({
      id: "ops-growth-next",
      label: `Next growth cycle ${runtime?.next_run_at ?? "scheduled"} · ${growthExperiment?.next_learning_objective ?? "source qualified prospects"}`,
      tone: "pending",
    });
    artifacts.push({
      id: "ops-growth-send-window",
      label: production && production !== RUNTIME_UNREACHABLE
        ? `Next send window: ${production.nextSendWindow} · ${production.funnel.queueState}`
        : (growthExperiment?.ledger.prospectsQualified ?? 0) > 0
        ? "Next send window: recipient-local 08:30–10:30 or 13:00–15:00"
        : "Next send window: none — no qualified prospects queued",
      tone: "pending",
    });
  }
  if (waitingForEvidence) {
    artifacts.push({ id: "ops-performance", label: "Performance observation: 0 real observations", tone: "pending" });
  }
  for (const item of financialControlArtifacts()) {
    artifacts.push({ id: item.id, label: item.label, tone: item.tone });
  }
  for (const item of materialQcIncidentsForOperations(occupancyQc)) {
    artifacts.push({ id: item.id, label: item.label, tone: item.tone });
  }
  if (occupancyQc.unknown_systems.length > 0) {
    artifacts.push({
      id: "ops-qc-unknown",
      label: `Venture QC unknown systems: ${occupancyQc.unknown_systems.join(", ")}`,
      tone: "pending",
    });
  }

  return {
    department: {
      id: OPERATIONS_ROOM_ID,
      label: "Operations Room",
      state: roomState,
      engines: [],
      summary: `System ${systemState} · operating ${operating ? 1 : 0} · validating ${validating ? 1 : 0}`,
      currentTask,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: runtime?.last_run_at ?? null,
      lastActivityAt: runtime?.last_run_at ?? null,
      recordCount: workers.length,
      isActive: cycleExecuting || canonical.work?.status === "ACTIVE",
      detail: {
        showWorkers: true,
        systemState,
        currentWork: currentTask,
        scheduled: production && production !== RUNTIME_UNREACHABLE ? production.cycle.nextCycleAt : runtime?.next_run_at ?? null,
        productionRuntime: production === RUNTIME_UNREACHABLE ? { status: RUNTIME_UNREACHABLE } : production,
        canonicalWorkStatus: canonical.work?.status ?? null,
        canonicalWorkTitle: canonical.work?.title ?? null,
        nextExpectedTransition: canonical.work?.next_expected_transition ?? null,
        assignedRooms: canonical.work?.assigned_rooms ?? [],
        assignedWorkers: canonical.work?.assigned_workers ?? [],
      },
      isNextMissionTarget: false,
      artifacts,
    },
    workers,
  };
}
