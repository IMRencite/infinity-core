import { evaluateServerlessBuiltArtifactRuntimeDependencyQc } from "../lib/infinity/runtime-operations/serverless-built-artifact-runtime-dependency-v1";
import { evaluateServerlessFunctionColdStartQc } from "../lib/infinity/runtime-operations/serverless-function-cold-start-v1";
import { evaluateServerlessRuntimeFileTraceClosureQc } from "../lib/infinity/runtime-operations/serverless-runtime-file-trace-closure-v1";

const dest = process.argv[2];
const sourceRoot = process.argv[3] ?? dest;
if (!dest) {
  console.error("usage: tsx scripts/verify-serverless-built-artifact-pre-promote.ts <dest> [sourceRoot]");
  process.exit(2);
}

async function main() {
const artifact = evaluateServerlessBuiltArtifactRuntimeDependencyQc({ cwd: dest, nextRoot: dest });
const sourceTrace = evaluateServerlessRuntimeFileTraceClosureQc({ cwd: dest });
const cold = await evaluateServerlessFunctionColdStartQc({ repoRoot: sourceRoot });

const report = {
  SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC: artifact.SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC,
  SOURCE_TRACE_QC: sourceTrace.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC,
  SERVERLESS_FUNCTION_COLD_START_QC: cold.SERVERLESS_FUNCTION_COLD_START_QC,
  PORTFOLIO_BUILT_FUNCTION_COLD_START_QC: cold.PORTFOLIO_BUILT_FUNCTION_COLD_START_QC,
  PORTFOLIO_JOB_WORKER_BUILT_ARTIFACT_QC: artifact.SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC,
  PORTFOLIO_JOB_WORKER_COLD_START_QC: cold.PORTFOLIO_JOB_WORKER_COLD_START_QC,
  STAGED_PORTFOLIO_RUNTIME_DEPENDENCY_MODE: "BUNDLED_MODULE",
  STAGED_PORTFOLIO_REQUIRED_RUNTIME_FILE_COUNT: artifact.missing.length,
  artifact,
  cold,
};

console.log(JSON.stringify(report, null, 2));
const pass =
  artifact.SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC === "PASS" &&
  cold.SERVERLESS_FUNCTION_COLD_START_QC === "PASS";
process.exit(pass ? 0 : 1);
