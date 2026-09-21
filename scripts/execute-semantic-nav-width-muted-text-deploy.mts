import { writeFile } from "node:fs/promises";
import { executeSemanticNavWidthMutedTextAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/cre-semantic-nav-width-muted-text-deploy.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants.ts";
import { deriveInfinityDecisionCoreState } from "../components/dashboard/operator-console/infinity-decision-core.tsx";

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

type SemanticPredeployView = {
  overall: string | null;
};

function readSemanticPredeploy(value: unknown): SemanticPredeployView {
  return { overall: asString(asObject(value).overall) };
}

function readPublicBundleHqFiles(value: unknown): number {
  return asNumber(asObject(value).publicBundleHqFiles, 0);
}

type SemanticLiveView = {
  passingRoutes: unknown;
  intentionalRedirects: unknown;
  failingRoutes: unknown;
  notFound: unknown;
  runtimeErrors: unknown;
  missingLiveEvidence: unknown;
  renderedTextContrast: unknown;
  renderedMutedTextContrast: unknown;
  darkMutedFailures: unknown;
  lightMutedFailures: unknown;
  mutedFailures: unknown;
  mutedMissing: unknown;
  founderScrunchedPattern: unknown;
  visualDeadSpace: unknown;
  howItWorksWidth: unknown;
  howItWorksMuted: unknown;
  sameColorFailures: unknown;
  nearInvisibleFailures: unknown;
  hoverFocusFailures: unknown;
  heroOverall: unknown;
  navSevenPassing: unknown;
  hubFailures: unknown;
  strayLeftovers: unknown;
  founder: unknown;
  humanFirst: unknown;
  trustedSources: unknown;
  trustedSourcesLinks: unknown;
  liveMachinePhrases: unknown;
  livePlaceholders: unknown;
};

function readSemanticLive(value: unknown): SemanticLiveView | null {
  if (value == null) return null;
  const live = asObject(value);
  return {
    passingRoutes: live.passingRoutes ?? null,
    intentionalRedirects: live.intentionalRedirects ?? null,
    failingRoutes: live.failingRoutes ?? null,
    notFound: live.notFound ?? null,
    runtimeErrors: live.runtimeErrors ?? null,
    missingLiveEvidence: live.missingLiveEvidence ?? null,
    renderedTextContrast: live.renderedTextContrast ?? null,
    renderedMutedTextContrast: live.renderedMutedTextContrast ?? null,
    darkMutedFailures: live.darkMutedFailures ?? null,
    lightMutedFailures: live.lightMutedFailures ?? null,
    mutedFailures: live.mutedFailures ?? null,
    mutedMissing: live.mutedMissing ?? null,
    founderScrunchedPattern: live.founderScrunchedPattern ?? null,
    visualDeadSpace: live.visualDeadSpace ?? null,
    howItWorksWidth: live.howItWorksWidth ?? null,
    howItWorksMuted: live.howItWorksMuted ?? null,
    sameColorFailures: live.sameColorFailures ?? null,
    nearInvisibleFailures: live.nearInvisibleFailures ?? null,
    hoverFocusFailures: live.hoverFocusFailures ?? null,
    heroOverall: live.heroOverall ?? null,
    navSevenPassing: live.navSevenPassing ?? null,
    hubFailures: live.hubFailures ?? null,
    strayLeftovers: live.strayLeftovers ?? null,
    founder: live.founder ?? null,
    humanFirst: live.humanFirst ?? null,
    trustedSources: live.trustedSources ?? null,
    trustedSourcesLinks: live.trustedSourcesLinks ?? null,
    liveMachinePhrases: live.liveMachinePhrases ?? null,
    livePlaceholders: live.livePlaceholders ?? null,
  };
}

const result = await executeSemanticNavWidthMutedTextAuthorizedDeploy();
const after = projectCommandActivity({ organizationId: LIVE_ORG });
const slim = {
  artifactIdentity: result.artifactIdentity,
  digestLock: result.digestLock,
  actualDigest: result.actualDigest,
  routes: result.routes,
  ready: result.ready,
  founderVisualReviewReady: result.founderVisualReviewReady,
  publicBundleHqFiles: readPublicBundleHqFiles(result),
  predeployOverall: readSemanticPredeploy(result.predeploy).overall,
  executed: result.executed,
  attempted: result.attempted,
  authorizationConsumed: result.authorizationConsumed,
  deploymentId: result.deploymentId,
  publicUrl: result.publicUrl,
  providerFinalState: result.providerFinalState,
  providerError: result.providerError,
  activated: result.activated,
  activationCount: result.activationCount,
  activeArtifact: result.activeArtifact,
  activeDeployment: result.activeDeployment,
  activeUrl: result.activeUrl,
  canonicalReadback: result.canonicalReadback,
  experimentState: result.experimentState,
  clockRestarted: inspectExperimentClock().restarted,
  counts: result.counts,
  deployments: result.deployments,
  activations: result.activations,
  stopReason: result.stopReason,
  commandDuring: result.commandDuring,
  deploymentDepotDuring: result.deploymentDepotDuring,
  validationStationDuring: result.validationStationDuring,
  creationLabDuring: result.creationLabDuring,
  systemsArchitectDuring: result.systemsArchitectDuring,
  growthNexusDuring: result.growthNexusDuring,
  missionRoomActivityProjection: result.missionRoomActivityProjection,
  latestCompleted: result.latestCompleted,
  publiclyLaunched: result.publiclyLaunched,
  hqAfter: {
    active: after.counts.activeMissions,
    currentMission: after.nowInspecting.currentMission,
    currentExecution: after.nowInspecting.status,
    latestCompleted: after.latestCompleted?.missionType ?? null,
    rooms: Object.fromEntries(
      Object.entries(after.rooms).map(([id, slice]) => [id, { status: slice.status, summary: slice.summary }]),
    ),
    infinityDecisionCore: deriveInfinityDecisionCoreState({
      commandRoomStatus: after.rooms.executive_office.status,
      nowInspectingStatus: after.nowInspecting.status,
    }),
  },
  observer: inspectMailboxObserverHealth(),
  live: readSemanticLive(result.live),
};
await writeFile(".infinity/semantic-nav-width-muted-text-deploy-result.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
