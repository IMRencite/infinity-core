import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { reconstructCreAuthorityWidthSuccessor } from "../lib/infinity/venture-website-architecture/cre-authority-width-successor.ts";
import {
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
} from "../lib/infinity/market-validation-experiment/constants.ts";
import { searchResearchSummary } from "../lib/infinity/venture-website-architecture/search-validated-question-graph.ts";
import { assertDepthCatalogLocks } from "../lib/infinity/venture-website-architecture/search-demand-depth-catalog.ts";
import { allDepthPageSpecs } from "../lib/infinity/venture-website-architecture/search-demand-depth-specs.ts";

assertDepthCatalogLocks();
const research = searchResearchSummary();
const width = await reconstructCreAuthorityWidthSuccessor();
const successor = await reconstructCreSearchDepthSuccessor();
console.log(
  JSON.stringify(
    {
      widthId: width.artifactId,
      widthDigest: width.digest,
      widthUnchanged:
        width.artifactId === SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID &&
        width.digest === SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
      artifactId: successor.artifactId,
      digest: successor.digest,
      routes: successor.routes,
      newStandalone: successor.newStandaloneRoutes,
      ready: successor.founderVisualReviewReady,
      demand: successor.demand.overall,
      discovery: successor.discovery.overall,
      cannibal: successor.cannibal.overall,
      rhythm: successor.rhythm.overall,
      contrast: successor.contrast.overall,
      publishability: successor.publishability.ready,
      hard: successor.hard.ready,
      failures: successor.publishability.failures,
      hardFailures: successor.hard.failures,
      canonicalUnique: research.canonicalUnique,
      specCount: allDepthPageSpecs().length,
      coverage: successor.coverage,
    },
    null,
    2,
  ),
);
