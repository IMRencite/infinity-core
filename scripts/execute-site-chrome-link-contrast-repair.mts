import { writeFile } from "node:fs/promises";
import { runCreSiteChromeLinkContrastRepairMission } from "../lib/infinity/venture-website-architecture/answer-authority/site-chrome-link-contrast-repair-mission.ts";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";

const ran = await runCreSiteChromeLinkContrastRepairMission({ runIsolatedBuild: true });
const successor = ran.result.successor;
const slim = {
  mission: "CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1",
  artifactId: successor.artifactId,
  digest: successor.digest,
  predecessor: successor.predecessorArtifactId,
  routes: successor.routes,
  pageLoop: successor.pageLoop.overall,
  hubLayout: successor.hubLayout.overall,
  hookBoundary: successor.hookBoundary.overall,
  humanFirst: successor.humanFirst.overall,
  ready: successor.founderVisualReviewReady,
  premiumReady: successor.hard.ready,
  technical: ran.result.technical,
  command: ran.command,
  creationLab: ran.creationLab,
  systemsArchitect: ran.systemsArchitect,
  validationStation: ran.validationStation,
  deploymentDepot: ran.deploymentDepot,
  growthNexus: ran.growthNexus,
  currentMission: ran.view.nowInspecting.currentMission,
  status: ran.view.nowInspecting.status,
  blocker: ran.view.nowInspecting.blocker,
  authorizationRequired: ran.view.nowInspecting.authorizationRequired,
  latestCompleted: ran.view.latestCompleted,
  experiment: inspectRealMarketEvidence().experiment.state,
  clockRestarted: inspectExperimentClock().restarted,
  observer: inspectMailboxObserverHealth(),
  deployments: 0,
  activations: 0,
};
await writeFile(".infinity/site-chrome-link-contrast-repair-result.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
