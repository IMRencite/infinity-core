import { describe, expect, it } from "vitest";
import { evaluateServerlessFilesystemDurabilityQc } from "../serverless-filesystem-durability-qc.ts";

describe("SERVERLESS_RUNTIME_LOCAL_PERSISTENCE_GUARD_V1", () => {
  it("validation queue persistence is guarded for serverless", () => {
    const qc = evaluateServerlessFilesystemDurabilityQc();
    expect(qc.SERVERLESS_RUNTIME_LOCAL_PERSISTENCE_GUARD_QC).toBe("PASS");
    const row = qc.rows.find((r) => r.path.includes("venture-candidate-validation-queue"));
    expect(row?.guarded).toBe(true);
    expect(row?.blind_mkdir_write).toBe(false);
  });
});
