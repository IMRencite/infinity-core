import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateServedArtifactIdentityGate,
  HQ_SERVED_ARTIFACT_MARKER,
  sourceContainsVerifiedHqRepairs,
  servedBuildContainsVerifiedHqRepairs,
} from "../served-artifact-identity";

function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("Served artifact identity v1", () => {
  it("source contains the verified HQ repairs", () => {
    expect(
      sourceContainsVerifiedHqRepairs({
        treasuryCashTruth: source("lib/infinity/financial-truth/treasury-cash-truth.ts"),
        commandCycle: source("lib/infinity/operator-console/command-cycle-capability.ts"),
        codingCapability: source("lib/infinity/capability-truth/coding.ts"),
      }),
    ).toBe(true);
  });

  it("fails when the served production build is missing those repairs", () => {
    expect(servedBuildContainsVerifiedHqRepairs("old compiled treasury fallback $0")).toBe(false);
    expect(
      evaluateServedArtifactIdentityGate({
        port: 3000,
        working_directory: "C:/Users/Antivist/Desktop/Infinity/infinity-core",
        startup_command: "next start",
        served_build_path: "C:/Users/Antivist/Desktop/Infinity/infinity-core/.next",
        served_build_id: "stale",
        served_build_at: "2026-09-13T03:16:47.000Z",
        source_head: "992f4e5a10c4e7857bf14a80d489a992f051e175",
        source_contains_repairs: true,
        served_contains_repairs: false,
      }).result,
    ).toBe("FAIL");
  });

  it("passes only when port 3000 serves the current repair set", () => {
    const gate = evaluateServedArtifactIdentityGate({
      port: 3000,
      working_directory: "C:/Users/Antivist/Desktop/Infinity/infinity-core",
      startup_command: "next start",
      served_build_path: "C:/Users/Antivist/Desktop/Infinity/infinity-core/.next",
      served_build_id: "fresh",
      served_build_at: "2026-09-14T07:30:00.000Z",
      source_head: "992f4e5a10c4e7857bf14a80d489a992f051e175",
      source_contains_repairs: true,
      served_contains_repairs: true,
    });
    expect(gate.result).toBe("PASS");
    expect(HQ_SERVED_ARTIFACT_MARKER).toContain("treasury-cash-truth");
  });
});
