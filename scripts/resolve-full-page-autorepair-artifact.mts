import { readFileSync } from "node:fs";
import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { CRE_FULL_PAGE_AUTOREPAIR_MISSION, CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID } from "../lib/infinity/venture-website-architecture/answer-authority/full-page-autorepair-mission.ts";
import { SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID, SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST } from "../lib/infinity/market-validation-experiment/constants.ts";

const events = JSON.parse(readFileSync(".infinity/mission-activity/events.json", "utf8")) as Array<{
  missionId: string;
  missionType: string;
  eventType: string;
  status?: string;
  stepType?: string;
  authorizationRequired?: string | null;
  blocker?: string | null;
  technicalDetail?: string | null;
  summary?: string | null;
}>;
const mine = events.filter((event) => event.missionId === CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID);
const successor = await reconstructCreSearchDepthSuccessor();
const last = mine.at(-1);
console.log(
  JSON.stringify(
    {
      missionId: CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID,
      missionType: CRE_FULL_PAGE_AUTOREPAIR_MISSION,
      missionEvents: mine.length,
      lastEvent: last
        ? {
            eventType: last.eventType,
            status: last.status,
            stepType: last.stepType,
            blocker: last.blocker,
            authorizationRequired: last.authorizationRequired,
            summary: last.summary,
          }
        : null,
      lockedArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
      lockedDigest: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
      reconstructed: {
        artifactId: successor.artifactId,
        digest: successor.digest,
        routes: successor.routes,
        predecessor: successor.predecessorArtifactId,
        ready: successor.founderVisualReviewReady,
        publishability: successor.publishability.ready,
        hard: successor.hard.ready,
        pageLoop: {
          overall: successor.pageLoop.overall,
          rendered: successor.pageLoop.rendered,
          validated: successor.pageLoop.validated,
          passedFirstAttempt: successor.pageLoop.passedFirstAttempt,
          requiredRepair: successor.pageLoop.requiredRepair,
          pagesRepaired: successor.pageLoop.pagesRepaired,
          totalRepairIterations: successor.pageLoop.totalRepairIterations,
          repairCeilingExceeded: successor.pageLoop.repairCeilingExceeded,
          finalFailed: successor.pageLoop.finalFailed,
          missingEvidence: successor.pageLoop.missingEvidence,
          fullRoute: successor.pageLoop.fullRoute.overall,
        },
        contrast: successor.contrast.overall,
        demand: successor.demand.overall,
        discovery: successor.discovery.overall,
        cannibal: successor.cannibal.overall,
      },
      digestMatchesLock: successor.digest === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
      identityMatchesLock: successor.artifactId === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    },
    null,
    2,
  ),
);
