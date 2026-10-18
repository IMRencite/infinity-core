/**
 * Isolated-runtime preflight: portfolio serverless file trace closure on dest tree.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const dest = process.argv[2];
if (!dest || !existsSync(dest)) {
  console.log(JSON.stringify({ ok: false, reason: "DEST_MISSING" }));
  process.exit(1);
}

const { evaluateServerlessRuntimeFileTraceClosureQc } = await import(
  "../lib/infinity/runtime-operations/serverless-runtime-file-trace-closure-v1.ts"
);

const result = evaluateServerlessRuntimeFileTraceClosureQc({
  cwd: dest,
  nextConfigRelativePath: "next.config.ts",
});

console.log(JSON.stringify({ ok: result.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC === "PASS", ...result }, null, 2));
process.exit(result.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC === "PASS" ? 0 : 1);
