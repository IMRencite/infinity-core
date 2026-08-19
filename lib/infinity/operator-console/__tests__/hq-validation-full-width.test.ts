import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HQ_FLOOR_LAYOUT_SECTIONS,
  assembleCanonicalFloorOrder,
  hqFloorSpan,
  packFloorSections,
  packIndependentFloorColumns,
} from "@/lib/infinity/operator-console/floor-layout";
import { groupArtifactsForDisplay, roomArtifactReachability } from "@/lib/infinity/operator-console/artifacts/grouping";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { LIFECYCLE_ROOM_SEQUENCE } from "@/lib/infinity/operator-console/room-naming";

const ROOT = join(process.cwd(), "components/dashboard/operator-console");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function validationArtifacts(count: number): HqWorkArtifact[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `validation-${i + 1}`,
    roomId: "quality_control",
    artifactType: i % 2 === 0 ? "assumption" : "validation_evidence",
    title: `Validation output ${i + 1}`,
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "validation_evidence",
    sourceRecordId: `validation-${i + 1}`,
    metadata: {},
  }));
}

describe("HQ Validation Station full-width layout", () => {
  it("places Validation Station as a reusable FULL span between column groups", () => {
    const sections = HQ_FLOOR_LAYOUT_SECTIONS;
    expect(hqFloorSpan("quality_control")).toBe("full");
    expect(sections.full).toEqual(["quality_control"]);
    expect(sections.above.left).toEqual([
      "opportunity_lab",
      "strategy_finance",
      "growth_department",
      "product_lab",
    ]);
    expect(sections.above.right).toEqual(["research_department", "company_operations", "creative_studio"]);
    expect(sections.below.left).toEqual(["launch_operations"]);
    expect(sections.below.right).toEqual(["intelligence_center"]);
    expect(assembleCanonicalFloorOrder(sections)).toEqual(LIFECYCLE_ROOM_SEQUENCE);

    const floor = readSource("hq-spatial-floor.tsx");
    expect(floor).toContain('data-hq-floor-span={span}');
    expect(floor).toContain("hq-floor-full-row");
    expect(floor).toContain('span={span === "full" ? "full" : "standard"}');
    expect(floor).not.toMatch(/HQ_FLOOR_RIGHT_ROOMS[\s\S]*quality_control/);
    expect(readSource("department-room.tsx")).toContain('span?: "standard" | "full"');
    expect(readSource("infinity-room/infinity-room-shell.tsx")).toContain("hq-room-shell--full-span");
    expect(readFileSync(join(process.cwd(), "app/globals.css"), "utf8")).not.toContain("Validation Station");
  });

  it("shows 25 validation outputs in a wrap grid without horizontal-only navigation", () => {
    const items = validationArtifacts(25);
    const grouped = groupArtifactsForDisplay(items);
    const reach = roomArtifactReachability(items);
    expect(grouped.visible).toHaveLength(25);
    expect(grouped.overflowCount).toBe(0);
    expect(reach.visibleCount).toBe(25);
    expect(reach.firstReachable).toBe(true);
    expect(reach.lastReachable).toBe(true);
    expect(reach.horizontalScrollRequired).toBe(false);
    expect(reach.visible[0]?.id).toBe("validation-1");
    expect(reach.visible[24]?.id).toBe("validation-25");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("View all");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("openRoomInventory");
  });

  it("preserves independent columns above Validation and resumes them below", () => {
    const packed = packIndependentFloorColumns(
      {
        opportunity_lab: 400,
        research_department: 900,
        strategy_finance: 350,
        company_operations: 500,
      },
      16,
      HQ_FLOOR_LAYOUT_SECTIONS.above.left,
      HQ_FLOOR_LAYOUT_SECTIONS.above.right,
    );
    expect(packed.left.find((room) => room.id === "strategy_finance")?.top).toBe(416);
    expect(packed.left.find((room) => room.id === "strategy_finance")?.top).toBeLessThan(900);

    const sections = packFloorSections(
      {
        product_lab: 300,
        creative_studio: 220,
        launch_operations: 180,
        intelligence_center: 260,
      },
      16,
    );
    expect(sections.below.left[0]?.id).toBe("launch_operations");
    expect(sections.below.right[0]?.id).toBe("intelligence_center");
    expect(sections.below.left[0]?.top).toBe(0);
    expect(sections.below.right[0]?.top).toBe(0);
    expect(readSource("department-room.tsx")).toContain("RoomPresenceTrack");
  });
});
