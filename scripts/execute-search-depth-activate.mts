import { writeFile } from "node:fs/promises";
import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import {
  searchDepthLiveVerificationPassed,
  verifySearchDepthLivePublic,
} from "../lib/infinity/market-validation-experiment/cre-search-depth-live-verify.ts";
import { activateSearchDepthSuccessorPublicArtifact } from "../lib/infinity/market-validation-experiment/active-public-artifact.ts";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
} from "../lib/infinity/market-validation-experiment/constants.ts";
import { getCanonicalActivePublicValidationState } from "../lib/infinity/market-validation-experiment/active-public-artifact.ts";

const url = "https://infinity-validation-cre-lease-npv-e72beb7b-kd9ktl3qy.vercel.app";
const deploymentId = "dpl_5zWCLA1rQLVLXed4Wi2ypvk9tfFj";
const successor = await reconstructCreSearchDepthSuccessor();
if (successor.artifactId !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID) throw new Error("identity");
if (successor.digest !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST) throw new Error("digest");
const live = await verifySearchDepthLivePublic({
  url,
  artifactId: successor.artifactId,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  candidateId: CRE_CANDIDATE_ID,
  files: successor.files,
});
const passed = searchDepthLiveVerificationPassed(live);
let activated = false;
if (passed) {
  activateSearchDepthSuccessorPublicArtifact({
    artifactId: successor.artifactId,
    digest: successor.digest,
    deploymentId,
    url,
  });
  activated = true;
}
const out = {
  passed,
  activated,
  visualPassed: live.visualPassed,
  seoGeoPassed: live.seoGeoPassed,
  hubDiscovery: live.hubDiscovery,
  authoritySectionWidth: live.authoritySectionWidth,
  shellConsistency: live.shellConsistency,
  semanticNavBreakout: live.semanticNavBreakout,
  sources: live.sources,
  heroIntersection: live.heroIntersection,
  heroSeparationGate: live.heroSeparationGate,
  readback: getCanonicalActivePublicValidationState(),
};
await writeFile(".infinity/search-depth-activate-result.json", `${JSON.stringify(out, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
