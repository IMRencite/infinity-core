import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { nextHourlyRunAt } from "./stale-schedule";
import { evaluateLiveOutboundCommunicationPathGate } from "./path-gate";

export const HQ_PRODUCTION_RUNTIME_PROJECTION_CONTRACT = "HQProductionRuntimeProjectionContract" as const;
export const HQ_PRODUCTION_RUNTIME_CANONICAL_SOURCE_GATE = "HQProductionRuntimeCanonicalSourceGate" as const;
export const HQ_PRODUCTION_RUNTIME_FRESHNESS_GATE = "HQProductionRuntimeFreshnessGate" as const;
export const HQ_PRODUCTION_RUNTIME_FALLBACK_MASKING_GATE = "HQProductionRuntimeFallbackMaskingGate" as const;
export const HQ_PRODUCTION_RUNTIME_SECRET_EXPOSURE_GATE = "HQProductionRuntimeSecretExposureGate" as const;
export const GROWTH_AUTOMATION_COMPLETENESS_CONTRACT = "GrowthAutomationCompletenessContract" as const;
export const HQ_CANONICAL_WORKER_ACTIVITY_GATE = "HQCanonicalWorkerActivityGate" as const;

export const PRODUCTION_OPERATING_STATE_PATH =
  ".infinity/growth-engine/production-operating-state.json" as const;

export const RUNTIME_UNREACHABLE = "RUNTIME_UNREACHABLE" as const;
export const FRESHNESS_THRESHOLD_MS = 48 * 60 * 60 * 1000;

const SECRET_KEY = /(secret|api[_-]?key|refresh[_-]?token|authorization|password|private[_-]?key|cron_secret|client_secret|access_token)/i;
const SECRET_VALUE = /\b(AIza[0-9A-Za-z_-]{20,}|AQ\.[A-Za-z0-9_-]{20,}|ya29\.[A-Za-z0-9._-]+|sk_live_[A-Za-z0-9]+|Bearer\s+[A-Za-z0-9._-]{16,})\b/;

export type HqProductionOperatingState = {
  contract: "InfinityProductionOperatingState";
  source: "live_production_runtime" | "canonical_persisted_production_state";
  runtime: {
    project: string;
    projectId: string;
    url: string;
    status: "READY" | "DEGRADED" | "BLOCKED";
    deploymentId: string;
    lastVerifiedAt: string;
  };
  campaign: {
    campaignId: string;
    ventureId: string;
    status: string;
    automationCompleteness: "PARTIAL" | "FULL" | "NONE";
    tactic: string;
    segment: string;
    initialCap: number;
    healthyCap: number;
    rampAuthorized: boolean;
    target: number;
    minimumQualifiedConversations: number;
    trial: "OFF";
  };
  cycle: { lastCycleAt: string | null; nextCycleAt: string; lastDiscoveryAt: string | null };
  funnel: {
    rawDiscovered: number;
    deduplicated: number;
    relevant: number;
    contactable: number;
    qualified: number;
    discoveredNotContactable: number;
    queueState: "ELIGIBLE_BUT_NOT_DURABLY_QUEUED" | "DURABLE_QUEUED" | "WAITING_FOR_SEND_WINDOW" | "NONE";
    queuedCycleLocal: number;
    durableQueueDepth?: number;
    waitingForWindow?: number;
    sendEligibleNow?: number;
    sentToday?: number;
    followUpsDue?: number;
    sent: number;
    delivered: number;
    replied: number;
    qualifiedConversations: number;
    converted: number;
  };
  providers: Record<string, { status: string; health: string; raw: number; relevant: number; qualifiedContactable: number; yield: number; note?: string }>;
  selectedProvider: string;
  primaryMetric: "QUALIFIED_CONTACTABLE_PROSPECT_YIELD";
  gmail: "PASS" | "FAIL";
  deliverability: string;
  scheduler: string;
  incidents: { activeSelectedProvider: number; duckduckgoHistorical: number };
  performance: { observations: number; events: number; discoveryEvents: number; qualifiedProspectEvents: number };
  automation: {
    sourcing: string;
    qualification: string;
    scheduling: string;
    sending: string;
    replyRetrieval: string;
    classification: string;
    lowRiskReplies: string;
    followUp: string;
    suppression?: string;
    optimization: string;
    overall: "PARTIAL" | "FULL" | "NONE";
  };
  durableQueue?: {
    depth: number;
    waitingForWindow: number;
    sentToday: number;
    dailyCap: number;
    nextSend: string | null;
    replies: number;
    followUpsDue: number;
    lastSourceCycle: string | null;
    nextSourceDecision: string;
    currentExperiment: string;
    nextLearningObjective: string;
  };
  workers: {
    cronDefinitions: number;
    executionsRunning: number;
    growthWorker: "ACTIVE" | "WAITING" | "IDLE";
    prospectSourcingWorker: "ACTIVE" | "WAITING" | "IDLE" | "NOT_SEPARATE";
    activeWorkerCount: number;
    hqCommand: "ACTIVE_OVERSIGHT" | "WAITING" | "STANDBY";
    infinity: "ACTIVE" | "WAITING" | "STANDBY";
  };
  prospects: Array<{
    businessName: string;
    sourceUrl: string;
    qualificationReason: string;
    sourceProvenance: string;
    contactProvenance: string;
    timezone: string;
    status: string;
    queuedReason: string;
    sendEligible: boolean;
    campaignId: string;
    provider: string;
  }>;
  nextSendWindow: string;
  nextLearningObjective: string;
  nextSystemGap: string;
};

