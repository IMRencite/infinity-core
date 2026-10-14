import { describe, expect, it } from "vitest";
import { verifyAutonomousRuntimeRouteManifest } from "../autonomous-runtime-required-route-manifest-v1.ts";

describe("AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_V1", () => {
  it("passes when required discovery routes are present", () => {
    const result = verifyAutonomousRuntimeRouteManifest([
      "/api/runtime/opportunity-discovery-tick",
      "/api/runtime/venture-operating-cycle",
      "/api/runtime/tick",
      "/api/runtime/organic-tick",
    ]);
    expect(result.AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_QC).toBe("PASS");
    expect(result.missing).toHaveLength(0);
  });

  it("fails closed when opportunity-discovery-tick is missing", () => {
    const result = verifyAutonomousRuntimeRouteManifest([
      "/api/runtime/venture-operating-cycle",
      "/api/runtime/tick",
    ]);
    expect(result.AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_QC).toBe("FAIL");
    expect(result.missing).toContain("/api/runtime/opportunity-discovery-tick");
  });
});
