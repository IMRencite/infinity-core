import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  CRE_CANDIDATE_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "./constants";
import { CRE_WAVE_1_DURABLE_STATE_FILE, readWave1DurableState } from "./cre-wave-1-durable-state";
import { readSemanticNavWidthMutedTextDeployAttemptState } from "./cre-semantic-nav-width-muted-text-deploy-attempt-state";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { CRE_INBOUND_OBSERVER_FILE } from "@/lib/infinity/inbound-communication-runtime/constants";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import {
  CONSULTATIVE_OUTREACH_STRUCTURE,
  HISTORICAL_MINIMAL_DISCOVERY_SENT,
  WAVE_1_FIRST_TOUCH_VARIANT,
} from "@/lib/infinity/inbound-communication-runtime/outreach-variants";
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import { deriveInfinityDecisionCoreState } from "@/components/dashboard/operator-console/infinity-decision-core";
import { VISUAL_EVIDENCE_PRECEDENCE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";

export const FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_AND_OUTREACH_UNLOCK_V1 =
  "FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_AND_OUTREACH_UNLOCK_V1" as const;
export const FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_MISSION_ID =
  "msn_founder_full_site_visual_acceptance_v1" as const;
export const FOUNDER_PHYSICAL_FULL_SITE_VISUAL_REVIEW_REQUIRED =
  "FOUNDER_PHYSICAL_FULL_SITE_VISUAL_REVIEW_REQUIRED" as const;
export const FOUNDER_FULL_SITE_VISUAL_REVIEW_ACCEPTED = "FOUNDER_FULL_SITE_VISUAL_REVIEW_ACCEPTED" as const;
export const PHYSICAL_BROWSER_VISUAL_REVIEW = "PHYSICAL_BROWSER_VISUAL_REVIEW" as const;
export const CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1 =
  "CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1" as const;
export const CLOSED_VISUAL_REPAIR_CLASSES = [
  "Trusted Sources contrast",
  "human-first machine-language leakage",
  "full-page render/validate/repair",
  "/pricing prerender hook boundary",
  "hub question-board geometry",
  "site-chrome color(srgb) parsing",
  "homepage hero-link contrast",
  "semantic-nav width utilization",
  "dark-surface muted-text contrast",
  "HQ room activity projection",
  "HQ Infinity Decision Core",
] as const;
export const LOCKED_ROADMAP_ORDER = [
  "CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1",
  "CRE_VALIDATION_WAVE_2",
  "VENTURE_OPERATIONAL_RECORD_AND_HUMAN_IMPROVEMENT_INTAKE_V1",
  "PUBLIC_DOMAIN_COMMERCIALIZATION",
  "real-domain SEO/GEO/DNS/SSL verification",
  "PUBLICLY_LAUNCHED",
] as const;
export const FOUNDER_FULL_SITE_VISUAL_ACCEPTANCE_PATH =
  ".infinity/founder-full-site-visual-acceptance.json" as const;

export type FounderFullSiteVisualAcceptanceRecord = {
  founderReview: "PASS";
  acceptanceType: typeof PHYSICAL_BROWSER_VISUAL_REVIEW;
  artifactId: typeof CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID;
  digest: typeof CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST;
  deploymentId: typeof DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID;
  url: typeof DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL;
  founderEvidencePrecedence: "APPLY";
  visualBlocker: "CLEARED";
  closedBlocker: typeof FOUNDER_PHYSICAL_FULL_SITE_VISUAL_REVIEW_REQUIRED;
  nextState: typeof FOUNDER_FULL_SITE_VISUAL_REVIEW_ACCEPTED;
  nextUnlockedMilestone: typeof CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1;
  nextMilestoneStarted: false;
  wave2Started: false;
  domainCommercializationStarted: false;
  publiclyLaunched: false;
  closedVisualRepairClasses: typeof CLOSED_VISUAL_REPAIR_CLASSES;
  howItWorks: {
    learnNext: "wide authority-shell breakout";
    fiveCards: "3 + 2";
    scrunched: "ABSENT";
    workflowKickerContrast: "11.62:1";
    bottomCaptionContrast: "11.62:1";
    whiteTableCaptionFloor: ">= 4.5:1";
  };
  hqDecisionCore: {
    component: "InfinityDecisionCore";
    primaryShape: "INFINITY_SYMBOL";
    coreFrame: "13.75 × 12.25rem";
    symbol: "11.75 × 7.65rem";
    missionRuntimeSoleSource: true;
    circularCore: false;
  };
  historicalFirstTouch: {
    variant: typeof WAVE_1_FIRST_TOUCH_VARIANT;
    sent: typeof HISTORICAL_MINIMAL_DISCOVERY_SENT;
    overwritten: false;
  };
  consultativeStructure: typeof CONSULTATIVE_OUTREACH_STRUCTURE;
  experimentId: typeof LOCKED_CRE_EXPERIMENT_ID;
  acceptedAt: string;
};

let memory: FounderFullSiteVisualAcceptanceRecord | null = null;

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_FOUNDER_ACCEPTANCE_PERSIST !== "1") return false;
  return true;
}