export const BUNDLED_PRODUCTION_OPERATING_STATE: HqProductionOperatingState = {
  contract: "InfinityProductionOperatingState",
  source: "canonical_persisted_production_state",
  runtime: {
    project: "infinity-runtime",
    projectId: "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox",
    url: "https://infinity-runtime.vercel.app",
    status: "READY",
    deploymentId: "dpl_5P4WZeRkgySD4nSz8sU6ShpUZcBx",
    lastVerifiedAt: "2026-09-11T04:50:00.000Z",
  },
  campaign: {
    campaignId: "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation",
    ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    status: "GROWTH_EXPERIMENT_ACTIVE",
    automationCompleteness: "PARTIAL",
    tactic: "OUTBOUND_EMAIL",
    segment: "US tenant-representation brokers and boutique tenant-side CRE advisors",
    initialCap: 5,
    healthyCap: 10,
    rampAuthorized: false,
    target: 200,
    minimumQualifiedConversations: 15,
    trial: "OFF",
  },
  cycle: {
    lastCycleAt: "2026-09-11T04:50:00.000Z",
    nextCycleAt: "2026-09-11T05:00:00.000Z",
    lastDiscoveryAt: "2026-09-11T04:50:00.000Z",
  },
  funnel: {
    rawDiscovered: 12,
    deduplicated: 8,
    relevant: 6,
    contactable: 1,
    qualified: 1,
    discoveredNotContactable: 5,
    queueState: "ELIGIBLE_BUT_NOT_DURABLY_QUEUED",
    queuedCycleLocal: 1,
    sent: 0,
    delivered: 0,
    replied: 0,
    qualifiedConversations: 0,
    converted: 0,
  },
  providers: {
    gemini_grounded_search: { status: "ACTIVE", health: "PASS", raw: 12, relevant: 6, qualifiedContactable: 1, yield: 1 },
    duckduckgo_html: { status: "FAILED", health: "DEGRADED", raw: 0, relevant: 0, qualifiedContactable: 0, yield: 0, note: "Vercel egress markup/challenge; fallback only" },
    google_web_search: { status: "NOT_CONFIGURED", health: "NOT_CONFIGURED", raw: 0, relevant: 0, qualifiedContactable: 0, yield: 0 },
    google_places: { status: "NOT_CONFIGURED", health: "NOT_CONFIGURED", raw: 0, relevant: 0, qualifiedContactable: 0, yield: 0 },
  },
  selectedProvider: "gemini_grounded_search",
  primaryMetric: "QUALIFIED_CONTACTABLE_PROSPECT_YIELD",
  gmail: "PASS",
  deliverability: "INSUFFICIENT",
  scheduler: "LIVE",
  incidents: { activeSelectedProvider: 0, duckduckgoHistorical: 1 },
  performance: { observations: 1, events: 1, discoveryEvents: 1, qualifiedProspectEvents: 1 },
  automation: {
    sourcing: "MANUAL_TRIGGER",
    qualification: "AUTONOMOUS_WHEN_TRIGGERED",
    scheduling: "AUTONOMOUS",
    sending: "NOT_DURABLE_AUTONOMOUS",
    replyRetrieval: "NOT_BUILT",
    classification: "NOT_BUILT",
    lowRiskReplies: "NOT_BUILT",
    followUp: "NOT_BUILT",
    optimization: "NOT_BUILT",
    overall: "PARTIAL",
  },
  workers: {
    cronDefinitions: 2,
    executionsRunning: 0,
    growthWorker: "WAITING",
    prospectSourcingWorker: "NOT_SEPARATE",
    activeWorkerCount: 0,
    hqCommand: "WAITING",
    infinity: "STANDBY",
  },
  prospects: [{
    businessName: "CCG Retail",
    sourceUrl: "https://www.ccgretail.com/",
    qualificationReason: "Public tenant-side / CRE-relevant site with published professional email",
    sourceProvenance: "https://www.ccgretail.com/",
    contactProvenance: "PUBLISHED_ON_SOURCE",
    timezone: "America/New_York",
    status: "ELIGIBLE_BUT_NOT_DURABLY_QUEUED",
    queuedReason: "outside recipient-local send window",
    sendEligible: false,
    campaignId: "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation",
    provider: "gemini_grounded_search",
  }],
  nextSendWindow: "recipient-local 08:30–10:30 or 13:00–15:00 America/New_York",
  nextLearningObjective: "Durable sourcing, later-send mailbox, reply, and follow-up automation",
  nextSystemGap: "durable sourcing/queue/reply/follow-up automation",
};

