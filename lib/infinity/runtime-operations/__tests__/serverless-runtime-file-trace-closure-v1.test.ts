import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  evaluateServerlessRuntimeFileTraceClosureQc,
  parseOutputFileTracingIncludes,
} from "../serverless-runtime-file-trace-closure-v1";
import { moduleLoadPathsForRoute } from "../runtime-file-dependency-manifest-v1";

function writePassingNextConfig(cwd: string, extraIncludes: string[] = []) {
  const primary = "./lib/infinity/commerce/canonical-variant-identity-v1.ts";
  const includes = [primary, ...extraIncludes];
  const quoted = includes.map((p) => `"${p}"`).join(",\n      ");
  writeFileSync(
    join(cwd, "next.config.ts"),
    `const nextConfig = {
  outputFileTracingIncludes: {
    "/api/runtime/portfolio-operating-tick": [
      ${quoted}
    ],
    "/api/runtime/portfolio-job-worker": [
      ${quoted}
    ],
  }, /* occupancynpvVentureDeployComposeTracing portfolioCommerceTraceClosure */
};
export default nextConfig;
`,
  );
}

describe("serverless runtime file trace closure v1", () => {
  it("parseOutputFileTracingIncludes tolerates bracket segments in traced paths", () => {
    const source = `const nextConfig = {
  outputFileTracingIncludes: {
    "/api/runtime/portfolio-job-worker": [
      "./app/occupancynpv/app/workspaces/[id]/page.tsx",
      "./lib/infinity/commerce/canonical-variant-identity-v1.ts"
    ],
  }, /* occupancynpvVentureDeployComposeTracing portfolioCommerceTraceClosure */
};`;
    const parsed = parseOutputFileTracingIncludes(source);
    expect(parsed["/api/runtime/portfolio-job-worker"]).toContain(
      "./lib/infinity/commerce/canonical-variant-identity-v1.ts",
    );
  });

  it("PORTFOLIO_CANONICAL_VARIANT_TRACE_REGRESSION_QC fails when trace omits canonical variant file", () => {
    const cwd = mkdtempSync(join(tmpdir(), "trace-closure-"));
    const rel = "lib/infinity/commerce/canonical-variant-identity-v1.ts";
    mkdirSync(join(cwd, "lib/infinity/runtime-operations"), { recursive: true });
    writeFileSync(
      join(cwd, "lib/infinity/runtime-operations/runtime-file-dependency-manifest.v1.json"),
      JSON.stringify({
        schema: "RUNTIME_FILE_DEPENDENCY_MANIFEST_V1",
        routes: {
          "/api/runtime/portfolio-operating-tick": {
            originating_modules: [],
            module_load_read_targets: [{ repo_relative_path: rel, reader: "test", timing: "MODULE_LOAD" }],
          },
          "/api/runtime/portfolio-job-worker": {
            originating_modules: [],
            module_load_read_targets: [{ repo_relative_path: rel, reader: "test", timing: "MODULE_LOAD" }],
          },
        },
        shared_portfolio_commerce_trace_globs: [`./${rel}`],
      }),
    );
    mkdirSync(join(cwd, "lib/infinity/commerce"), { recursive: true });
    writeFileSync(join(cwd, rel), "export const x = 1;\n");
    writeFileSync(
      join(cwd, "next.config.ts"),
      `const nextConfig = {
  outputFileTracingIncludes: {
    "/api/runtime/portfolio-job-worker": ["./lib/infinity/commerce/other.ts"],
    "/api/runtime/portfolio-operating-tick": ["./lib/infinity/commerce/other.ts"],
  }, /* occupancynpvVentureDeployComposeTracing portfolioCommerceTraceClosure */
};
export default nextConfig;
`,
    );
    const qc = evaluateServerlessRuntimeFileTraceClosureQc({ cwd });
    expect(qc.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC).toBe("FAIL");
    expect(qc.missing_from_trace_includes.some((m) => m.includes("canonical-variant-identity-v1.ts"))).toBe(true);
  });

  it("PORTFOLIO_TRANSITIVE_TRACE_CLOSURE_REGRESSION_QC fails when a second required file is absent on disk", () => {
    const cwd = mkdtempSync(join(tmpdir(), "trace-closure-2-"));
    const primary = "lib/infinity/commerce/canonical-variant-identity-v1.ts";
    const secondary = "lib/infinity/commerce/canonical-variant-identity-v1.ts.meta";
    mkdirSync(join(cwd, "lib/infinity/commerce"), { recursive: true });
    writeFileSync(join(cwd, primary), "export const x = 1;\n");
    writePassingNextConfig(cwd, [`./${secondary}`]);
    mkdirSync(join(cwd, "lib/infinity/runtime-operations"), { recursive: true });
    writeFileSync(
      join(cwd, "lib/infinity/runtime-operations/runtime-file-dependency-manifest.v1.json"),
      JSON.stringify({
        schema: "RUNTIME_FILE_DEPENDENCY_MANIFEST_V1",
        routes: {
          "/api/runtime/portfolio-operating-tick": {
            originating_modules: [],
            module_load_read_targets: [
              { repo_relative_path: primary, reader: "test", timing: "MODULE_LOAD" },
              { repo_relative_path: secondary, reader: "test", timing: "MODULE_LOAD" },
            ],
          },
          "/api/runtime/portfolio-job-worker": {
            originating_modules: [],
            module_load_read_targets: [
              { repo_relative_path: primary, reader: "test", timing: "MODULE_LOAD" },
              { repo_relative_path: secondary, reader: "test", timing: "MODULE_LOAD" },
            ],
          },
        },
        shared_portfolio_commerce_trace_globs: [`./${primary}`, `./${secondary}`],
      }),
    );
    const qc = evaluateServerlessRuntimeFileTraceClosureQc({ cwd, nextConfigRelativePath: "next.config.ts" });
    expect(qc.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC).toBe("FAIL");
    expect(qc.missing_on_disk.some((m) => m.includes(".meta"))).toBe(true);
  });

  it("PORTFOLIO_CANONICAL_VARIANT_TRACE_REGRESSION_QC passes when both portfolio routes include commerce trace", () => {
    const cwd = mkdtempSync(join(tmpdir(), "trace-closure-pass-"));
    const rel = "lib/infinity/commerce/canonical-variant-identity-v1.ts";
    mkdirSync(join(cwd, "lib/infinity/runtime-operations"), { recursive: true });
    writeFileSync(
      join(cwd, "lib/infinity/runtime-operations/runtime-file-dependency-manifest.v1.json"),
      JSON.stringify({
        schema: "RUNTIME_FILE_DEPENDENCY_MANIFEST_V1",
        routes: {
          "/api/runtime/portfolio-operating-tick": {
            originating_modules: [],
            module_load_read_targets: [{ repo_relative_path: rel, reader: "test", timing: "MODULE_LOAD" }],
          },
          "/api/runtime/portfolio-job-worker": {
            originating_modules: [],
            module_load_read_targets: [{ repo_relative_path: rel, reader: "test", timing: "MODULE_LOAD" }],
          },
        },
        shared_portfolio_commerce_trace_globs: [`./${rel}`],
      }),
    );
    mkdirSync(join(cwd, "lib/infinity/commerce"), { recursive: true });
    writeFileSync(join(cwd, rel), "export const x = 1;\n");
    writePassingNextConfig(cwd);
    const qc = evaluateServerlessRuntimeFileTraceClosureQc({ cwd });
    expect(qc.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC).toBe("PASS");
  });
});
