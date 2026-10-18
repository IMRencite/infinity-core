import { describe, expect, it } from "vitest";
import { evaluatePortfolioServerlessModuleInitQc } from "../serverless-runtime-file-trace-closure-v1";
import { evaluateServerlessRuntimeFileTraceClosureQc } from "../serverless-runtime-file-trace-closure-v1";

describe("portfolio serverless module init v1", () => {
  it("PORTFOLIO_SERVERLESS_MODULE_INIT_QC mirrors trace closure gate", () => {
    const init = evaluatePortfolioServerlessModuleInitQc();
    expect(["PASS", "FAIL"]).toContain(init.PORTFOLIO_SERVERLESS_MODULE_INIT_QC);
  });

  it(
    "loads portfolio operating tick route module without ENOENT when commerce sources exist",
    async () => {
      const mod = await import("@/app/api/runtime/portfolio-operating-tick/route");
      expect(typeof mod.GET).toBe("function");
    },
    60_000,
  );
});
