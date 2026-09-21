import { writeFile } from "node:fs/promises";
import { runCrePricingPrerenderRepairMission } from "../lib/infinity/venture-website-architecture/answer-authority/pricing-prerender-repair-mission.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants.ts";

const ran = await runCrePricingPrerenderRepairMission({ runIsolatedBuild: true });
const view = projectCommandActivity({ organizationId: LIVE_ORG });
const successor = ran.result.successor;
const gate = ran.result.technical;
const slim = {
  mission: ran.result ? "CRE_PROVIDER_EQUIVALENT_PRICING_BUILD_REPAIR_V1" : null,
  artifactId: successor.artifactId,
  digest: successor.digest,
  predecessor: successor.predecessorArtifactId,
  predecessorDigest: successor.predecessorDigest,
  routes: successor.routes,
  hookBoundary: successor.hookBoundary.overall,
  pageLoop: successor.pageLoop.overall,
  ready: successor.founderVisualReviewReady,
  premiumReady: successor.hard.ready,
  gateStatus: "status" in gate ? gate.status : null,
  nextBuild: "nextBuild" in gate ? gate.nextBuild : null,
  issues: "issues" in gate ? gate.issues : null,
  install: "isolated" in gate ? gate.isolated?.installResult : null,
  build: "isolated" in gate ? gate.isolated?.buildResult : null,
  command: ran.command,
  creationLab: ran.creationLab,
  systemsArchitect: ran.systemsArchitect,
  validationStation: ran.validationStation,
  deploymentDepot: ran.deploymentDepot,
  hq: {
    currentMission: view.nowInspecting.currentMission,
    status: view.nowInspecting.status,
    currentTask: view.nowInspecting.currentTask,
    blocker: view.nowInspecting.blocker,
    authorizationRequired: view.nowInspecting.authorizationRequired,
    counts: view.counts,
  },
  experiment: ran.result.preserved.experiment,
  observer: ran.result.preserved.observer,
  providerWrites: ran.providerWrites,
};
await writeFile(".infinity/pricing-prerender-repair-result.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
