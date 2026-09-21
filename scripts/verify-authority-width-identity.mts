import { reconstructCreAuthorityWidthSuccessor } from "../lib/infinity/venture-website-architecture/cre-authority-width-successor";
import {
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
} from "../lib/infinity/market-validation-experiment/constants";

const successor = await reconstructCreAuthorityWidthSuccessor();
const report = {
  artifactId: successor.artifactId,
  expectedId: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  digest: successor.digest,
  expectedDigest: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
  identity: successor.artifactId === SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID ? "PASS" : "FAIL",
  parity: successor.digest === SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST ? "PASS" : "FAIL",
  routes: successor.routes,
  ready: successor.founderVisualReviewReady,
  width: successor.width.overall,
  breakout: successor.navigation.breakout.overall,
  grid: successor.navigation.grid.overall,
  sources: successor.sources.overall,
  shell: successor.shell.overall,
  hero: successor.hero.overall,
  publishability: successor.publishability.ready,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.parity === "FAIL" || report.identity === "FAIL") process.exit(2);
