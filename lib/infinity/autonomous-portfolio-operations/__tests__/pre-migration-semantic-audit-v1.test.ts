import { describe, expect, it } from "vitest";
import { evaluatePreMigrationSemanticAuditV1 } from "../pre-migration-semantic-audit-v1";

describe("pre-migration semantic audit v1", () => {
  it("PRE_MIGRATION_SEMANTIC_AUDIT_QC", () => {
    const report = evaluatePreMigrationSemanticAuditV1();
    expect(report.PRE_MIGRATION_SEMANTIC_AUDIT_QC).toBe("PASS");
    expect(report.PRE_MIGRATION_RELEASE_GATE_QC).toBe("PASS");
    expect(report.ONPV_EMPTY_BACKLOG_SEMANTICS_QC).toBe("PASS");
    expect(report.DAILY_OUTPUT_FLOOR_SEMANTICS_QC).toBe("PASS");
    expect(report.DAILY_FLOOR_NO_OPPORTUNITY_WAIVER_QC).toBe("PASS");
    expect(report.CT_HYDRATION_REMOVAL_SEMANTICS_QC).toBe("PASS");
  });
});
