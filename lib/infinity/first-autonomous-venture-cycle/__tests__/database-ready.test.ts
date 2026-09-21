import { describe, it, expect } from "vitest";
import {
  databaseProbeFailureLevel,
  formatDatabaseProbeFailure,
} from "../database-ready";

describe("FAVC1 database ready probe", () => {
  it("maps SQLSTATE 57014 to INFRASTRUCTURE_BLOCKED", () => {
    expect(databaseProbeFailureLevel("57014")).toBe("INFRASTRUCTURE_BLOCKED");
  });

  it("formats probe failures with code prefix", () => {
    expect(
      formatDatabaseProbeFailure({
        ready: false,
        attempts: 1,
        lastErrorCode: "57014",
        lastErrorMessage: "canceling statement due to statement timeout",
      }),
    ).toBe("[57014] canceling statement due to statement timeout");
  });
});
