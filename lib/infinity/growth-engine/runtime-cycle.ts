import { advanceOccupancynpvGrowthExperiment } from "./occupancynpv-experiment";
import {
  evaluateFulfillmentReadinessFromHealth,
  evaluateLiveCommercialCheckoutHealthFromRecord,
  evaluatePaymentPathReadinessFromHealth,
  liveCommercialCheckoutUnhealthy,
} from "./commercial-readiness";
import { evaluateStaleGrowthScheduleGate, nextHourlyRunAt } from "./stale-schedule";
import { evaluateOutboundSchedulerWindowCoverageGate } from "./scheduler-coverage";
import { executeAutonomousSalesCycle } from "@/lib/infinity/autonomous-sales-execution/cycle";
import { executeProspectIntelligenceCycle } from "@/lib/infinity/prospect-intelligence/cycle";
import { hydrateDefaultProspectGraph, persistProspectGraph } from "@/lib/infinity/prospect-intelligence/durable";
import { resolveApprovedCanaryCandidates } from "@/lib/infinity/production-outbound/canary-contact";
import { createProspectIntelligenceService } from "@/lib/infinity/prospect-intelligence/service";
import { getDefaultProspectGraph } from "@/lib/infinity/prospect-intelligence/store";
import { executeSalesLearningTick } from "@/lib/infinity/sales-learning/cycle";
import { hydrateSalesLearningState, persistSalesLearningState } from "@/lib/infinity/sales-learning/persist";
import { getDefaultSalesLearningState } from "@/lib/infinity/sales-learning/store";
import { loadProductionOutboundControl } from "@/lib/infinity/production-outbound/control";
import { executeProductionOutboundTickAsync } from "@/lib/infinity/production-outbound/cycle";
import { liveGmailOutboundAdapter } from "@/lib/infinity/production-outbound/live-provider";
import { hydrateProductionOutboundState, persistProductionOutboundState } from "@/lib/infinity/production-outbound/persist";
import { probeGmailProviderHealth } from "@/lib/infinity/production-outbound/provider";
import { ingestClosedLoopPerformanceObservations, ingestOutboundPerformanceObservations } from "@/lib/infinity/production-outbound/performance";
import { resolveGmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { observeOccupancynpvCanaryInbound } from "@/lib/infinity/production-outbound/canary-inbound";
import {
  founderDailyOutboundEventTitles,
  getClosedLoopDurableState,
  hydrateClosedLoopDurableState,
  persistClosedLoopDurableState,
} from "@/lib/infinity/production-outbound/closed-loop-durable";
import { getDefaultProductionOutboundState } from "@/lib/infinity/production-outbound/store";
import { publishCanonicalPublicOccupancy, salesSnapshotToOccupancy } from "@/lib/infinity/public-operations-projection/publish-occupancy";
import { loadInternalPublicObservation } from "@/lib/infinity/public-operations-projection/sources";
import { executeOrganicContinuousTick } from "@/lib/infinity/organic-growth-engine/continuous/cycle";
import { hydrateOrganicContinuousState, persistOrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/persist";
import { getOrganicContinuousState, replaceOrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/store";
import { projectPublicOrganicActivity } from "@/lib/infinity/organic-growth-engine/continuous/public";
import { generateAndPersistFounderDailyReportDurable } from "@/lib/infinity/founder-daily-reports";

export async function executeOccupancynpvGrowthRuntimeCycle(input: {
  persist?: boolean;
  now?: string;
} = {}) {
  const now = input.now ? new Date(input.now) : new Date();
  const experiment = advanceOccupancynpvGrowthExperiment({ persist: input.persist, now: now.toISOString() });
  const nextRunAt = nextHourlyRunAt(now);
  const stale = evaluateStaleGrowthScheduleGate({ nextRunAt, now: now.toISOString() });
  const isolated = process.env.INFINITY_CLOUD_RUNTIME === "1" || process.env.VERCEL === "1";
  const service = createProspectIntelligenceService(getDefaultProspectGraph());
  const prospect = await executeProspectIntelligenceCycle({
    service,
    now: now.toISOString(),
    watching: true,
    acquire: true,
  });
  const sales = executeAutonomousSalesCycle({
    now: now.toISOString(),
    executeSend: false,
    isolated_runtime: isolated,
    candidates: [],
  });
  const outboundState = getDefaultProductionOutboundState();
  outboundState.control = loadProductionOutboundControl();
  const liveCandidates = resolveApprovedCanaryCandidates();
  const gmailContext = resolveGmailInvocationContext({ trigger_source: isolated ? "VERCEL_CRON" : "HTTP" });
  const gmail = await probeGmailProviderHealth();
  const provider = liveGmailOutboundAdapter(process.env, gmail, gmailContext);
  const outbound = await executeProductionOutboundTickAsync({
    state: outboundState,
    candidates: liveCandidates,
    now: now.toISOString(),
    isolated_runtime: isolated,
    provider,
    execute_provider: isolated
      && outboundState.control.mode !== "DISABLED"
      && !outboundState.control.kill_switch
      && gmail.healthy,
  });
  const learning = executeSalesLearningTick({
    now: now.toISOString(),
    ready_inventory: prospect.ready_prospects,
    qualified_pipeline: sales.qualified_prospects,
    run_simulations: true,
    observe: outbound.sent > 0
      ? outbound.state.outbox.filter((row) => row.status === "SENT" || row.status === "DELIVERED").slice(-1).map((row) => ({
        prospect_id: row.prospect_id,
        turns: [{ actor: "SYSTEM" as const, action: "send", text: "Authorized canary outbound accepted by the provider.", at: now.toISOString() }],
        outcome: "sent",
        qualification_signals: [
          "canary_authorized_send",
          `guidance:${getDefaultSalesLearningState().guidance[0]?.guidance_id ?? "unknown"}:${getDefaultSalesLearningState().guidance[0]?.version ?? "unknown"}`,
        ],
        used_known_context: true,
      }))
      : [],
  });
  const inbound = await observeOccupancynpvCanaryInbound({
    now: now.toISOString(),
    worker_running: isolated,
    provider: isolated ? provider : undefined,
    gmailContext,
  }).catch(() => null);
  const performance = ingestOutboundPerformanceObservations(outbound.state);
  const closedLoopPerformance = ingestClosedLoopPerformanceObservations(getClosedLoopDurableState());
  const organicTick = executeOrganicContinuousTick({
    state: getOrganicContinuousState("occupancynpv"),
    now: now.toISOString(),
    execute_publish: false,
    website_approved: true,
    publishing_enabled: true,
    venture_active: true,
    questions: [],
  });
  replaceOrganicContinuousState("occupancynpv", organicTick.state);
  return {
    cycleId: `cycle_occupancynpv_growth_${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}`,
    experimentStatus: experiment.status,
    checkoutUnhealthy: liveCommercialCheckoutUnhealthy(),
    payment: evaluatePaymentPathReadinessFromHealth(),
    checkout: evaluateLiveCommercialCheckoutHealthFromRecord(),
    fulfillment: evaluateFulfillmentReadinessFromHealth(),
    scheduler: evaluateOutboundSchedulerWindowCoverageGate({ cronExpressions: ["0 * * * *"] }),
    staleSchedule: stale,
    nextRunAt,
    sent: outbound.sent,
    sales,
    prospect,
    learning,
    outbound,
    inbound,
    provider: {
      healthy: gmail.healthy,
      token_exchange: Boolean(gmail.token_exchange),
      send_scope: Boolean(gmail.send_scope),
      readonly_scope: Boolean(gmail.readonly_scope),
      userinfo_scope: Boolean(gmail.userinfo_scope),
      sending_identity_verified: gmail.sending_identity_verified,
      credential_fingerprint: gmail.credential_fingerprint ?? null,
      reasons: gmail.reasons,
    },
    performance: {
      events: performance.events.length + closedLoopPerformance.events.length,
      observations: performance.results.length + closedLoopPerformance.results.length,
    },
    organic: {
      occupancy: organicTick.occupancy,
      published_today: organicTick.state.published_today,
      queued: organicTick.state.queue.length,
      public_activity: organicTick.public_activity,
    },
  };
}

export async function executeOccupancynpvGrowthRuntimeCycleDurable(input: {
  persist?: boolean;
  now?: string;
} = {}) {
  try {
    await hydrateDefaultProspectGraph();
    await hydrateSalesLearningState(getDefaultSalesLearningState());
    await hydrateProductionOutboundState(getDefaultProductionOutboundState());
    await hydrateClosedLoopDurableState();
    await hydrateOrganicContinuousState(getOrganicContinuousState("occupancynpv"));
  } catch {
    // Missing or ephemeral cloud state must not block inbound recovery.
  }
  const result = await executeOccupancynpvGrowthRuntimeCycle(input);
  try {
    await persistSalesLearningState(getDefaultSalesLearningState());
    await persistProductionOutboundState(getDefaultProductionOutboundState());
    await persistClosedLoopDurableState();
    await persistOrganicContinuousState(getOrganicContinuousState("occupancynpv"));
  } catch {
    // Cloud persist failures must not discard inbound observation or grant proof.
  }
  try {
    await persistProspectGraph();
  } catch {
    // Prospect identifier upsert collisions must not block sales-learning durability.
  }
  const now = input.now ?? new Date().toISOString();
  const observation = loadInternalPublicObservation({ now });
  const sales = salesSnapshotToOccupancy({
    ...result.sales,
    attempted: result.sent,
    training_active: result.learning.training_active,
  });
  await publishCanonicalPublicOccupancy({
    now,
    loop: observation.loop,
    prospect: { activity: result.prospect.activity },
    sales,
    organic: { occupancy: projectPublicOrganicActivity(getOrganicContinuousState("occupancynpv"), {
      publishing_hold: null,
    }).occupancy },
  }).catch(() => undefined);
  await generateAndPersistFounderDailyReportDurable({
    now,
    outreach_sent: result.sent ?? getDefaultProductionOutboundState().metrics.sent,
    outreach_authorized: getDefaultProductionOutboundState().metrics.authorized,
    outbound_events: founderDailyOutboundEventTitles(getClosedLoopDurableState()),
    treasury_verification: "UNKNOWN",
  }).catch(() => undefined);
  return result;
}
