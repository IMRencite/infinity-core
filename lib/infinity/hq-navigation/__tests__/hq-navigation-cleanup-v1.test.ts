import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HQ_OPERATIONS_ROUTE } from "@/lib/infinity/hq-information-architecture/contract";
import { canonicalTreasuryVentures } from "@/lib/infinity/financial-truth/canonical-treasury-ventures";
import { evaluateRedundantNavigationGate } from "../integrity";
import { HQ_PRIMARY_NAV_ITEMS, REDUNDANT_NAVIGATION_GATE } from "../items";

function read(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("HQ navigation cleanup + treasury test state correction v1", () => {
  it("removes the top View Operations control without replacing it", () => {
    const strip = read("components/dashboard/hq-operating-summary-strip.tsx");
    const css = read("app/globals.css");
    expect(strip).toContain("data-hq-status-strip");
    expect(strip).toContain("System State");
    expect(strip).toContain("Operating Ventures");
    expect(strip).toContain("Opportunities");
    expect(strip).toContain("Next Cycle");
    expect(strip).not.toContain("View Operations");
    expect(strip).not.toContain("data-hq-operations-drilldown");
    expect(strip).not.toContain("HQ_OPERATIONS_ROUTE");
    expect(strip).not.toContain("<Link");
    expect(strip).not.toContain("href=");
    expect(css).toContain(".hq-operating-summary-strip");
    expect(css).toContain("overflow: hidden");
  });

  it("keeps Operations Room and left-nav Operations as the only pair", () => {
    const floor = read("components/dashboard/operator-console/hq-spatial-floor.tsx");
    const room = read("components/dashboard/operator-console/hq-operations-floor-room.tsx");
    const page = join(process.cwd(), "app/dashboard/operations/page.tsx");
    const leftNav = HQ_PRIMARY_NAV_ITEMS.find((item) => item.id === "operations");
    expect(floor).toContain("HqOperationsFloorRoom");
    expect(room).toContain("OPERATIONS_ROOM_ID");
    expect(room).toContain("HQ_OPERATIONS_ROUTE");
    expect(existsSync(page)).toBe(true);
    expect(leftNav?.label).toBe("Operations");
    expect(leftNav?.href).toBe("/dashboard/operations");
    expect(leftNav?.visibility).toBe("visible");
    expect(evaluateRedundantNavigationGate({
      statusStripHasOperationsLink: false,
      operationsRoomPresent: true,
      leftNavOperationsPresent: true,
      operationsRoomHref: HQ_OPERATIONS_ROUTE,
      leftNavOperationsHref: leftNav?.href ?? "",
    })).toEqual({
      gate: REDUNDANT_NAVIGATION_GATE,
      result: "PASS",
      reasons: ["ROOM_PLUS_LEFT_NAV"],
    });
    expect(evaluateRedundantNavigationGate({
      statusStripHasOperationsLink: true,
      operationsRoomPresent: true,
      leftNavOperationsPresent: true,
      operationsRoomHref: HQ_OPERATIONS_ROUTE,
      leftNavOperationsHref: "/dashboard/operations",
    }).result).toBe("FAIL");
  });

  it("does not reopen superseded Treasury source-scan assumptions", () => {
    const center = read("components/dashboard/operator-console/treasury-control-center.tsx");
    const catalog = read("lib/infinity/financial-truth/canonical-treasury-ventures.ts");
    const ventures = canonicalTreasuryVentures();
    expect(center).toContain("projection?.ventures");
    expect(center).toContain("venture.display_name");
    expect(center).toContain("No allocatable ventures yet.");
    expect(catalog).toContain("TREASURY_OCCUPANCYNPV_NAME");
    expect(catalog).toContain("TREASURY_ASKREVIEW_NAME");
    expect(ventures.map((row) => row.display_name)).toEqual(["OccupancyNPV", "AskReview"]);
    expect(center.includes("OccupancyNPV") && center.includes("AskReview")).toBe(true);
    expect(center).not.toMatch(/display_name:\s*["']OccupancyNPV["']/);
    expect(center).not.toMatch(/display_name:\s*["']AskReview["']/);
  });

  it("treats earlier Treasury source-scan OccupancyNPV failures as superseded", () => {
    const center = read("components/dashboard/operator-console/treasury-control-center.tsx");
    expect(center).toContain("venture.display_name");
    expect(center).not.toContain("display_name: \"OccupancyNPV\"");
  });
});
