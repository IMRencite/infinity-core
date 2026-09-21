import { readFileSync } from "node:fs";
import { currentStandaloneRoutesForTopic } from "../lib/infinity/venture-website-architecture/search-demand-depth-research.ts";
import { TOPIC_IDS, uniqueCanonicalQuestions } from "../lib/infinity/venture-website-architecture/search-validated-question-graph.ts";
import { evaluateTopicGraphConnectivity } from "../lib/infinity/venture-website-architecture/authority-expansion-gates.ts";

const raw = JSON.parse(readFileSync(".infinity/full-page-autorepair-successor.json", "utf8")) as {
  pageLoop: { files: Array<{ path: string; content: string }> };
};
const files = raw.pageLoop.files;
const chunks = files.reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
const graph = evaluateTopicGraphConnectivity(files);
const standalone = Object.fromEntries(TOPIC_IDS.map((topic) => [topic, currentStandaloneRoutesForTopic(topic).length]));
const answerChunks = uniqueCanonicalQuestions().filter((row) => row.answerChunkEligible).length;
process.stdout.write(
  `${JSON.stringify({ chunks, answerChunks, standalone, orphans: graph.report.orphans, deadEnds: graph.report.deadEnds, graphOverall: graph.overall }, null, 2)}\n`,
);
