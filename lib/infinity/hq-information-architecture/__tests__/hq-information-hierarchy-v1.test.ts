import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HQ_DESKTOP_REGION_ORDER } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { HQ_OPERATING_FLOOR_ORDER } from "@/lib/infinity/operator-console/floor-layout";
import { evaluateHQNavigationIntegrityGate, evaluateRedundantNavigationGate } from "@/lib/infinity/hq-navigation/integrity";
import { HQ_PRIMARY_NAV_ITEMS } from "@/lib/infinity/hq-navigation/items";
import { activeHqNavItems } from "@/lib/infinity/hq-navigation/active";
import {
  HQ_INFORMATION_ARCHITECTURE_PRINCIPLE,
  HQ_OPERATIONS_ROUTE,
  HQ_RUNTIME_ROUTE,
  HQ_VISIBILITY_HIERARCHY_PRINCIPLE,
} from "../contract";
import { projectOperationsRoom } from "../operations-room";
import { assignedWorkerRolesForRoom } from "@/lib/infinity/hq-room-workers/assigned-roles";
import {
  evaluateHQInformationArchitectureGate,
  evaluateHQOperationsRoomQualityGate,
  evaluateHQProgressiveDisclosureGate,
} from "../gates";
import { evaluateHQInformationHierarchyGate } from "@/lib/infinity/financial-truth/financial-pulse-gates";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

