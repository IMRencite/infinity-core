import { describe, expect, it } from "vitest";
import { evaluateServerlessFunctionColdStartQc } from "../serverless-function-cold-start-v1";
import { join } from "node:path";

describe("serverless function cold start v1", () => {
  it("PORTFOLIO_BUILT_FUNCTION_COLD_START_QC passes without reading canonical .ts from disk", async () => {
    const repoRoot = join(process.cwd());
    const qc = await evaluateServerlessFunctionColdStartQc({ repoRoot });
    expect(qc.PORTFOLIO_BUILT_FUNCTION_COLD_START_QC).toBe("PASS");
    expect(qc.PORTFOLIO_JOB_WORKER_COLD_START_QC).toBe("PASS");
    expect(qc.SERVERLESS_FUNCTION_COLD_START_QC).toBe("PASS");
    expect(qc.details.commerce).toBeNull();
  }, 120_000);
});
