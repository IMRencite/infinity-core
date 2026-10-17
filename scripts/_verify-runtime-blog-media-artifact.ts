import { readFileSync } from "node:fs";
import {
  evaluateBlogRuntimeAfterDarkPredeployProbe,
  evaluateBlogRuntimeMediaArtifactQc,
  evaluateCtServerlessMediaStarvationRegressionQc,
} from "../lib/infinity/organic-growth-engine/continuous/blog-runtime-media-artifact-qc";

const dest = process.argv[2];
if (!dest) {
  console.error("usage: tsx scripts/_verify-runtime-blog-media-artifact.ts <isolated-runtime-dest>");
  process.exit(2);
}

try {
  readFileSync(".env.local", "utf8");
} catch {
  /* optional for artifact-only QC */
}
for (const line of (() => {
  try {
    return readFileSync(".env.local", "utf8").split(/\r?\n/);
  } catch {
    return [];
  }
})()) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
}

const artifact = evaluateBlogRuntimeMediaArtifactQc({ artifact_root: dest });
const regression = evaluateCtServerlessMediaStarvationRegressionQc({ artifact_root: dest });
const predeploy = evaluateBlogRuntimeAfterDarkPredeployProbe({ artifact_root: dest });

const report = {
  BLOG_RUNTIME_MEDIA_ARTIFACT_QC: artifact.result,
  CT_SERVERLESS_MEDIA_STARVATION_REGRESSION_QC: regression.result,
  INFINITY_RUNTIME_PUBLIC_VISUAL_COPY_QC: artifact.INFINITY_RUNTIME_PUBLIC_VISUAL_COPY_QC,
  INFINITY_RUNTIME_PUBLIC_MEDIA_COPY_QC: artifact.INFINITY_RUNTIME_PUBLIC_MEDIA_COPY_QC,
  CT_AFTER_DARK_RUNTIME_MEDIA_PATH: artifact.CT_AFTER_DARK_RUNTIME_MEDIA_PATH,
  CT_AFTER_DARK_RUNTIME_MEDIA_EXISTS: artifact.CT_AFTER_DARK_RUNTIME_MEDIA_EXISTS,
  artifact,
  regression,
  predeploy,
};

console.log(JSON.stringify(report, null, 2));
if (artifact.result !== "PASS" || regression.result !== "PASS") process.exit(1);
