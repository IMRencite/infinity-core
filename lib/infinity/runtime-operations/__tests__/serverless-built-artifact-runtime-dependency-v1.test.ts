import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { evaluateServerlessBuiltArtifactRuntimeDependencyQc } from "../serverless-built-artifact-runtime-dependency-v1";
import { evaluateServerlessRuntimeFileTraceClosureQc } from "../serverless-runtime-file-trace-closure-v1";

describe("serverless built artifact runtime dependency v1", () => {
  it("CONFIG_PASS_ARTIFACT_FAIL_REGRESSION_QC — source trace PASS while nft missing disk file", () => {
    const cwd = mkdtempSync(join(tmpdir(), "artifact-false-pass-"));
    mkdirSync(join(cwd, "lib/infinity/commerce"), { recursive: true });
    writeFileSync(join(cwd, "lib/infinity/commerce/canonical-variant-identity-v1.ts"), "export const x = 1;\n");
    mkdirSync(join(cwd, "lib/infinity/runtime-operations"), { recursive: true });
    writeFileSync(
      join(cwd, "lib/infinity/runtime-operations/runtime-file-dependency-manifest.v1.json"),
      JSON.stringify({
        schema: "RUNTIME_FILE_DEPENDENCY_MANIFEST_V2",
        routes: {
          "/api/runtime/portfolio-operating-tick": {
            originating_modules: [],
            module_load_read_targets: [
              {
                repo_relative_path: "lib/infinity/commerce/canonical-variant-identity-v1.ts",
                reader: "test",
                timing: "MODULE_LOAD",
              },
            ],
            runtime_dependencies: [
              {
                dependency_type: "RUNTIME_DISK_FILE",
                repo_relative_path: "lib/infinity/commerce/canonical-variant-identity-v1.ts",
                originating_module: "test",
              },
            ],
          },
          "/api/runtime/portfolio-job-worker": {
            originating_modules: [],
            module_load_read_targets: [
              {
                repo_relative_path: "lib/infinity/commerce/canonical-variant-identity-v1.ts",
                reader: "test",
                timing: "MODULE_LOAD",
              },
            ],
            runtime_dependencies: [],
          },
        },
        shared_portfolio_commerce_trace_globs: ["./lib/infinity/commerce/canonical-variant-identity-v1.ts"],
      }),
    );
    writeFileSync(
      join(cwd, "next.config.ts"),
      `const nextConfig = {
  outputFileTracingIncludes: {
    "/api/runtime/portfolio-operating-tick": ["./lib/infinity/commerce/canonical-variant-identity-v1.ts"],
  }, /* occupancynpvVentureDeployComposeTracing portfolioCommerceTraceClosure */
};
export default nextConfig;
`,
    );
    const sourceQc = evaluateServerlessRuntimeFileTraceClosureQc({ cwd });
    expect(sourceQc.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC).toBe("PASS");
    const artifactQc = evaluateServerlessBuiltArtifactRuntimeDependencyQc({ cwd, nextRoot: cwd });
    expect(artifactQc.SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC).toBe("FAIL");
    expect(artifactQc.missing.length).toBeGreaterThan(0);
  });

  it("BUNDLED_MODULE_RUNTIME_DEPENDENCY_QC — no nft raw source required when manifest is bundled-only", () => {
    const cwd = mkdtempSync(join(tmpdir(), "bundled-only-"));
    mkdirSync(join(cwd, "lib/infinity/runtime-operations"), { recursive: true });
    writeFileSync(
      join(cwd, "lib/infinity/runtime-operations/runtime-file-dependency-manifest.v1.json"),
      JSON.stringify({
        schema: "RUNTIME_FILE_DEPENDENCY_MANIFEST_V2",
        routes: {
          "/api/runtime/portfolio-operating-tick": {
            originating_modules: [],
            module_load_read_targets: [],
            runtime_dependencies: [
              {
                dependency_type: "BUNDLED_MODULE",
                originating_module: "lib/infinity/commerce/club-throttle-retail-v2-storefront-files.ts",
              },
            ],
          },
        },
        shared_portfolio_commerce_trace_globs: [],
      }),
    );
    const artifactQc = evaluateServerlessBuiltArtifactRuntimeDependencyQc({ cwd, nextRoot: cwd });
    expect(artifactQc.SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC).toBe("PASS");
  });
});