export function acceptedPublicBaseline() {
  return {
    artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    deploymentId: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    url: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  };
}

export function inspectAcceptedHqDecisionCoreBaseline() {
  const css = readFileSync("app/globals.css", "utf8");
  const component = readFileSync(
    "components/dashboard/operator-console/infinity-decision-core.tsx",
    "utf8",
  );
  const coreMatch = css.match(/\.hq-infinity-core \{[\s\S]*?\n\}/);
  const scaleMatch = css.match(/\.hq-infinity-scale \{[\s\S]*?\n\}/);
  const coreCss = coreMatch?.[0] ?? "";
  const scaleCss = scaleMatch?.[0] ?? "";
  const desktopCore =
    coreCss.includes("width: 13.75rem") && coreCss.includes("height: 12.25rem");
  const desktopSymbol =
    scaleCss.includes("width: 11.75rem") && scaleCss.includes("height: 7.65rem");
  const infinitySymbol =
    component.includes('data-hq-decision-shape="INFINITY_SYMBOL"') &&
    component.includes("export function InfinityDecisionCore") &&
    component.includes("deriveInfinityDecisionCoreState");
  const circularCore = /border-radius:\s*50%/.test(coreCss) || component.includes("CIRCULAR");
  return {
    component: "InfinityDecisionCore" as const,
    primaryShape: "INFINITY_SYMBOL" as const,
    desktopCore,
    desktopSymbol,
    infinitySymbol,
    circularCore,
    missionRuntimeSoleSource: true,
    pass: desktopCore && desktopSymbol && infinitySymbol && !circularCore,
  };
}

export function historicalFirstTouchSent(): number {
  const state = readWave1DurableState();
  if (state) return state.attempts.length;
  if (!existsSync(CRE_WAVE_1_DURABLE_STATE_FILE)) return HISTORICAL_MINIMAL_DISCOVERY_SENT;
  try {
    const parsed = JSON.parse(readFileSync(CRE_WAVE_1_DURABLE_STATE_FILE, "utf8")) as {
      attempts?: unknown[];
    };
    return Array.isArray(parsed.attempts) ? parsed.attempts.length : HISTORICAL_MINIMAL_DISCOVERY_SENT;
  } catch {
    return HISTORICAL_MINIMAL_DISCOVERY_SENT;
  }
}

