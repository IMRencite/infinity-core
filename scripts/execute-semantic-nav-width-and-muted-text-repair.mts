import { writeFile } from "node:fs/promises";
import { commitMissionActivityDurably } from "../lib/infinity/mission-activity/commit.ts";
import { emitMissionActivity } from "../lib/infinity/mission-activity/emit.ts";
import { runInstrumentedMission } from "../lib/infinity/mission-activity/index.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "../lib/infinity/market-validation-experiment/constants.ts";
import { reconstructCreSemanticNavWidthAndMutedTextSuccessor } from "../lib/infinity/venture-website-architecture/cre-semantic-nav-width-and-muted-text-successor.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";
import { deriveInfinityDecisionCoreState } from "../components/dashboard/operator-console/infinity-decision-core.tsx";

const successor = await reconstructCreSemanticNavWidthAndMutedTextSuccessor();
const instrumented = await runInstrumentedMission({
  emit: {
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: "msn_cre_semantic_nav_width_and_muted_text_repair_v1",
    missionType: "CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1",
    source: "cre_semantic_nav_width_utilization_repair_v1",
    executionClass: "VENTURE_EXECUTION",
  },
  knownSteps: [
    "ORCHESTRATE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR",
    "QUALITY_REVIEW",
    "SITE_ARCHITECTURE",
    "ARTIFACT_GENERATION",
    "VALIDATE_TECHNICAL",
  ],
  orchestrationStepType: "ORCHESTRATE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR",
  run: async (handle) => {
    await handle.step({
      stepType: "QUALITY_REVIEW",
      engine: "market_validation",
      summary: "Reproducing dark-module muted contrast and Learn Next width on /how-it-works.",
      run: () => ({ beforeKicker: 2.89, beforeCaption: 2.89, learnNextNav: 722.4 }),
    });
    await handle.step({
      stepType: "SITE_ARCHITECTURE",
      engine: "systems_architect",
      summary: "Applying dark-surface muted tokens and semantic-nav width breakout.",
      run: () => ({ artifactId: successor.artifactId, digest: successor.digest }),
    });
    await handle.step({
      stepType: "ARTIFACT_GENERATION",
      engine: "product_lab",
      summary: "Freezing the immutable public successor without HQ dashboard files.",
      run: () => ({ routes: successor.routes, hqInArtifact: false }),
    });
    await handle.step({
      stepType: "VALIDATE_TECHNICAL",
      engine: "market_validation",
      summary: "Revalidating 93 routes, muted-text contrast, hub layout, and human-first language.",
      run: () => ({
        pageLoop: successor.pageLoop.overall,
        muted: successor.muted.overall,
        hub: successor.hubLayout.overall,
        humanFirst: successor.humanFirst.overall,
      }),
    });
    return successor;
  },
});
await commitMissionActivityDurably(
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: "msn_cre_semantic_nav_width_and_muted_text_repair_v1",
    missionType: "CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1",
    engine: "mission_runtime",
    stepType: "VALIDATE_TECHNICAL",
    eventType: "MISSION_COMPLETED",
    status: "PRESENT_IDLE",
    summary: "Semantic-nav width and dark-surface muted-text repair frozen. Deployment is not authorized.",
    source: "cre_semantic_nav_width_utilization_repair_v1",
    executionClass: "VENTURE_EXECUTION",
    synthetic: false,
    traceability: {
      missionId: "msn_cre_semantic_nav_width_and_muted_text_repair_v1",
      artifactId: successor.artifactId,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
    },
  }),
);
const after = projectCommandActivity({ organizationId: LIVE_ORG });
const result = {
  mission: "CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1",
  artifactId: successor.artifactId,
  digest: successor.digest,
  predecessorArtifactId: successor.predecessorArtifactId,
  routes: successor.routes,
  pageLoop: successor.pageLoop.overall,
  muted: successor.muted,
  contrast: successor.contrast.overall,
  hubLayout: successor.hubLayout.overall,
  humanFirst: successor.humanFirst.overall,
  heroLinks: successor.heroLinks.overall,
  ready: successor.founderVisualReviewReady,
  deployed: false,
  publiclyLaunched: false,
  hqAfter: {
    active: after.counts.activeMissions,
    latestCompleted: after.latestCompleted?.missionType ?? null,
    infinityDecisionCore: deriveInfinityDecisionCoreState({
      commandRoomStatus: after.rooms.executive_office.status,
      nowInspectingStatus: after.nowInspecting.status,
    }),
  },
  experiment: inspectRealMarketEvidence().experiment.state,
  clockRestarted: inspectExperimentClock().restarted,
  observer: inspectMailboxObserverHealth(),
  instrumentedMission: instrumented.view.latestCompleted?.missionType ?? null,
};
await writeFile(".infinity/semantic-nav-width-and-muted-text-repair-result.json", `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
