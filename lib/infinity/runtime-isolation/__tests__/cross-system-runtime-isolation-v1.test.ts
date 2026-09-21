import { describe, expect, it } from "vitest";
import {
  COMMUNICATION_LEASE_NAMESPACE,
  ORGANIC_LEASE_NAMESPACE,
  communicationWorkerMayClaim,
  evaluateCrossSystemRuntimeIsolationGate,
  organicWorkerMayClaim,
} from "../cross-system";
import { productionCrossSystemIsolationEvidence } from "@/lib/infinity/organic-growth-engine/obligation/gates";

describe("CrossSystemRuntimeIsolationGate", () => {
  it("keeps organic and communication leases, claims, and health scopes apart", () => {
    expect(COMMUNICATION_LEASE_NAMESPACE).not.toBe(ORGANIC_LEASE_NAMESPACE);
    expect(organicWorkerMayClaim(COMMUNICATION_LEASE_NAMESPACE)).toBe(false);
    expect(communicationWorkerMayClaim(ORGANIC_LEASE_NAMESPACE)).toBe(false);
    expect(organicWorkerMayClaim(ORGANIC_LEASE_NAMESPACE)).toBe(true);
    expect(communicationWorkerMayClaim(COMMUNICATION_LEASE_NAMESPACE)).toBe(true);
    expect(productionCrossSystemIsolationEvidence().result).toBe("PASS");
    expect(evaluateCrossSystemRuntimeIsolationGate({
      communication_lease_scope: COMMUNICATION_LEASE_NAMESPACE,
      organic_lease_scope: ORGANIC_LEASE_NAMESPACE,
      communication_health_scope: "communication-runtime-scheduler-v1",
      organic_health_scope: "organic-growth-scheduler-v1",
      communication_worker_can_claim_organic: false,
      organic_worker_can_claim_communication: false,
      shared_mutable_lifecycle: false,
      organic_deploy_resets_communication: false,
      organic_can_starve_communication: false,
      communication_failure_stops_organic: false,
    }).result).toBe("PASS");
  });
});
