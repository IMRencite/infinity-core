import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { runProviderEquivalentArtifactBuildGate } from "../lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate.ts";

const successor = await reconstructCreSearchDepthSuccessor();
const gate = await runProviderEquivalentArtifactBuildGate({
  artifactId: successor.artifactId,
  files: successor.files,
  mode: "full",
  keepRoot: true,
  infinityCoreRoot: process.cwd(),
  freeze: true,
});
const isolated = gate.isolated;
console.log(
  JSON.stringify(
    {
      status: gate.status,
      frozen: gate.frozen,
      isolatedRoot: Boolean(gate.isolatedRoot),
      issues: gate.issues,
      nextBuild: gate.nextBuild,
      cleanRoomIsolation: gate.cleanRoomIsolation,
      install: isolated?.installResult,
      build: isolated?.buildResult,
      typescript: isolated?.typescript,
      stderrTail: (isolated?.build.stderr ?? "").slice(-4000),
      stdoutTail: (isolated?.build.stdout ?? "").slice(-4000),
    },
    null,
    2,
  ),
);
