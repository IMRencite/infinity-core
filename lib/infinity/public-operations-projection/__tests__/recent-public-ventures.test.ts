import { describe, expect, it } from "vitest";
import { CLUB_THROTTLE_VENTURE_CREATED_AT, OCCUPANCYNPV_VENTURE_CREATED_AT } from "@/lib/infinity/venture-operating-scale/canonical-venture-registry";
import { evaluatePublicMissionDetailGate, evaluatePublicProjectionGateBundle, evaluateRecentVentureSidebarFreshnessGate } from "../gates";
import { maliciousPrivateObservation } from "../fixtures";
import { projectPublicOperations } from "../project";
import { stringifyPublicProjection } from "../gates";
import { selectMostRecentPublicVentures } from "../recent-public-ventures";
import type { PublicVentureProjection } from "../types";

function venture(input: Partial<PublicVentureProjection> & Pick<PublicVentureProjection, "public_name">): PublicVentureProjection {
  return {
    status_label: "Live",
    ...input,
  };
}

describe("selectMostRecentPublicVentures", () => {
  it("returns the newest 10 public-eligible ventures in deterministic order", () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      venture({
        public_venture_id: `venture-${index}`,
        public_name: `Venture ${index}`,
        created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        public_url: `https://venture-${index}.example/`,
      }),
    );
    const recent = selectMostRecentPublicVentures(rows, 10);
    expect(recent).toHaveLength(10);
    expect(recent[0]?.public_venture_id).toBe("venture-11");
    expect(recent[9]?.public_venture_id).toBe("venture-2");
  });

  it("includes Club Throttle ahead of OccupancyNPV when timestamps place it newer", () => {
    const rows = [
      venture({
        public_venture_id: "occupancynpv",
        public_name: "OccupancyNPV",
        created_at: OCCUPANCYNPV_VENTURE_CREATED_AT,
        public_url: "https://occupancynpv.com",
      }),
      venture({
        public_venture_id: "club-throttle",
        public_name: "Club Throttle",
        created_at: CLUB_THROTTLE_VENTURE_CREATED_AT,
        public_url: "https://clubthrottle.com/",
      }),
    ];
    const recent = selectMostRecentPublicVentures(rows, 10);
    expect(recent[0]?.public_name).toBe("Club Throttle");
    expect(recent[1]?.public_name).toBe("OccupancyNPV");
  });

  it("dedupes ventures and keeps valid hrefs", () => {
    const rows = [
      venture({ public_venture_id: "club-throttle", public_name: "Club Throttle", created_at: CLUB_THROTTLE_VENTURE_CREATED_AT, public_url: "https://clubthrottle.com/" }),
      venture({ public_venture_id: "club-throttle", public_name: "Club Throttle", created_at: CLUB_THROTTLE_VENTURE_CREATED_AT, public_url: "https://clubthrottle.com/" }),
    ];
    expect(selectMostRecentPublicVentures(rows, 10)).toHaveLength(1);
  });

  it("keeps mission detail out of the public projection fixture", () => {
    const projection = projectPublicOperations({ observation: maliciousPrivateObservation(), useCache: false });
    const gate = evaluatePublicMissionDetailGate(projection);
    if (gate.result !== "PASS") {
      const hits = stringifyPublicProjection(projection).match(/first outbound validation|work:occupancynpv|mission:infinity|candidate:/gi);
      throw new Error(`${gate.reasons.join(",")} hits=${hits?.join("|") ?? "none"}`);
    }
    expect(gate.result).toBe("PASS");
    const failing = evaluatePublicProjectionGateBundle({ projection, started: 3, operating: 1, completed: 4, loopActive: false }).filter(
      (row) => row.result !== "PASS",
    );
    expect(failing.map((row) => row.gate)).toEqual([]);
  });

  it("passes freshness gate against the live public projection", () => {
    const projection = projectPublicOperations({ useCache: false });
    const recent = selectMostRecentPublicVentures(projection.public_ventures, 10);
    expect(recent.some((row) => row.public_name === "Club Throttle")).toBe(true);
    expect(evaluateRecentVentureSidebarFreshnessGate({ projection, rendered: recent }).result).toBe("PASS");
  });
});
