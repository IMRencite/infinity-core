import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { searchDepthRouteManifest } from "../lib/infinity/market-validation-experiment/cre-authority-expansion-routes.ts";

type GateReport = {
  artifactId: string;
  digest: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
  routes: number;
  intended: number;
  founderVisualReviewReady: string;
  pageLoop: {
    overall: string | null;
    rendered: number | null;
    validated: number | null;
    passedFirstAttempt: number | null;
    requiredRepair: number | null;
    pagesRepaired: number | null;
    totalRepairIterations: number | null;
    repairCeilingExceeded: number | null;
    finalFailed: number | null;
    missingEvidence: number | null;
    sameColorFailures: number | null;
    nearInvisibleFailures: number | null;
    hoverFocusFailures: number | null;
    missingContrastSamples: number | null;
    humanFirstRemaining: number | null;
    humanFirstRepaired: number | null;
    trustedSourcesFailures: number | null;
    thinish: number | null;
    fullRoute: string | null;
    promotion: string | null;
  };
  demand: { overall: string | null; thinPages: number | null };
  cannibal: { overall: string | null; cannibalizingPages: number | null };
  discovery: { overall: string | null; orphans: number | null; deadEnds: number | null };
  contrast: string | null;
  rhythm: string | null;
  standalone: Record<string, number> | null;
  answerChunks: Record<string, number> | null;
};

function readAutorepairGates(
  successor: Awaited<ReturnType<typeof reconstructCreSearchDepthSuccessor>>,
  intended: number,
): GateReport {
  const demandByTopic = Object.fromEntries(
    Object.entries(successor.demand.byTopic).map(([topic, row]) => [topic, row.standalone]),
  );
  return {
    artifactId: successor.artifactId,
    digest: successor.digest,
    predecessorArtifactId: successor.predecessorArtifactId,
    predecessorDigest: successor.predecessorDigest,
    routes: successor.routes,
    intended,
    founderVisualReviewReady: successor.founderVisualReviewReady,
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
      sameColorFailures: successor.pageLoop.sameColorFailures,
      nearInvisibleFailures: successor.pageLoop.nearInvisibleFailures,
      hoverFocusFailures: successor.pageLoop.hoverFocusFailures,
      missingContrastSamples: successor.pageLoop.missingContrastSamples,
      humanFirstRemaining: successor.pageLoop.humanFirstRemaining,
      humanFirstRepaired: successor.pageLoop.humanFirstRepaired,
      trustedSourcesFailures: successor.pageLoop.trustedSourcesFailures,
      thinish: successor.pageLoop.seoFailures,
      fullRoute: successor.pageLoop.fullRoute.overall,
      promotion: successor.pageLoop.promotion.overall,
    },
    demand: {
      overall: successor.demand.overall,
      thinPages: successor.demand.thinPages,
    },
    cannibal: {
      overall: successor.cannibal.overall,
      cannibalizingPages: successor.cannibal.cannibalizingPages,
    },
    discovery: {
      overall: successor.discovery.overall,
      orphans: successor.publishability.graph.orphans,
      deadEnds: successor.publishability.graph.deadEnds,
    },
    contrast: successor.contrast.overall,
    rhythm: successor.rhythm.overall,
    standalone: Object.keys(demandByTopic).length > 0 ? demandByTopic : successor.discovery.visibleByTopic,
    answerChunks: successor.pageLoop.familyCounts,
  };
}

const successor = await reconstructCreSearchDepthSuccessor();
const manifest = searchDepthRouteManifest();
process.stdout.write(`${JSON.stringify(readAutorepairGates(successor, manifest.intendedCount), null, 2)}\n`);
