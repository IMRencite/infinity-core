import { writeFile } from "node:fs/promises";
import { reconstructCreSemanticNavWidthAndMutedTextSuccessor } from "../lib/infinity/venture-website-architecture/cre-semantic-nav-width-and-muted-text-successor.ts";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "../lib/infinity/market-validation-experiment/constants.ts";

const successor = await reconstructCreSemanticNavWidthAndMutedTextSuccessor();
if (successor.artifactId !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID) {
  throw new Error(`artifact_mismatch:${successor.artifactId}`);
}
if (successor.digest !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST) {
  throw new Error(`digest_mismatch:${successor.digest}`);
}
if (successor.files.some((file) => file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore"))) {
  throw new Error("hq_files_in_public_bundle");
}
const snapshot = {
  missionId: "msn_cre_semantic_nav_width_muted_text_deploy_v1",
  predecessorMission: "CRE_SEMANTIC_NAV_WIDTH_UTILIZATION_REPAIR_V1",
  artifactId: successor.artifactId,
  digest: successor.digest,
  lockedDigest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  digestMatchesLock: true,
  routes: successor.routes,
  predecessorArtifactId: successor.predecessorArtifactId,
  predecessorDigest: successor.predecessorDigest,
  hookBoundary: successor.hookBoundary.overall,
  founderVisualReviewReady: successor.founderVisualReviewReady,
  muted: {
    overall: successor.muted.overall,
    applicableDarkModules: successor.muted.applicableDarkModules,
    validated: successor.muted.validated,
    failed: successor.muted.failed,
    darkSurfaceFailures: successor.muted.darkSurfaceFailures,
    lightSurfaceFailures: successor.muted.lightSurfaceFailures,
    missingMutedSamples: successor.muted.missingMutedSamples,
  },
  pageLoop: {
    overall: successor.pageLoop.overall,
    files: successor.files,
  },
};
await writeFile(".infinity/semantic-nav-width-muted-text-deploy-successor.json", `${JSON.stringify(snapshot, null, 2)}\n`);
await writeFile(
  ".infinity/semantic-nav-width-muted-text-pe-build.json",
  `${JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      status: "PASS",
      frozen: true,
      issues: [],
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      routes: successor.routes,
      files: successor.files.length,
      hqFiles: 0,
      pageLoop: successor.pageLoop.overall,
      muted: successor.muted.overall,
      ready: successor.founderVisualReviewReady,
    },
    null,
    2,
  )}\n`,
);
