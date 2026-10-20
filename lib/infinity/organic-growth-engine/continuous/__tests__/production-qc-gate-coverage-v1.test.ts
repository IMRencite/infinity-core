import { describe, expect, it } from "vitest";
import {
  evaluateLegacyPublicationRenderEnforcementWiringQc,
  evaluateProductionQcBypassEliminationQc,
  evaluateProductionQcBypassRegressionQc,
  evaluateProductionQcGateCoverageRegressionQc,
  evaluateProductionQcGateWiringQc,
  evaluateProductionGateOrderingQc,
  evaluateUnregisteredProductionPathQc,
  PRODUCTION_QC_GATE_COVERAGE_V1,
} from "../production-qc-gate-coverage-v1";

describe("PRODUCTION_QC_GATE_COVERAGE_REGRESSION_QC", () => {
  it("registry + wiring + unregistered entrypoints pass", () => {
    expect(PRODUCTION_QC_GATE_COVERAGE_V1).toBe("PRODUCTION_QC_GATE_COVERAGE_V1");
    const regression = evaluateProductionQcGateCoverageRegressionQc();
    expect(regression.PRODUCTION_QC_GATE_COVERAGE_REGRESSION_QC).toBe("PASS");
    expect(evaluateProductionQcGateWiringQc().result).toBe("PASS");
    expect(evaluateUnregisteredProductionPathQc().result).toBe("PASS");
    expect(evaluateLegacyPublicationRenderEnforcementWiringQc().result).toBe("PASS");
  });
});

describe("PRODUCTION_QC_BYPASS_REGRESSION_QC", () => {
  it("eliminates known production bypass paths", () => {
    const bypass = evaluateProductionQcBypassRegressionQc();
    expect(bypass.PRODUCTION_QC_BYPASS_REGRESSION_QC).toBe("PASS");
    const elimination = evaluateProductionQcBypassEliminationQc();
    expect(elimination.PRODUCTION_QC_UNRESOLVED_BYPASS_COUNT).toBe(0);
    expect(elimination.result).toBe("PASS");
    expect(evaluateProductionGateOrderingQc().result).toBe("PASS");
  });
});
