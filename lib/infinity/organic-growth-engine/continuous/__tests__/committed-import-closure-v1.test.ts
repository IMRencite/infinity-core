import { describe, expect, it } from "vitest";
import {
  evaluateCommittedImportClosureQc,
  evaluateCommittedImportClosureRegressionQc,
} from "../committed-import-closure-v1";

describe("COMMITTED_IMPORT_CLOSURE_QC", () => {
  it("passes on committed quality tree including taxonomy compose", () => {
    expect(evaluateCommittedImportClosureQc().result).toBe("PASS");
  });

  it("regression fails when compose is missing from tracked set", () => {
    const regression = evaluateCommittedImportClosureRegressionQc();
    expect(regression.COMMITTED_IMPORT_CLOSURE_REGRESSION_QC).toBe("PASS");
    expect(regression.synthetic_missing_dependency_blocked).toBe(true);
  });
});
