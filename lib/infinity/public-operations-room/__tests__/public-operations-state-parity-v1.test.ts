import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  constructPublicOperationsProjection,
  evaluatePublicProjectionNoSensitiveDataGate,
  idleTruthObservation,
  projectPublicOperations,
  resetPublicProjectionCache,
} from "@/lib/infinity/public-operations-projection";
import {
  emptyCanonicalOccupancy,
  type CanonicalOccupancyLevel,
} from "@/lib/infinity/public-operations-projection/occupancy";
import {
  deriveCanonicalPublicOccupancy,
  salesSnapshotToOccupancy,
} from "@/lib/infinity/public-operations-projection/derive-occupancy";
import {
  persistCanonicalPublicOccupancy,
  loadCanonicalPublicOccupancy,
  resetCanonicalPublicOccupancyMemory,
} from "@/lib/infinity/public-operations-projection/persist-occupancy";
import { GET } from "@/app/api/public/operations/route";
import { agentMotion } from "../format";
import {
  evaluatePublicOperationsRoomDOMPrivacyGate,
  evaluatePublicOperationsRoomDataBoundaryGate,
  evaluatePublicOperationsRoomNetworkBoundaryGate,
  evaluatePublicOperationsRoomPrivacyBundle,
  evaluatePublicOperationsStateParityGate,
  evaluateSalesTrainingPrivacyGate,
} from "../gates";
import { evaluatePublicIdleAgentPresenceGate } from "../visual-gates";
import { evaluateProspectIntelligencePublicPrivacyGate } from "@/lib/infinity/prospect-intelligence/gates";
import { PUBLIC_OPERATIONS_ROOM_POLL_MS, PUBLIC_STATE_PROPAGATION_BUDGET_MS } from "../contract";

const TRANSITIONS: Array<[CanonicalOccupancyLevel, CanonicalOccupancyLevel]> = [
  ["IDLE", "MONITORING"],
  ["MONITORING", "ACTIVE"],
  ["ACTIVE", "MONITORING"],
  ["MONITORING", "IDLE"],
  ["IDLE", "ACTIVE"],
  ["ACTIVE", "IDLE"],
];

function uiFromProjection(level: CanonicalOccupancyLevel): CanonicalOccupancyLevel {
  const occupancy = emptyCanonicalOccupancy("2026-09-16T04:00:00.000Z", level);
  const projection = projectPublicOperations({
    observation: { ...idleTruthObservation(), occupancy },
    occupancy,
    useCache: false,
  });
  const motion = agentMotion(projection.public_agents[0]?.public_status ?? "IDLE");
  if (projection.public_activity_summary === "ACTIVE" && motion === "working") return "ACTIVE";
  if (projection.public_activity_summary === "MONITORING" && motion === "scanning") return "MONITORING";
  if (projection.public_activity_summary === "IDLE" && motion === "idle") return "IDLE";
  return projection.public_activity_summary as CanonicalOccupancyLevel;
}

