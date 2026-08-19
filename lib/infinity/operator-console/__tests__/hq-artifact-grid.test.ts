import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  desktopHorizontalScrollRequired,
  groupArtifactsForDisplay,
  hqArtifactLayoutMode,
  roomArtifactReachability,
} from "@/lib/infinity/operator-console/artifacts/grouping";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

const ROOT = join(process.cwd(), "components/dashboard/operator-console");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function artifact(
  partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title" | "roomId">,
): HqWorkArtifact {
  return {
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: partial.artifactType,
    sourceRecordId: partial.id,
    metadata: {},
    ...partial,
  };
}

function set(count: number, roomId: HqWorkArtifact["roomId"], artifactType: HqWorkArtifact["artifactType"], prefix: string) {
  return Array.from({ length: count }, (_, i) =>
    artifact({
      id: `${prefix}${i + 1}`,
      roomId,
      artifactType,
      title: `${artifactType} ${i + 1}`,
    }),
  );
}

describe("HQ room artifact wrap-first grid visibility", () => {
  it("desktop 10-item collections are all directly visible without horizontal scroll", () => {
    const items = set(10, "opportunity_lab", "opportunity_candidate", "venture-");
    const reach = roomArtifactReachability(items);
    expect(hqArtifactLayoutMode(false)).toBe("grid");
    expect(reach.visibleCount).toBe(10);
    expect(reach.loadedCount).toBe(10);
    expect(reach.horizontalScrollRequired).toBe(false);
    expect(desktopHorizontalScrollRequired(10)).toBe(false);
    expect(reach.firstReachable).toBe(true);
    expect(reach.lastReachable).toBe(true);
    expect(reach.visible[0]?.id).toBe("venture-1");
    expect(reach.visible[9]?.id).toBe("venture-10");
    expect(reach.fakeCards).toBe(0);
  });

  it("desktop 17-item research collections wrap into the visible room set", () => {
    const items = set(17, "research_department", "research_packet", "research-");
    const reach = roomArtifactReachability(items);
    expect(reach.visibleCount).toBe(17);
    expect(reach.horizontalScrollRequired).toBe(false);
    expect(reach.firstReachable).toBe(true);
    expect(reach.lastReachable).toBe(true);
    expect(reach.visible[0]?.id).toBe("research-1");
    expect(reach.visible[16]?.id).toBe("research-17");
  });

  it("Profit Lab and Blueprint Lab 10-item sets remain fully reachable", () => {
    const profit = roomArtifactReachability(set(10, "strategy_finance", "monetization_plan", "profit-"));
    const blueprint = roomArtifactReachability(set(10, "company_operations", "selection_blueprint", "blueprint-"));
    expect(profit.visibleCount).toBe(10);
    expect(profit.lastReachable).toBe(true);
    expect(blueprint.visibleCount).toBe(10);
    expect(blueprint.lastReachable).toBe(true);
    expect(profit.fakeCards + blueprint.fakeCards).toBe(0);
  });

  it("does not fabricate missing artifacts as hidden overflow", () => {
    const items = set(5, "opportunity_lab", "opportunity_candidate", "partial-");
    const grouped = groupArtifactsForDisplay(items, Number.POSITIVE_INFINITY, 10);
    const reach = roomArtifactReachability(items, 10);
    expect(grouped.visible).toHaveLength(5);
    expect(grouped.overflowCount).toBe(0);
    expect(grouped.missingCount).toBe(5);
    expect(reach.visibleCount).toBe(5);
    expect(reach.fakeCards).toBe(0);
  });

  it("mobile uses a rail while desktop stays wrap-first", () => {
    expect(hqArtifactLayoutMode(true)).toBe("rail");
    expect(hqArtifactLayoutMode(false)).toBe("grid");
    const surface = readSource("artifacts/room-artifact-surface.tsx");
    expect(surface).toContain('matchMedia("(max-width: 768px)")');
    expect(surface).toContain("Scroll artifacts left");
    expect(surface).not.toContain("onWheel");
    expect(readSource("artifacts/primitives.tsx")).toContain("hq-artifact-grid");
    expect(readSource("department-room.tsx").indexOf("RoomArtifactSurface")).toBeLessThan(
      readSource("department-room.tsx").indexOf("RoomPresenceTrack"),
    );
  });
});
