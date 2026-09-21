import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";

const successor = await reconstructCreSearchDepthSuccessor();
const failed = successor.pageLoop.records.filter((record) => record.finalState !== "READY_FOR_ARTIFACT");
console.log(
  JSON.stringify(
    {
      digest: successor.digest,
      artifactId: successor.artifactId,
      ready: successor.founderVisualReviewReady,
      routes: successor.routes,
      pageLoop: {
        overall: successor.pageLoop.overall,
        rendered: successor.pageLoop.rendered,
        validated: successor.pageLoop.validated,
        passedFirstAttempt: successor.pageLoop.passedFirstAttempt,
        requiredRepair: successor.pageLoop.requiredRepair,
        pagesRepaired: successor.pageLoop.pagesRepaired,
        totalRepairIterations: successor.pageLoop.totalRepairIterations,
        sharedPromotions: successor.pageLoop.sharedPromotions,
        repairCeilingExceeded: successor.pageLoop.repairCeilingExceeded,
        finalFailed: successor.pageLoop.finalFailed,
        missingEvidence: successor.pageLoop.missingEvidence,
        familyCounts: successor.pageLoop.familyCounts,
        heroFailures: successor.pageLoop.heroFailures,
        seoFailures: successor.pageLoop.seoFailures,
        geoFailures: successor.pageLoop.geoFailures,
        contrastFailures: successor.pageLoop.contrastFailures,
        typographyFailures: successor.pageLoop.typographyFailures,
        humanFirstRemaining: successor.pageLoop.humanFirstRemaining,
        fullRoute: successor.pageLoop.fullRoute.overall,
        promotion: successor.pageLoop.promotion.sharedFixesRequired,
      },
      failed: failed.slice(0, 20).map((record) => ({
        route: record.route,
        state: record.finalState,
        failures: record.failures,
        families: record.families,
        missingEvidence: record.missingEvidence,
      })),
      failedCount: failed.length,
    },
    null,
    2,
  ),
);
