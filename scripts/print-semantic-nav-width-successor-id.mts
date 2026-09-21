import { reconstructCreSemanticNavWidthAndMutedTextSuccessor } from "../lib/infinity/venture-website-architecture/cre-semantic-nav-width-and-muted-text-successor.ts";

const successor = await reconstructCreSemanticNavWidthAndMutedTextSuccessor();
process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      routes: successor.routes,
      pageLoop: successor.pageLoop.overall,
      muted: successor.muted.overall,
      darkSurfaceFailures: successor.muted.darkSurfaceFailures,
      missingMutedSamples: successor.muted.missingMutedSamples,
      hubLayout: successor.hubLayout.overall,
      humanFirst: successor.humanFirst.overall,
      ready: successor.founderVisualReviewReady,
      hqInArtifact: successor.files.some((file) => file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore")),
    },
    null,
    2,
  )}\n`,
);