describe("HQ information hierarchy + Operations Room v1", () => {
  it("keeps Infinity OS first and forbids the large operating panel above command", () => {
    const experience = read("components/dashboard/operator-console/infinity-hq-experience.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const floor = read("components/dashboard/operator-console/hq-spatial-floor.tsx");
    expect(experience).not.toContain("HqCanonicalOperatingStrip");
    expect(experience).toContain("HqIdleShell");
    expect(experience).toContain("operatingSummary");
    expect(consoleSource.indexOf("<HqSecondaryStatusRow")).toBeGreaterThan(consoleSource.indexOf("<VentureCommandBar"));
    expect(consoleSource.indexOf("<HqSecondaryStatusRow")).toBeGreaterThan(consoleSource.indexOf('data-hq-region="command"'));
    expect(consoleSource.indexOf("<HqFinancialPulse")).toBeLessThan(consoleSource.indexOf('data-hq-region="command"'));
    expect(floor).toContain("<HqOperationsFloorRoom");
    expect(floor.indexOf("sections.leading")).toBeLessThan(floor.indexOf("sections.above"));
    expect(floor.indexOf("<HqOperationsFloorRoom")).toBeLessThan(floor.indexOf("sections.above"));
    expect(floor.indexOf("<HqOperationsFloorRoom")).toBeLessThan(floor.indexOf("sections.full.map"));
    expect(HQ_OPERATING_FLOOR_ORDER[0]).toBe("operations");
    const operationsRoom = read("components/dashboard/operator-console/hq-operations-floor-room.tsx");
    expect(operationsRoom).toContain("DepartmentRoom");
    expect(operationsRoom).toContain("OPERATIONS_ROOM_ID");
    expect(operationsRoom).not.toContain("What Infinity is doing");
    expect(evaluateHQInformationArchitectureGate({
      homeSurfaceOrder: [...HQ_DESKTOP_REGION_ORDER],
      largeOperatingPanelAboveCommand: experience.includes("HqCanonicalOperatingStrip"),
      operationsGroupedInRoom: floor.includes("HqOperationsFloorRoom"),
      runtimeHref: HQ_RUNTIME_ROUTE,
      operationsHref: HQ_OPERATIONS_ROUTE,
      currentWorkDistinctFromRecent: true,
      operatingFloorOrder: [...HQ_OPERATING_FLOOR_ORDER],
    }).result).toBe("PASS");
    expect(HQ_INFORMATION_ARCHITECTURE_PRINCIPLE).toContain("SUBORDINATE");
    expect(HQ_VISIBILITY_HIERARCHY_PRINCIPLE).toContain("DOES NOT REQUIRE");
    expect(evaluateHQInformationHierarchyGate({ homeSurfaceOrder: [...HQ_DESKTOP_REGION_ORDER] }).result).toBe("PASS");
  });

  it("fails architecture and disclosure gates when observability outranks command", () => {
    expect(evaluateHQInformationArchitectureGate({
      homeSurfaceOrder: ["welcome", "ask-infinity", "command"],
      largeOperatingPanelAboveCommand: true,
      operationsGroupedInRoom: true,
      runtimeHref: HQ_RUNTIME_ROUTE,
      operationsHref: HQ_OPERATIONS_ROUTE,
      currentWorkDistinctFromRecent: true,
    }).result).toBe("FAIL");
    expect(evaluateHQProgressiveDisclosureGate({
      homepageHasLargeOperatingDetail: true,
      homepageHasCompactSummary: true,
      homepageHasOperationsDrillDown: true,
      commandPushedBelowMonitoring: true,
      operationsRoomHasDetail: true,
      homeAndRoomDuplicateFullDetail: true,
    }).result).toBe("FAIL");
  });

  it("requires Operations Room content and progressive disclosure", () => {
    const operations = read("components/dashboard/hq-operations-room.tsx");
    const summary = read("components/dashboard/hq-operating-summary-strip.tsx");
    const home = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(evaluateHQOperationsRoomQualityGate({
      hasCurrentWork: operations.includes('testId="current-work"'),
      hasRecentWork: operations.includes('testId="recent-work"'),
      hasBlockers: operations.includes('testId="blockers"'),
      hasNextActions: operations.includes('testId="next-actions"'),
      hasSystemState: operations.includes("data-hq-system-state"),
      hasRuntimeSummary: operations.includes('testId="runtime"'),
      hasVentureStatus: operations.includes('testId="ventures"'),
      hasOpportunitySummary: operations.includes('testId="opportunities"'),
      hasTraceability: operations.includes("traceability"),
      hasDrillDowns: operations.includes("HQ_ROUTES.runtime") && operations.includes("HQ_ROUTES.opportunities"),
    }).result).toBe("PASS");
    expect(evaluateHQProgressiveDisclosureGate({
      homepageHasLargeOperatingDetail: home.includes("HqCanonicalOperatingStrip") || home.includes("HqOperationsRoom"),
      homepageHasCompactSummary: summary.includes("compact-operating-summary") && home.includes("HqSecondaryStatusRow"),
      homepageHasOperationsDrillDown: summary.includes("View Operations") || summary.includes("data-hq-operations-drilldown"),
      commandPushedBelowMonitoring: home.indexOf("HqSecondaryStatusRow") > home.indexOf('data-hq-region="command"') && home.includes("HqOperationsRoom"),
      operationsRoomHasDetail: operations.includes("data-hq-operations-room"),
      homeAndRoomDuplicateFullDetail: home.includes("HqOperationsRoom"),
    }).result).toBe("PASS");
  });

  it("keeps Operations nav distinct from Runtime", () => {
    const operations = HQ_PRIMARY_NAV_ITEMS.find((item) => item.id === "operations");
    const runtime = HQ_PRIMARY_NAV_ITEMS.find((item) => item.id === "runtime");
    expect(operations?.href).toBe("/dashboard/operations");
    expect(runtime?.href).toBe("/dashboard/runtime");
    expect(operations?.href).not.toBe(runtime?.href);
    expect(activeHqNavItems("/dashboard/operations").map((item) => item.id)).toEqual(["operations"]);
    expect(activeHqNavItems("/dashboard/runtime").map((item) => item.id)).toEqual(["runtime"]);
    expect(evaluateHQNavigationIntegrityGate().result).toBe("PASS");
    const summary = read("components/dashboard/hq-operating-summary-strip.tsx");
    expect(summary).not.toContain("View Operations");
    expect(summary).not.toContain("HQ_OPERATIONS_ROUTE");
    expect(evaluateRedundantNavigationGate({
      statusStripHasOperationsLink: summary.includes("View Operations") || summary.includes("data-hq-operations-drilldown"),
      operationsRoomPresent: read("components/dashboard/operator-console/hq-spatial-floor.tsx").includes("HqOperationsFloorRoom"),
      leftNavOperationsPresent: Boolean(operations?.href),
      operationsRoomHref: HQ_OPERATIONS_ROUTE,
      leftNavOperationsHref: operations?.href ?? "",
    }).result).toBe("PASS");
  });

  it("projects Operations Room workers instead of an empty floor card", () => {
    const projected = projectOperationsRoom();
    expect(projected.department.id).toBe("operations");
    expect(projected.workers.length).toBeGreaterThanOrEqual(3);
    expect(projected.workers.every((node) => node.departmentId === "operations")).toBe(true);
    expect(projected.workers.map((node) => node.displayRole)).toEqual(assignedWorkerRolesForRoom("operations"));
    expect(projected.workers.some((node) => node.displayRole === "Venture Operator")).toBe(true);
  });
});
