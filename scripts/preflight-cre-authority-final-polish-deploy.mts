import { writeFile } from "node:fs/promises";
import { reconstructCreAuthorityFinalPolishSuccessor } from "../lib/infinity/venture-website-architecture/cre-authority-final-polish-successor";
import { clarifyAuthorityGraphCounts } from "../lib/infinity/market-validation-experiment/cre-authority-final-polish-graph";
import {
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
} from "../lib/infinity/market-validation-experiment/constants";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect";

const reconstructed = await reconstructCreAuthorityFinalPolishSuccessor();
const graph = clarifyAuthorityGraphCounts(reconstructed.files);
const cam = pageContent(reconstructed.files, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
const camFail = /The sample treats CAM as tenant-paid on a net path[\s\S]{0,240}The sample treats CAM as tenant-paid on a net path/.test(
  cam,
);
const mistakeFail = /Using one CAM number for two buildings[\s\S]{0,240}Using one CAM number for two buildings/.test(cam);
const report = {
  artifactId: reconstructed.artifactId,
  expectedArtifactId: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  actualDigest: reconstructed.digest,
  expectedDigest: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
  identity: reconstructed.artifactId === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL",
  parity: reconstructed.digest === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL",
  routes: reconstructed.routes,
  ready: reconstructed.publishability.ready,
  founderVisualReviewReady: reconstructed.founderVisualReviewReady,
  graph,
  founderCamRegression: camFail ? "FAIL" : "PASS",
  founderMistakeRegression: mistakeFail ? "FAIL" : "PASS",
  footer: reconstructed.footer.overall,
  footerAttribution: reconstructed.footerAttribution.ok,
  navigation: {
    blocks: reconstructed.navigation.blocks,
    cards: reconstructed.navigation.cards,
    uniqueDestinations: reconstructed.navigation.uniqueDestinations,
    duplicateDestinationProblems: reconstructed.navigation.duplicateDestinationProblems,
  },
  highlights: reconstructed.highlights,
  stop:
    reconstructed.artifactId !== SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID ||
    reconstructed.digest !== SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST ||
    graph.orphans > 0 ||
    graph.deadEnds > 0 ||
    camFail ||
    mistakeFail,
};
await writeFile(".infinity/authority-final-polish-preflight.json", `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.stop) process.exitCode = 3;
