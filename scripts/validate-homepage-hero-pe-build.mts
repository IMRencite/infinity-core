import { writeFile } from "node:fs/promises";
import { reconstructCreHomepageHeroLinkContrastSuccessor } from "../lib/infinity/venture-website-architecture/cre-homepage-hero-link-contrast-successor.ts";
import { runProviderEquivalentArtifactBuildGate } from "../lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate.ts";

const successor = await reconstructCreHomepageHeroLinkContrastSuccessor();
const gate = await runProviderEquivalentArtifactBuildGate({
  artifactId: successor.artifactId,
  files: successor.files,
  mode: "full",
  keepRoot: true,
  infinityCoreRoot: process.cwd(),
  freeze: true,
});
const slim = {
  artifactId: successor.artifactId,
  digest: successor.digest,
  status: gate.status,
  frozen: gate.frozen,
  issues: gate.issues,
};
await writeFile(".infinity/homepage-hero-pe-build.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
