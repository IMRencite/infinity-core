import { writeFile } from "node:fs/promises";
import { executeHomepageHeroLinkContrastAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/cre-homepage-hero-link-contrast-deploy.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants.ts";

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

type HeroPredeployView = {
  overall: string | null;
  reconstructed: {
    hubLayout: { overall: string | null } | null;
    discovery: { overall: string | null } | null;
    humanFirst: { overall: string | null } | null;
  } | null;
  hookBoundary: string | null;
  pageLoop: {
    overall: string | null;
    rendered: unknown;
    validated: unknown;
    finalFailed: unknown;
    missingEvidence: unknown;
    fullRoute: { overall: string | null };
  } | null;
};

function nestedOverall(value: unknown): { overall: string | null } | null {
  if (value == null || typeof value !== "object") return null;
  return { overall: asString(asObject(value).overall) };
}

function readHeroPredeploy(value: unknown): HeroPredeployView {
  const record = asObject(value);
  const reconstructedRaw = record.reconstructed;
  const reconstructed = reconstructedRaw != null && typeof reconstructedRaw === "object" ? asObject(reconstructedRaw) : null;
  const pageLoopRaw = record.pageLoop;
  const pageLoop = pageLoopRaw != null && typeof pageLoopRaw === "object" ? asObject(pageLoopRaw) : null;
  return {
    overall: asString(record.overall),
    reconstructed: reconstructed
      ? {
          hubLayout: nestedOverall(reconstructed.hubLayout),
          discovery: nestedOverall(reconstructed.discovery),
          humanFirst: nestedOverall(reconstructed.humanFirst),
        }
      : null,
    hookBoundary: asString(record.hookBoundary),
    pageLoop: pageLoop
      ? {
          overall: asString(pageLoop.overall),
          rendered: pageLoop.rendered ?? null,
          validated: pageLoop.validated ?? null,
          finalFailed: pageLoop.finalFailed ?? null,
          missingEvidence: pageLoop.missingEvidence ?? null,
          fullRoute: { overall: asString(asObject(pageLoop.fullRoute).overall) },
        }
      : null,
  };
}

type HeroLiveView = {
  passingRoutes: unknown;
  intentionalRedirects: unknown;
  failingRoutes: unknown;
  notFound: unknown;
  runtimeErrors: unknown;
  seoGeoPassed: unknown;
  visualPassed: unknown;
  fullTextContrast: unknown;
  fullLinkContrast: unknown;
  sameColorFailures: unknown;
  nearInvisibleFailures: unknown;
  hoverFocusFailures: unknown;
  missingLiveEvidence: unknown;
  liveMachinePhrases: unknown;
  livePlaceholders: unknown;
  cam: unknown;
  pageRoutesChecked: unknown;
  fullRouteRendered: unknown;
  overflowFailures: unknown;
  contrastSamples: unknown;
  linkSamples: unknown;
  humanFirst: unknown;
  renderedTextContrast: unknown;
  trustedSources: unknown;
  trustedSourcesLinks: unknown;
  machinePhrases: unknown;
  relatedPagePlaceholders: unknown;
  hubRoutesChecked: unknown;
  hubFailures: unknown;
  missingHubGeometry: unknown;
  hubOverflow: unknown;
  strayLeftovers: unknown;
  responsive: unknown;
  founder: unknown;
  navSamples: unknown;
  navSevenChecked: unknown;
  navSevenPassing: unknown;
  navSameColor: unknown;
  navNearInvisible: unknown;
  navWcagFailures: unknown;
  colorParser: unknown;
  hero: unknown;
  heroOverall: unknown;
  heroPassing: unknown;
  heroRequired: unknown;
  heroDefaultFailures: unknown;
  heroHoverFailures: unknown;
  heroFocusFailures: unknown;
};

function readHeroLive(value: unknown): HeroLiveView | null {
  if (value == null) return null;
  const live = asObject(value);
  return {
    passingRoutes: live.passingRoutes ?? null,
    intentionalRedirects: live.intentionalRedirects ?? null,
    failingRoutes: live.failingRoutes ?? null,
    notFound: live.notFound ?? null,
    runtimeErrors: live.runtimeErrors ?? null,
    seoGeoPassed: live.seoGeoPassed ?? null,
    visualPassed: live.visualPassed ?? null,
    fullTextContrast: live.fullTextContrast ?? null,
    fullLinkContrast: live.fullLinkContrast ?? null,
    sameColorFailures: live.sameColorFailures ?? null,
    nearInvisibleFailures: live.nearInvisibleFailures ?? null,
    hoverFocusFailures: live.hoverFocusFailures ?? null,
    missingLiveEvidence: live.missingLiveEvidence ?? null,
    liveMachinePhrases: live.liveMachinePhrases ?? null,
    livePlaceholders: live.livePlaceholders ?? null,
    cam: live.cam ?? null,
    pageRoutesChecked: live.pageRoutesChecked ?? null,
    fullRouteRendered: live.fullRouteRendered ?? null,
    overflowFailures: live.overflowFailures ?? null,
    contrastSamples: live.contrastSamples ?? null,
    linkSamples: live.linkSamples ?? null,
    humanFirst: live.humanFirst ?? null,
    renderedTextContrast: live.renderedTextContrast ?? null,
    trustedSources: live.trustedSources ?? null,
    trustedSourcesLinks: live.trustedSourcesLinks ?? null,
    machinePhrases: live.machinePhrases ?? null,
    relatedPagePlaceholders: live.relatedPagePlaceholders ?? null,
    hubRoutesChecked: live.hubRoutesChecked ?? null,
    hubFailures: live.hubFailures ?? null,
    missingHubGeometry: live.missingHubGeometry ?? null,
    hubOverflow: live.hubOverflow ?? null,
    strayLeftovers: live.strayLeftovers ?? null,
    responsive: live.responsive ?? null,
    founder: live.founder ?? null,
    navSamples: live.navSamples ?? null,
    navSevenChecked: live.navSevenChecked ?? null,
    navSevenPassing: live.navSevenPassing ?? null,
    navSameColor: live.navSameColor ?? null,
    navNearInvisible: live.navNearInvisible ?? null,
    navWcagFailures: live.navWcagFailures ?? null,
    colorParser: live.colorParser ?? null,
    hero: live.hero ?? null,
    heroOverall: live.heroOverall ?? null,
    heroPassing: live.heroPassing ?? null,
    heroRequired: live.heroRequired ?? null,
    heroDefaultFailures: live.heroDefaultFailures ?? null,
    heroHoverFailures: live.heroHoverFailures ?? null,
    heroFocusFailures: live.heroFocusFailures ?? null,
  };
}

const result = await executeHomepageHeroLinkContrastAuthorizedDeploy();
const after = projectCommandActivity({ organizationId: LIVE_ORG });
const predeploy = readHeroPredeploy(result.predeploy);
const slim = {
  artifactIdentity: result.artifactIdentity,
  digestLock: result.digestLock,
  actualDigest: result.actualDigest,
  routes: result.routes,
  ready: result.ready,
  founderVisualReviewReady: result.founderVisualReviewReady,
  hubLayout: predeploy.reconstructed?.hubLayout?.overall ?? null,
  discovery: predeploy.reconstructed?.discovery?.overall ?? null,
  hookBoundary: predeploy.hookBoundary,
  humanFirst: predeploy.reconstructed?.humanFirst?.overall ?? null,
  pageLoop: predeploy.pageLoop
    ? {
        overall: predeploy.pageLoop.overall,
        rendered: predeploy.pageLoop.rendered,
        validated: predeploy.pageLoop.validated,
        finalFailed: predeploy.pageLoop.finalFailed,
        missingEvidence: predeploy.pageLoop.missingEvidence,
        fullRoute: predeploy.pageLoop.fullRoute.overall,
      }
    : null,
  predeployOverall: predeploy.overall,
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
  evidenceStart: result.evidenceStart,
  clockRestarted: inspectExperimentClock().restarted,
  counts: result.counts,
  providerCost: result.providerCost,
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
    latestOutcome: after.latestCompleted?.outcome ?? null,
    authorizationRequired: after.nowInspecting.authorizationRequired,
    blocker: after.nowInspecting.blocker,
    rooms: Object.fromEntries(
      Object.entries(after.rooms).map(([id, slice]) => [id, { status: slice.status, summary: slice.summary }]),
    ),
  },
  observer: inspectMailboxObserverHealth(),
  live: readHeroLive(result.live),
};
await writeFile(".infinity/homepage-hero-link-contrast-deploy-result.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
