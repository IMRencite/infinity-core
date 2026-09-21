import { reconstructCreHubQuestionBoardLayoutSuccessor } from "../lib/infinity/venture-website-architecture/cre-hub-question-board-layout-successor.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect.ts";

const successor = await reconstructCreHubQuestionBoardLayoutSuccessor();
const chunks = successor.files
  .filter((file) => file.encoding !== "base64")
  .reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
const cam = pageContent(successor.files, "/commercial-lease-npv/should-cam-be-in-lease-npv");
process.stdout.write(
  `${JSON.stringify(
    {
      chunks,
      thinPages: successor.demand.thinPages,
      cannibal: successor.cannibal.cannibalizingPages,
      orphans: successor.publishability.graph.orphans,
      deadEnds: successor.publishability.graph.deadEnds,
      clockRestarted: inspectExperimentClock().restarted,
      trustedSources: /Trusted sources/i.test(cam),
      pageLoopRendered: successor.pageLoop.rendered,
      pageLoopFailed: successor.pageLoop.finalFailed,
      missingEvidence: successor.pageLoop.missingEvidence,
      contrast: successor.contrast.overall,
      humanFirst: successor.humanFirst.overall,
      hubRoutes: successor.hubRoutes.length,
    },
    null,
    2,
  )}\n`,
);