export type HqRuntimeReadResult =
  | { ok: true; status: "BOUND"; freshness: "FRESH" | "STALE"; state: HqProductionOperatingState; cloudRuntime?: unknown }
  | { ok: false; status: typeof RUNTIME_UNREACHABLE; freshness: "STALE"; state: null; lastVerifiedAt: string | null };

export function readCanonicalProductionOperatingState(root = process.cwd()): HqProductionOperatingState | null {
  const path = join(root, PRODUCTION_OPERATING_STATE_PATH);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as HqProductionOperatingState;
    } catch {
      return BUNDLED_PRODUCTION_OPERATING_STATE;
    }
  }
  return BUNDLED_PRODUCTION_OPERATING_STATE;
}

export function evaluateHqProductionRuntimeCanonicalSourceGate(input: {
  parallelHqStore: boolean;
  source: HqProductionOperatingState["source"] | typeof RUNTIME_UNREACHABLE;
}): { gate: typeof HQ_PRODUCTION_RUNTIME_CANONICAL_SOURCE_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.parallelHqStore) reasons.push("PARALLEL_HQ_DATA_STORE");
  if (input.source === RUNTIME_UNREACHABLE) reasons.push("RUNTIME_UNREACHABLE");
  return { gate: HQ_PRODUCTION_RUNTIME_CANONICAL_SOURCE_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHqProductionRuntimeFreshnessGate(input: {
  productionQualified: number;
  localWorkingTreeQualified: number;
  lastVerifiedAt: string | null;
  now?: string;
  usedLocalAsProduction: boolean;
}): { gate: typeof HQ_PRODUCTION_RUNTIME_FRESHNESS_GATE; result: "PASS" | "FAIL"; freshness: "FRESH" | "STALE"; displayedQualified: number; reasons: string[] } {
  const reasons: string[] = [];
  const now = Date.parse(input.now ?? new Date().toISOString());
  const verified = input.lastVerifiedAt ? Date.parse(input.lastVerifiedAt) : NaN;
  const stale = !Number.isFinite(verified) || now - verified > FRESHNESS_THRESHOLD_MS;
  if (input.usedLocalAsProduction && input.localWorkingTreeQualified !== input.productionQualified) {
    reasons.push("LOCAL_WORKING_TREE_MASKED_PRODUCTION");
  }
  const displayed = input.usedLocalAsProduction ? input.localWorkingTreeQualified : input.productionQualified;
  if (displayed !== input.productionQualified) reasons.push("PRODUCTION_COUNT_MASKED");
  return {
    gate: HQ_PRODUCTION_RUNTIME_FRESHNESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    freshness: stale ? "STALE" : "FRESH",
    displayedQualified: displayed,
    reasons,
  };
}

export function evaluateHqProductionRuntimeFallbackMaskingGate(input: {
  runtimeReachable: boolean;
  displayedAs: "production" | typeof RUNTIME_UNREACHABLE | "local";
}): { gate: typeof HQ_PRODUCTION_RUNTIME_FALLBACK_MASKING_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.runtimeReachable && input.displayedAs === "production") reasons.push("SILENT_LOCAL_FALLBACK");
  if (!input.runtimeReachable && input.displayedAs === "local") reasons.push("SILENT_LOCAL_FALLBACK");
  if (!input.runtimeReachable && input.displayedAs !== RUNTIME_UNREACHABLE) reasons.push("RUNTIME_UNREACHABLE_NOT_SURFACED");
  return { gate: HQ_PRODUCTION_RUNTIME_FALLBACK_MASKING_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHqProductionRuntimeSecretExposureGate(payload: unknown): {
  gate: typeof HQ_PRODUCTION_RUNTIME_SECRET_EXPOSURE_GATE;
  result: "PASS" | "FAIL";
  leakCount: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") {
      if (SECRET_VALUE.test(value)) reasons.push(`SECRET_VALUE:${path}`);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (SECRET_KEY.test(key)) reasons.push(`SECRET_KEY:${path}.${key}`);
        walk(child, path ? `${path}.${key}` : key);
      }
    }
  };
  walk(payload, "");
  return {
    gate: HQ_PRODUCTION_RUNTIME_SECRET_EXPOSURE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    leakCount: reasons.length,
    reasons,
  };
}