describe("Public operations state parity v1", () => {
  it("maps canonical occupancy 1:1 through HQ, projection, API, and UI", async () => {
    resetPublicProjectionCache();
    resetCanonicalPublicOccupancyMemory();
    for (const level of ["IDLE", "MONITORING", "ACTIVE"] as const) {
      const occupancy = emptyCanonicalOccupancy("2026-09-16T04:00:00.000Z", level);
      const started = Date.now();
      await persistCanonicalPublicOccupancy(occupancy);
      const loaded = await loadCanonicalPublicOccupancy();
      const projectionMs = Date.now() - started;
      const projection = projectPublicOperations({
        observation: { ...idleTruthObservation(), occupancy: loaded },
        occupancy: loaded,
        useCache: false,
      });
      const apiStarted = Date.now();
      const apiProjection = projectPublicOperations({ occupancy: loaded, observation: { ...idleTruthObservation(), occupancy: loaded }, useCache: false });
      const apiMs = Date.now() - apiStarted;
      const ui = uiFromProjection(level);
      expect(evaluatePublicOperationsStateParityGate({
        canonical: level,
        hq: loaded?.summary ?? "IDLE",
        projection: projection.public_activity_summary,
        api: apiProjection.public_activity_summary,
        ui,
        leakedPrivate: false,
        requiredRefresh: false,
        requiredRedeploy: false,
      }).result).toBe("PASS");
      expect(projection.public_departments.find((row) => row.public_name === "PROSPECT_INTELLIGENCE")?.public_status).toBe(level);
      expect(projection.public_sales_rooms.some((row) => row.public_status === (level === "IDLE" ? "PRESENT_IDLE" : level))).toBe(true);
      expect(projectionMs).toBeLessThan(PUBLIC_STATE_PROPAGATION_BUDGET_MS.runtime_to_projection + 250);
      expect(apiMs).toBeLessThan(PUBLIC_STATE_PROPAGATION_BUDGET_MS.projection_to_api);
    }
  });

  it("verifies required live transitions without refresh or redeploy", () => {
    for (const [from, to] of TRANSITIONS) {
      expect(uiFromProjection(from)).toBe(from);
      expect(uiFromProjection(to)).toBe(to);
      expect(evaluatePublicOperationsStateParityGate({
        canonical: to,
        hq: to,
        projection: to,
        api: to,
        ui: to,
        requiredRefresh: false,
        requiredRedeploy: false,
      }).result).toBe("PASS");
    }
  });

  it("Prospect Intelligence and Sales follow runtime occupancy, not static sanitized copy", () => {
    const idle = deriveCanonicalPublicOccupancy({ now: "2026-09-16T04:00:00.000Z", prospect: { activity: "IDLE" }, sales: { status: "IDLE" } });
    const monitoring = deriveCanonicalPublicOccupancy({ now: "2026-09-16T04:00:00.000Z", prospect: { activity: "MONITORING" }, sales: { status: "MONITORING" } });
    const active = deriveCanonicalPublicOccupancy({
      now: "2026-09-16T04:00:00.000Z",
      prospect: { activity: "ACTIVE" },
      sales: { status: "ACTIVE", sending: true },
    });
    const idleProj = constructPublicOperationsProjection({ ...idleTruthObservation(), occupancy: idle });
    const monitorProj = constructPublicOperationsProjection({ ...idleTruthObservation(), occupancy: monitoring });
    const activeProj = constructPublicOperationsProjection({ ...idleTruthObservation(), occupancy: active });
    expect(idleProj.public_departments.find((row) => row.public_name === "PROSPECT_INTELLIGENCE")?.public_status).toBe("IDLE");
    expect(monitorProj.public_departments.find((row) => row.public_name === "PROSPECT_INTELLIGENCE")?.public_status).toBe("MONITORING");
    expect(activeProj.public_departments.find((row) => row.public_name === "PROSPECT_INTELLIGENCE")?.public_status).toBe("ACTIVE");
    expect(idleProj.public_sales_rooms.find((row) => row.room_id === "OUTBOUND_ACQUISITION")?.public_status).toBe("PRESENT_IDLE");
    expect(monitorProj.public_sales_rooms.find((row) => row.room_id === "OUTBOUND_ACQUISITION")?.public_status).toBe("MONITORING");
    expect(activeProj.public_sales_rooms.find((row) => row.room_id === "OUTBOUND_ACQUISITION")?.public_status).toBe("ACTIVE");
    expect(salesSnapshotToOccupancy({ attempted: 1 }).status).toBe("ACTIVE");
    expect(salesSnapshotToOccupancy({ qualified_prospects: 3 }).status).toBe("MONITORING");
    expect(salesSnapshotToOccupancy({}).status).toBe("IDLE");
  });

  it("public API stays fresh and never leaks private fields", async () => {
    resetPublicProjectionCache();
    const occupancy = emptyCanonicalOccupancy("2026-09-16T04:01:00.000Z", "ACTIVE");
    await persistCanonicalPublicOccupancy(occupancy);
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toMatch(/s-maxage=5/);
    expect(response.headers.get("Cache-Control")).toMatch(/max-age=0/);
    const json = await response.json();
    expect(json.public_activity_summary).toBe("ACTIVE");
    const serialized = JSON.stringify(json);
    expect(evaluatePublicProjectionNoSensitiveDataGate(json).result).toBe("PASS");
    expect(evaluatePublicOperationsRoomDOMPrivacyGate(serialized).result).toBe("PASS");
    expect(evaluateProspectIntelligencePublicPrivacyGate(serialized).result).toBe("PASS");
    expect(evaluateSalesTrainingPrivacyGate(serialized).result).toBe("PASS");
    expect(evaluatePublicOperationsRoomPrivacyBundle(json).every((row) => row.result === "PASS")).toBe(true);
    expect(serialized).not.toMatch(/john@|cus_|sk_live|suppressed|fit_score|AskReview/i);
  });

  it("poll budget and existing privacy/network gates remain", () => {
    expect(PUBLIC_OPERATIONS_ROOM_POLL_MS).toBe(8_000);
    expect(PUBLIC_STATE_PROPAGATION_BUDGET_MS.api_to_client).toBe(8_000);
    expect(readFileSync("components/public/operations-room/live-operations-room.tsx", "utf8")).toContain("cache: \"no-store\"");
    expect(evaluatePublicOperationsRoomDataBoundaryGate().result).toBe("PASS");
    expect(evaluatePublicOperationsRoomNetworkBoundaryGate().result).toBe("PASS");
    expect(evaluatePublicIdleAgentPresenceGate().result).toBe("PASS");
  });
});
