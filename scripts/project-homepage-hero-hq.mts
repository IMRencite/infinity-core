import { writeFile } from "node:fs/promises";
import { runCreHomepageHeroLinkAndHqInfinityCoreRepairMission } from "../lib/infinity/venture-website-architecture/answer-authority/homepage-hero-link-and-hq-infinity-core-repair-mission.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence.ts";

const ran = await runCreHomepageHeroLinkAndHqInfinityCoreRepairMission({ runIsolatedBuild: false });
const successor = ran.result.successor;
const slim = {
  mission: ran.view.nowInspecting.currentMission,
  status: ran.view.nowInspecting.status,
  blocker: ran.view.nowInspecting.blocker,
  authorizationRequired: ran.view.nowInspecting.authorizationRequired,
  command: ran.command,
  creationLab: ran.creationLab,
  systemsArchitect: ran.systemsArchitect,
  validationStation: ran.validationStation,
  deploymentDepot: ran.deploymentDepot,
  growthNexus: ran.growthNexus,
  artifactId: successor.artifactId,
  digest: successor.digest,
  pageLoop: {
    overall: successor.pageLoop.overall,
    rendered: successor.pageLoop.rendered,
    validated: successor.pageLoop.validated,
    finalFailed: successor.pageLoop.finalFailed,
    missingEvidence: successor.pageLoop.missingEvidence,
  },
  heroLinks: successor.heroLinks,
  hubLayout: successor.hubLayout.overall,
  humanFirst: successor.humanFirst,
  hookBoundary: successor.hookBoundary.overall,
  ready: successor.founderVisualReviewReady,
  premium: successor.hard.ready,
  experiment: inspectRealMarketEvidence().experiment.state,
  clockRestarted: inspectExperimentClock().restarted,
  observer: inspectMailboxObserverHealth(),
};
await writeFile(".infinity/homepage-hero-hq-projection.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