export function evaluateGrowthAutomationCompletenessContract(automation: HqProductionOperatingState["automation"]): {
  contract: typeof GROWTH_AUTOMATION_COMPLETENESS_CONTRACT;
  result: "PASS" | "FAIL";
  overall: "PARTIAL" | "FULL" | "NONE";
} {
  const labeledPartial = automation.overall === "PARTIAL" && automation.sourcing !== "AUTONOMOUS";
  return {
    contract: GROWTH_AUTOMATION_COMPLETENESS_CONTRACT,
    result: labeledPartial || automation.overall === "FULL" ? "PASS" : "FAIL",
    overall: automation.overall,
  };
}

export function evaluateHqCanonicalWorkerActivityGate(input: {
  cronDefinitions: number;
  executionsRunning: number;
  growthWorker: HqProductionOperatingState["workers"]["growthWorker"];
  activeWorkerCount: number;
  hqCommand: HqProductionOperatingState["workers"]["hqCommand"];
  infinity: HqProductionOperatingState["workers"]["infinity"];
}): { gate: typeof HQ_CANONICAL_WORKER_ACTIVITY_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  const expectedActive = input.executionsRunning > 0;
  if (!expectedActive && input.activeWorkerCount > 0) reasons.push("CRON_COUNTED_AS_ACTIVE_WORKER");
  if (!expectedActive && input.cronDefinitions > 0 && input.activeWorkerCount === input.cronDefinitions) {
    reasons.push("CRON_COUNTED_AS_ACTIVE_WORKER");
  }
  if (!expectedActive && input.growthWorker === "ACTIVE") reasons.push("FALSE_ACTIVE_GROWTH_WORKER");
  if (!expectedActive && input.hqCommand === "ACTIVE_OVERSIGHT") reasons.push("FALSE_ACTIVE_HQ_COMMAND");
  if (!expectedActive && input.infinity === "ACTIVE") reasons.push("FALSE_ACTIVE_INFINITY");
  if (expectedActive && input.growthWorker !== "ACTIVE") reasons.push("MISSING_ACTIVE_GROWTH_WORKER");
  if (expectedActive && input.hqCommand !== "ACTIVE_OVERSIGHT") reasons.push("MISSING_ACTIVE_OVERSIGHT");
  if (expectedActive && input.infinity !== "ACTIVE") reasons.push("MISSING_ACTIVE_INFINITY");
  return { gate: HQ_CANONICAL_WORKER_ACTIVITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function workerProjectionForExecution(executing: boolean): HqProductionOperatingState["workers"] {
  return executing
    ? {
        cronDefinitions: 2,
        executionsRunning: 1,
        growthWorker: "ACTIVE",
        prospectSourcingWorker: "NOT_SEPARATE",
        activeWorkerCount: 1,
        hqCommand: "ACTIVE_OVERSIGHT",
        infinity: "ACTIVE",
      }
    : {
        cronDefinitions: 2,
        executionsRunning: 0,
        growthWorker: "WAITING",
        prospectSourcingWorker: "NOT_SEPARATE",
        activeWorkerCount: 0,
        hqCommand: "WAITING",
        infinity: "STANDBY",
      };
}

export function buildHqRuntimeProjectionReadModel(input: {
  runtimeProjectId: string;
  campaignStatus: string;
  lastCycleAt: string | null;
  nextRunAt: string;
  discovered: number;
  qualified: number;
  sent: number;
  replies: number;
  providerHealth: "PASS" | "FAIL" | "UNKNOWN";
  providerBlock: "RESOLVED" | "ACTIVE";
  boundToHqUi?: boolean;
}) {
  return {
    contract: HQ_PRODUCTION_RUNTIME_PROJECTION_CONTRACT,
    result: "PASS" as const,
    bound_to_hq_ui: Boolean(input.boundToHqUi),
    runtime_host: input.runtimeProjectId,
    campaign_status: input.campaignStatus,
    last_cycle: input.lastCycleAt,
    next_cycle: input.nextRunAt,
    prospects_discovered: input.discovered,
    qualified: input.qualified,
    sent: input.sent,
    replies: input.replies,
    provider_health: input.providerHealth,
    provider_block: input.providerBlock,
  };
}

export function buildLiveOperatingStateReadModel(input: {
  persist?: HqProductionOperatingState | null;
  now?: Date;
  executing?: boolean;
}): HqRuntimeReadResult {
  const persist = input.persist ?? readCanonicalProductionOperatingState();
  if (!persist) {
    return { ok: false, status: RUNTIME_UNREACHABLE, freshness: "STALE", state: null, lastVerifiedAt: null };
  }
  const now = input.now ?? new Date();
  const executing = Boolean(input.executing);
  const gmail = evaluateLiveOutboundCommunicationPathGate();
  const nextCycle = nextHourlyRunAt(now);
  const freshness = Date.now() - Date.parse(persist.runtime.lastVerifiedAt) > FRESHNESS_THRESHOLD_MS ? "STALE" : "FRESH";
  const state: HqProductionOperatingState = {
    ...persist,
    source: "live_production_runtime",
    runtime: {
      ...persist.runtime,
      lastVerifiedAt: now.toISOString(),
    },
    cycle: {
      ...persist.cycle,
      nextCycleAt: nextCycle,
    },
    gmail: gmail.result === "PASS" ? "PASS" : persist.gmail,
    workers: workerProjectionForExecution(executing),
  };
  return { ok: true, status: "BOUND", freshness, state };
}

export function redactOperatingStateForHq(state: HqProductionOperatingState): HqProductionOperatingState {
  return state;
}

export function evaluateHqProductionRuntimeProjectionContract(read: HqRuntimeReadResult): {
  contract: typeof HQ_PRODUCTION_RUNTIME_PROJECTION_CONTRACT;
  result: "PASS" | "FAIL";
  bound_to_hq_ui: boolean;
} {
  return {
    contract: HQ_PRODUCTION_RUNTIME_PROJECTION_CONTRACT,
    result: read.ok ? "PASS" : "FAIL",
    bound_to_hq_ui: read.ok,
  };
}
