import { describe, expect, it } from "vitest";
import {
  classifyRemoteModuleInitFalsePassRegression,
  PORTFOLIO_MODULE_INIT_PROBE_HEADER,
  PORTFOLIO_MODULE_INIT_PROBE_HEADER_VALUE,
  resolvePortfolioModuleInitProbeMode,
} from "../portfolio-module-init-probe-v1";

describe("portfolio-module-init-probe-v1", () => {
  const secret = "deploy-qc-secret-test";

  function probeRequest(init: RequestInit & { url?: string } = {}) {
    const url = init.url ?? "https://example.com/api/runtime/portfolio-operating-tick?mode=module-init-probe";
    return new Request(url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
        [PORTFOLIO_MODULE_INIT_PROBE_HEADER]: PORTFOLIO_MODULE_INIT_PROBE_HEADER_VALUE,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  }

  it("rejects cron user-agent for module-init-probe", () => {
    const req = probeRequest({ headers: { "user-agent": "vercel-cron/1.0" } });
    const d = resolvePortfolioModuleInitProbeMode(req, { CRON_SECRET: secret });
    expect(d.kind).toBe("reject");
    if (d.kind === "reject") expect(d.reason).toContain("CRON");
  });

  it("allows deploy QC auth with probe header", () => {
    const req = probeRequest();
    const d = resolvePortfolioModuleInitProbeMode(req, { INFINITY_RUNTIME_DEPLOY_QC_SECRET: secret });
    expect(d.kind).toBe("execute_probe");
  });

  it("REMOTE_MODULE_INIT_FALSE_PASS_REGRESSION_QC detects cde5c43-class false pass", () => {
    const r = classifyRemoteModuleInitFalsePassRegression({
      source_trace_qc: "PASS",
      local_import_qc: "PASS",
      remote_function_module_init_qc: "FAIL",
    });
    expect(r.REMOTE_MODULE_INIT_FALSE_PASS_REGRESSION_QC).toBe("PASS");
    expect(r.PROMOTION_ALLOWED).toBe(false);
  });

  it("promotion allowed only when remote probe passes", () => {
    const r = classifyRemoteModuleInitFalsePassRegression({
      source_trace_qc: "PASS",
      local_import_qc: "PASS",
      remote_function_module_init_qc: "PASS",
    });
    expect(r.PROMOTION_ALLOWED).toBe(true);
  });
});
