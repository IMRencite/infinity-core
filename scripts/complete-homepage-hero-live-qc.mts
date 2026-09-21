import { writeFile } from "node:fs/promises";
import { reconstructCreHomepageHeroLinkContrastSuccessor } from "../lib/infinity/venture-website-architecture/cre-homepage-hero-link-contrast-successor.ts";
import {
  homepageHeroLinkContrastLiveVerificationPassed,
  verifyHomepageHeroLinkContrastLivePublic,
} from "../lib/infinity/market-validation-experiment/cre-homepage-hero-link-contrast-live-verify.ts";
import { activateHomepageHeroLinkContrastPublicArtifact } from "../lib/infinity/market-validation-experiment/active-public-artifact.ts";
import {
  CRE_CANDIDATE_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "../lib/infinity/market-validation-experiment/constants.ts";
import { commitMissionActivityDurably } from "../lib/infinity/mission-activity/commit.ts";
import { emitMissionActivity } from "../lib/infinity/mission-activity/emit.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { refreshMissionActivityFromDisk } from "../lib/infinity/mission-activity/store.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence.ts";
import { deriveInfinityDecisionCoreState } from "../components/dashboard/operator-console/infinity-decision-core.tsx";

const deploymentId = "dpl_Ehsc274qjUrZTfyCkQ4n3NCBXZV8";
const url = "https://infinity-validation-cre-lease-npv-e72beb7b-ofqh1savv.vercel.app";

const successor = await reconstructCreHomepageHeroLinkContrastSuccessor();
if (successor.artifactId !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID) {
  throw new Error(`identity_mismatch:${successor.artifactId}`);
}
if (successor.digest !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST) {
  throw new Error(`digest_mismatch:${successor.digest}`);
}
const hqInArtifact = successor.files.some((file) => file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore"));
if (hqInArtifact) throw new Error("hq_code_in_public_artifact");

refreshMissionActivityFromDisk();
const during = projectCommandActivity({ organizationId: LIVE_ORG });
const duringCore = deriveInfinityDecisionCoreState({
  commandRoomStatus: during.rooms.executive_office.status,
  nowInspectingStatus: during.nowInspecting.status,
});

const live = await verifyHomepageHeroLinkContrastLivePublic({
  url,
  artifactId: successor.artifactId,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  candidateId: CRE_CANDIDATE_ID,
  files: successor.files,
});
const passed = homepageHeroLinkContrastLiveVerificationPassed(live);
let activated = false;
if (passed) {
  activateHomepageHeroLinkContrastPublicArtifact({
    artifactId: successor.artifactId,
    digest: successor.digest,
    deploymentId,
    url,
  });
  activated = true;
}

const shared = {
  organizationId: LIVE_ORG,
  ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  candidateId: CRE_CANDIDATE_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  source: "governed_cre_homepage_hero_link_contrast_deployment_v1",
  executionClass: "VENTURE_EXECUTION" as const,
  synthetic: false,
};

await commitMissionActivityDurably(
  emitMissionActivity({
    ...shared,
    missionId: "msn_cre_homepage_hero_and_hq_infinity_core_repair_v1",
    missionType: "CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1",
    engine: "mission_runtime",
    stepType: "QUALITY_REVIEW",
    eventType: "MISSION_COMPLETED",
    status: "PRESENT_IDLE",
    summary: "Homepage hero-link contrast repair completed. The authorized provider write already occurred, so this mission is no longer current.",
    technicalDetail: "authorization_consumed=GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED",
    traceability: {
      missionId: "msn_cre_homepage_hero_and_hq_infinity_core_repair_v1",
      artifactId: successor.artifactId,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
    },
  }),
);

await commitMissionActivityDurably(
  emitMissionActivity({
    ...shared,
    missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
    missionType: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
    engine: "market_validation",
    stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
    eventType: "STEP_COMPLETED",
    status: "ACTIVE_WORK",
    summary: passed
      ? "Live provider QC passed for the homepage hero-link contrast successor."
      : "Live provider QC failed. Authorization is consumed. Do not restore GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED.",
    technicalDetail: `deployment=${deploymentId};url=${url};hero=${live.heroOverall};activated=${activated}`,
    traceability: {
      missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
      artifactId: successor.artifactId,
      deploymentId,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
    },
  }),
);

if (activated) {
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...shared,
      missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
      missionType: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
      engine: "launch_gateway",
      stepType: "ACTIVATE_PUBLIC_ARTIFACT",
      eventType: "STEP_COMPLETED",
      status: "PRESENT_IDLE",
      summary: "Bound art_dbf624e41599420891e2 as the active validation artifact. READY is not PUBLICLY_LAUNCHED.",
      technicalDetail: `deployment=${deploymentId};url=${url}`,
      traceability: {
        missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
        artifactId: successor.artifactId,
        deploymentId,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...shared,
      missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
      missionType: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
      engine: "mission_runtime",
      stepType: "ACTIVATE_PUBLIC_ARTIFACT",
      eventType: "MISSION_COMPLETED",
      status: "PRESENT_IDLE",
      summary: "Governed homepage hero-link contrast deployment completed and activated.",
      traceability: {
        missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
        artifactId: successor.artifactId,
        deploymentId,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
} else {
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...shared,
      missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
      missionType: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
      engine: "mission_runtime",
      stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
      eventType: "MISSION_COMPLETED",
      status: "PRESENT_IDLE",
      failureCode: "DEPLOYED_NOT_ACTIVATED",
      blocker: "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REPAIR_REQUIRED",
      authorizationRequired: "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REPAIR_REQUIRED",
      summary: "Staging write completed. Activation was refused. Terminal DEPLOYED_NOT_ACTIVATED.",
      technicalDetail: `outcome=DEPLOYED_NOT_ACTIVATED;deployment=${deploymentId};url=${url}`,
      traceability: {
        missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
        artifactId: successor.artifactId,
        deploymentId,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
}

refreshMissionActivityFromDisk();
const after = projectCommandActivity({ organizationId: LIVE_ORG });
const afterCore = deriveInfinityDecisionCoreState({
  commandRoomStatus: after.rooms.executive_office.status,
  nowInspectingStatus: after.nowInspecting.status,
});
const slim = {
  artifactId: successor.artifactId,
  digest: successor.digest,
  hqInArtifact,
  deploymentId,
  publicUrl: url,
  providerFinalState: "READY",
  livePassed: passed,
  activated,
  activationCount: activated ? 1 : 0,
  deployments: 1,
  during: {
    currentMission: during.nowInspecting.currentMission,
    status: during.nowInspecting.status,
    command: during.rooms.executive_office.status,
    deploymentDepot: during.rooms.launch_operations.status,
    validationStation: during.rooms.quality_control.status,
    infinityDecisionCore: duringCore,
  },
  after: {
    active: after.counts.activeMissions,
    currentMission: after.nowInspecting.currentMission,
    currentExecution: after.nowInspecting.status,
    latestCompleted: after.latestCompleted?.missionType ?? null,
    authorizationRequired: after.nowInspecting.authorizationRequired,
    blocker: after.nowInspecting.blocker,
    infinityDecisionCore: afterCore,
    rooms: Object.fromEntries(
      Object.entries(after.rooms).map(([id, slice]) => [id, { status: slice.status, summary: slice.summary }]),
    ),
  },
  experiment: inspectRealMarketEvidence().experiment.state,
  clockRestarted: inspectExperimentClock().restarted,
  observer: inspectMailboxObserverHealth(),
  live: {
    passingRoutes: live.passingRoutes,
    intentionalRedirects: live.intentionalRedirects,
    failingRoutes: live.failingRoutes,
    notFound: live.notFound,
    runtimeErrors: live.runtimeErrors,
    missingLiveEvidence: live.missingLiveEvidence,
    pageRoutesChecked: live.pageRoutesChecked,
    fullTextContrast: live.fullTextContrast,
    fullLinkContrast: live.fullLinkContrast,
    sameColorFailures: live.sameColorFailures,
    nearInvisibleFailures: live.nearInvisibleFailures,
    hoverFocusFailures: live.hoverFocusFailures,
    humanFirst: live.humanFirst,
    renderedTextContrast: live.renderedTextContrast,
    trustedSources: live.trustedSources,
    hubRoutesChecked: live.hubRoutesChecked,
    hubFailures: live.hubFailures,
    strayLeftovers: live.strayLeftovers,
    founder: live.founder,
    navSevenChecked: live.navSevenChecked,
    navSevenPassing: live.navSevenPassing,
    navNearInvisible: live.navNearInvisible,
    navWcagFailures: live.navWcagFailures,
    colorParser: live.colorParser,
    hero: live.hero,
    heroOverall: live.heroOverall,
    heroPassing: live.heroPassing,
    heroRequired: live.heroRequired,
    heroDefaultFailures: live.heroDefaultFailures,
    heroHoverFailures: live.heroHoverFailures,
    heroFocusFailures: live.heroFocusFailures,
    contrastSamples: live.contrastSamples,
    linkSamples: live.linkSamples,
    liveMachinePhrases: live.liveMachinePhrases,
    livePlaceholders: live.livePlaceholders,
  },
};
await writeFile(".infinity/homepage-hero-link-contrast-deploy-result.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
