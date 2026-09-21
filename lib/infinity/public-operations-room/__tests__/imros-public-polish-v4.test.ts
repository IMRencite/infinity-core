import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  evaluateFounderVisualAcceptanceGate,
  evaluatePublicActiveRoomVisualResponseGate,
  evaluatePublicAgentPresenceProminenceGate,
  evaluatePublicFuturisticGridBackgroundGate,
  evaluatePublicHQPaletteConsistencyGate,
  evaluatePublicHomepageVisualSophisticationGate,
  evaluatePublicOverheadRoomCompositionGate,
} from "../visual-gates";
import { recentPublicVentures } from "../format";
import { projectPublicOperations } from "@/lib/infinity/public-operations-projection/project";

const CSS = "components/public/operations-room/operations-room.module.css";
const FLOOR = "components/public/operations-room/operations-floor.tsx";
const ROOM = "components/public/operations-room/live-operations-room.tsx";
const RECENT = "components/public/operations-room/public-recent-ventures.tsx";

describe("IMROS public polish V4", () => {
  it("31-33. interiors stay readable and agent states differ", () => {
    const css = readFileSync(CSS, "utf8");
    const overhead = readFileSync("components/public/operations-room/overhead-room.tsx", "utf8");
    expect(overhead).toContain("hintA");
    expect(css).toContain("layoutResearch");
    expect(css).toContain("layoutFinance");
    expect(css).toContain("idleScan");
    expect(css).toContain("monitorSpin");
    expect(css).toContain("patrol");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).not.toContain(".idle .node.working");
  });

  it("34-38. recent ventures stay public-only", () => {
    const projection = projectPublicOperations({ useCache: false });
    const recent = recentPublicVentures(projection.public_ventures, 10);
    expect(recent.length).toBeLessThanOrEqual(10);
    expect(recent.some((row) => /askreview/i.test(row.public_name))).toBe(false);
    expect(recent.some((row) => row.public_name === "OccupancyNPV")).toBe(true);
    expect(readFileSync(RECENT, "utf8")).toContain("venture.public_url");
    expect(readFileSync(RECENT, "utf8")).not.toMatch(/https:\/\/invented/);
    expect(readFileSync(ROOM, "utf8")).toContain("PublicOperationsProjection");
    expect(readFileSync(ROOM, "utf8")).not.toContain("getOperatorOrgContext");
  });

  it("39-45. architecture, reduced motion, and visual gates remain", () => {
    expect(evaluatePublicHomepageVisualSophisticationGate().result).toBe("PASS");
    expect(evaluatePublicOverheadRoomCompositionGate().result).toBe("PASS");
    expect(evaluatePublicAgentPresenceProminenceGate().result).toBe("PASS");
    expect(evaluatePublicActiveRoomVisualResponseGate().result).toBe("PASS");
    expect(evaluatePublicHQPaletteConsistencyGate().result).toBe("PASS");
    expect(evaluatePublicFuturisticGridBackgroundGate().result).toBe("PASS");
    expect(evaluateFounderVisualAcceptanceGate({ priorAutomatedPass: true }).result).toBe("PENDING_FOUNDER_REVIEW");
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain("stateLegend");
    expect(css).toContain("position: sticky");
    expect(readFileSync(FLOOR, "utf8")).toContain('data-building-columns="3"');
  });
});
