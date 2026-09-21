import { reconstructCrePricingPrerenderRepairSuccessor } from "../lib/infinity/venture-website-architecture/cre-pricing-prerender-repair-successor.ts";

const successor = await reconstructCrePricingPrerenderRepairSuccessor();
process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      predecessor: successor.predecessorArtifactId,
      routes: successor.routes,
      hook: successor.hookBoundary.overall,
      findings: successor.hookBoundary.findings.slice(0, 12),
      pageLoop: successor.pageLoop.overall,
      ready: successor.founderVisualReviewReady,
      premium: successor.hard.ready,
    },
    null,
    2,
  )}\n`,
);