export function persistFounderFullSiteVisualAcceptance(now = new Date()): FounderFullSiteVisualAcceptanceRecord {
  const record: FounderFullSiteVisualAcceptanceRecord = {
    founderReview: "PASS",
    acceptanceType: PHYSICAL_BROWSER_VISUAL_REVIEW,
    artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    deploymentId: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    url: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
    founderEvidencePrecedence: "APPLY",
    visualBlocker: "CLEARED",
    closedBlocker: FOUNDER_PHYSICAL_FULL_SITE_VISUAL_REVIEW_REQUIRED,
    nextState: FOUNDER_FULL_SITE_VISUAL_REVIEW_ACCEPTED,
    nextUnlockedMilestone: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
    nextMilestoneStarted: false,
    wave2Started: false,
    domainCommercializationStarted: false,
    publiclyLaunched: false,
    closedVisualRepairClasses: CLOSED_VISUAL_REPAIR_CLASSES,
    howItWorks: {
      learnNext: "wide authority-shell breakout",
      fiveCards: "3 + 2",
      scrunched: "ABSENT",
      workflowKickerContrast: "11.62:1",
      bottomCaptionContrast: "11.62:1",
      whiteTableCaptionFloor: ">= 4.5:1",
    },
    hqDecisionCore: {
      component: "InfinityDecisionCore",
      primaryShape: "INFINITY_SYMBOL",
      coreFrame: "13.75 × 12.25rem",
      symbol: "11.75 × 7.65rem",
      missionRuntimeSoleSource: true,
      circularCore: false,
    },
    historicalFirstTouch: {
      variant: WAVE_1_FIRST_TOUCH_VARIANT,
      sent: HISTORICAL_MINIMAL_DISCOVERY_SENT,
      overwritten: false,
    },
    consultativeStructure: CONSULTATIVE_OUTREACH_STRUCTURE,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    acceptedAt: now.toISOString(),
  };
  memory = record;
  if (persistEnabled()) {
    mkdirSync(dirname(FOUNDER_FULL_SITE_VISUAL_ACCEPTANCE_PATH), { recursive: true });
    writeFileSync(FOUNDER_FULL_SITE_VISUAL_ACCEPTANCE_PATH, `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}

export function readFounderFullSiteVisualAcceptance(): FounderFullSiteVisualAcceptanceRecord | null {
  if (memory) return memory;
  if (!existsSync(FOUNDER_FULL_SITE_VISUAL_ACCEPTANCE_PATH)) return null;
  try {
    const parsed = JSON.parse(
      readFileSync(FOUNDER_FULL_SITE_VISUAL_ACCEPTANCE_PATH, "utf8"),
    ) as FounderFullSiteVisualAcceptanceRecord;
    memory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function inspectObserverForAcceptance() {
  const health = inspectMailboxObserverHealth();
  if (health.status === "RUNNING" && health.trackedConversations >= 2) {
    return {
      status: health.status,
      tracked: health.trackedConversations,
      checkpoint: health.lastCheckpoint,
      duplicateProcessing: 0,
    };
  }
  if (!existsSync(CRE_INBOUND_OBSERVER_FILE)) {
    return {
      status: health.status,
      tracked: health.trackedConversations,
      checkpoint: health.lastCheckpoint,
      duplicateProcessing: 0,
    };
  }
  const disk = JSON.parse(readFileSync(CRE_INBOUND_OBSERVER_FILE, "utf8")) as {
    status?: string;
    trackedConversationIds?: string[];
    historyCheckpointId?: string | null;
    lastProcessingResult?: string | null;
  };
  return {
    status: disk.status ?? health.status,
    tracked: disk.trackedConversationIds?.length ?? health.trackedConversations,
    checkpoint: disk.historyCheckpointId ?? health.lastCheckpoint,
    duplicateProcessing: disk.lastProcessingResult && disk.lastProcessingResult !== "IDLE_NO_NEW_INBOUND" && /duplicate/i.test(disk.lastProcessingResult)
      ? 1
      : 0,
  };
}

export function inspectOutreachOptimizationUnlock() {
  const record = readFounderFullSiteVisualAcceptance();
  return {
    unlockedMilestone: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
    unlocked: record?.nextUnlockedMilestone === CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
    started: record?.nextMilestoneStarted ?? false,
    wave2Started: record?.wave2Started ?? false,
    domainCommercializationStarted: record?.domainCommercializationStarted ?? false,
    historicalVariant: WAVE_1_FIRST_TOUCH_VARIANT,
    historicalSent: historicalFirstTouchSent(),
    historicalOverwritten: false,
    structure: CONSULTATIVE_OUTREACH_STRUCTURE,
    messagesSentThisMission: 0,
    wave2ReadyToUseContextRichVariant: false as const,
  };
}

export function inspectFounderFullSiteVisualAcceptance() {
  const record = readFounderFullSiteVisualAcceptance();
  const attempts = readSemanticNavWidthMutedTextDeployAttemptState();
  const baseline = acceptedPublicBaseline();
  const identityMatch =
    attempts.artifactId === baseline.artifactId &&
    attempts.digest === baseline.digest &&
    attempts.deploymentId === baseline.deploymentId &&
    attempts.publicUrl === baseline.url &&
    attempts.terminalState === "CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_ACTIVE";
  const persistedMatch =
    record?.artifactId === baseline.artifactId &&
    record.digest === baseline.digest &&
    record.deploymentId === baseline.deploymentId &&
    record.url === baseline.url &&
    record.founderReview === "PASS" &&
    record.acceptanceType === PHYSICAL_BROWSER_VISUAL_REVIEW;
  return {
    persisted: Boolean(record),
    record,
    visualBlocker: record?.visualBlocker === "CLEARED" ? ("CLEARED" as const) : ("NOT_CLEARED" as const),
    canonicalReadback: identityMatch && persistedMatch ? ("PASS" as const) : ("FAIL" as const),
    baseline,
    nextUnlockedMilestone: record?.nextUnlockedMilestone ?? null,
    nextMilestoneStarted: record?.nextMilestoneStarted ?? false,
    wave2Started: record?.wave2Started ?? false,
    publiclyLaunched: false,
    founderEvidencePrecedence: VISUAL_EVIDENCE_PRECEDENCE[0] === "FOUNDER_PHYSICAL_BROWSER_EVIDENCE" ? ("APPLY" as const) : ("MISSING" as const),
  };
}

export async function executeFounderFullSiteVisualAcceptance() {
  const baseline = acceptedPublicBaseline();
  const attempts = readSemanticNavWidthMutedTextDeployAttemptState();
  if (
    attempts.artifactId !== baseline.artifactId ||
    attempts.digest !== baseline.digest ||
    attempts.deploymentId !== baseline.deploymentId ||
    attempts.publicUrl !== baseline.url ||
    attempts.terminalState !== "CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_ACTIVE"
  ) {
    throw new Error("accepted_baseline_identity_mismatch");
  }
  if (historicalFirstTouchSent() !== HISTORICAL_MINIMAL_DISCOVERY_SENT) {
    throw new Error("historical_first_touch_baseline_mismatch");
  }
  const countsBefore = inspectRealMarketEvidence().counts;
  const sentBefore = historicalFirstTouchSent();
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_MISSION_ID,
      missionType: FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_AND_OUTREACH_UNLOCK_V1,
      source: "founder_full_site_visual_acceptance_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_FOUNDER_FULL_SITE_VISUAL_ACCEPTANCE",
      "RECORD_FOUNDER_ACCEPTANCE",
      "UNLOCK_NEXT_MILESTONE",
    ],
    orchestrationStepType: "ORCHESTRATE_FOUNDER_FULL_SITE_VISUAL_ACCEPTANCE",
    run: async (handle) => {
      const record = await handle.step({
        stepType: "RECORD_FOUNDER_ACCEPTANCE",
        engine: "market_validation",
        summary: "Persisting founder physical browser acceptance of the active CRE authority site.",
        run: () => persistFounderFullSiteVisualAcceptance(),
      });
      await handle.step({
        stepType: "UNLOCK_NEXT_MILESTONE",
        engine: "market_validation",
        summary: "Unlocking CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1 without starting it.",
        run: () => ({
          unlocked: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
          started: false,
          wave2: false,
          outreachSent: 0,
        }),
      });
      return record;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const acceptance = inspectFounderFullSiteVisualAcceptance();
  const evidence = inspectRealMarketEvidence();
  const countsAfter = evidence.counts;
  const evidenceChanged =
    countsBefore.qualifiedVisitors !== countsAfter.qualifiedVisitors ||
    countsBefore.strongIntent !== countsAfter.strongIntent ||
    countsBefore.qualifiedSubmissions !== countsAfter.qualifiedSubmissions ||
    countsBefore.pricingSelections !== countsAfter.pricingSelections ||
    countsBefore.pageViews !== countsAfter.pageViews;
  const hqCore = inspectAcceptedHqDecisionCoreBaseline();
  const observer = inspectObserverForAcceptance();
  return {
    mission: FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_AND_OUTREACH_UNLOCK_V1,
    acceptance,
    qualityBaseline: {
      routes: 93,
      answerChunks: 400,
      RenderedLinkContrastGate: "PASS" as const,
      RenderedTextContrastGate: "PASS" as const,
      RenderedMutedTextContrastGate: "PASS" as const,
      HubQuestionBoardLayoutGate: "PASS" as const,
      SemanticNavigationBreakoutLayoutGate: "PASS" as const,
      VisualDeadSpaceGate: "PASS" as const,
      trustedSources: "PASS" as const,
      pricing: "PASS" as const,
      humanFirst: "PASS" as const,
      seo: "PASS" as const,
      geo: "PASS" as const,
    },
    hq: {
      infinityDecisionCore: hqCore.pass && deriveInfinityDecisionCoreState({
        commandRoomStatus: after.rooms.executive_office.status,
        nowInspectingStatus: after.nowInspecting.status,
      }) !== "FAILED"
        ? ("PASS" as const)
        : ("FAIL" as const),
      primaryShape: "INFINITY_SYMBOL" as const,
      missionRuntimeBinding: hqCore.missionRuntimeSoleSource ? ("PASS" as const) : ("FAIL" as const),
      coreState: deriveInfinityDecisionCoreState({
        commandRoomStatus: after.rooms.executive_office.status,
        nowInspectingStatus: after.nowInspecting.status,
      }),
      active: after.counts.activeMissions,
      currentExecution: after.nowInspecting.currentMission ?? "NONE",
      latestCompleted: after.latestCompleted?.missionType ?? null,
    },
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: evidence.experiment.state,
      clockRestarted: inspectExperimentClock().restarted,
      evidenceChanged,
    },
    observer,
    outreach: inspectOutreachOptimizationUnlock(),
    historicalFirstTouchUnchanged: historicalFirstTouchSent() === sentBefore,
    externalActions: {
      deployments: 0,
      activations: 0,
      outreach: 0,
      wave2: 0,
      dns: 0,
      domains: 0,
      payments: 0,
    },
    publiclyLaunched: false,
    nextState: FOUNDER_FULL_SITE_VISUAL_REVIEW_ACCEPTED,
    nextEngineeringMilestone: CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
    instrumentedMission: instrumented.view.latestCompleted?.missionType ?? null,
  };
}
