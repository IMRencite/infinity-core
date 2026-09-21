import { describe, expect, it } from "vitest";
import {
  BACKLINK_DISCOVERY_TYPES,
  BACKLINK_ENGINE_MODE,
  discoverBacklinkOpportunities,
  evaluateBacklinkAutonomyGate,
  evaluateBacklinkSafetySuite,
} from "../index";

describe("Backlink Intelligence V1", () => {
  it("stays discovery-only and scores, dedupes, and matches assets", () => {
    expect(BACKLINK_ENGINE_MODE).toBe("DISCOVERY_ONLY");
    expect(BACKLINK_DISCOVERY_TYPES).toContain("RESOURCE_PAGE");
    const found = discoverBacklinkOpportunities({
      mentions: [
        { host: "cre-research.example", path: "/tools", type: "TOOLS_AND_CALCULATORS", topic: "occupancy" },
        { host: "cre-research.example", path: "/tools", type: "TOOLS_AND_CALCULATORS", topic: "occupancy" },
        { host: "pbn-linkfarm.example", path: "/buy", type: "DIRECTORY_OPPORTUNITY" },
      ],
      assets: [{ id: "asset:occupancy", title: "Occupancy NPV calculator", url: "https://occupancynpv.com", kind: "CALCULATOR" }],
      seen: ["cre-research.example/tools"],
    });
    expect(found.some((row) => row.host.includes("pbn"))).toBe(false);
    expect(found[0]?.asset_id).toBe("asset:occupancy");
    expect(found.some((row) => row.duplicate)).toBe(true);
    expect(evaluateBacklinkSafetySuite(found).result).toBe("PASS");
    expect(evaluateBacklinkAutonomyGate({ mode: "DISCOVERY_ONLY" }).result).toBe("PASS");
    expect(evaluateBacklinkAutonomyGate({ outreachSent: true }).result).toBe("FAIL");
  });
});
