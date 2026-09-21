import { reconstructCreHubQuestionBoardLayoutSuccessor } from "../lib/infinity/venture-website-architecture/cre-hub-question-board-layout-successor.ts";

const successor = await reconstructCreHubQuestionBoardLayoutSuccessor();
process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      predecessor: successor.predecessorArtifactId,
      routes: successor.routes,
      hubRoutes: successor.hubRoutes,
      hubLayout: successor.hubLayout.overall,
      discovery: successor.discovery.overall,
      pageLoop: successor.pageLoop.overall,
      hookBoundary: successor.hookBoundary.overall,
      contrast: successor.contrast.overall,
      humanFirst: successor.humanFirst.overall,
      ready: successor.founderVisualReviewReady,
      premiumReady: successor.hard.ready,
      orphans: successor.publishability.graph.orphans,
      deadEnds: successor.publishability.graph.deadEnds,
    },
    null,
    2,
  )}\n`,
);
