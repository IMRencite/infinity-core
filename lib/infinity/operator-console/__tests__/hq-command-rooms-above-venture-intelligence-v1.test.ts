import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HQ_DESKTOP_REGION_ORDER } from "../hq-infrastructure-priority";
import { LIFECYCLE_ROOM_SEQUENCE, ROOM_DISPLAY_NAMES } from "../room-naming";
import { deriveRoomPresence } from "../room-presence";
import type { OperatorWorkerNode } from "../types";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

function count(source: string, token: string): number {
  return source.split(token).length - 1;
}

function worker(partial: Partial<OperatorWorkerNode> = {}): OperatorWorkerNode {
  return {
    nodeId: "n1",
    departmentId: "research_department",
    role: "WORK",
    displayRole: "Research",
    status: "NOT_STARTED",
    task: null,
    displayTask: null,
    provider: "internal",
    model: null,
    isActive: false,
    isDormant: true,
    motionActive: false,
    ...partial,
  };
}

describe("HQ COMMAND + ROOMS ABOVE VENTURE INTELLIGENCE V1", () => {
  it("keeps Infinity OS and Ask Infinity at the top, then HQ Command and Rooms above intelligence", () => {
    const hero = read("components/dashboard/operator-console/infinity-os-hero.tsx");
    const bar = read("components/dashboard/operator-console/venture-command-bar.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(hero).toContain('data-hq-region="welcome"');
    expect(hero).toContain('data-hq-region="ask-infinity"');
    expect(bar).toContain("InfinityOsHero");
    expect(bar).toContain("HqCopilotDock");
    expect(consoleSource).toContain(">HQ Command<");
    expect(consoleSource).toContain('id="hq-command"');
    expect(consoleSource).toContain('id="venture-intelligence"');
    const command = consoleSource.indexOf("<CommandChamber");
    const rooms = consoleSource.indexOf("<HqSpatialFloor");
    const architect = consoleSource.indexOf("<SystemsArchitectWorkspace");
    const inspect = consoleSource.indexOf("<InspectionContextBar");
    const intel = consoleSource.indexOf("<VentureIntelligencePanel");
    expect(command).toBeGreaterThan(consoleSource.indexOf("<VentureCommandBar"));
    expect(rooms).toBeGreaterThan(command);
    expect(architect).toBeGreaterThan(rooms);
    expect(inspect).toBeGreaterThan(architect);
    expect(intel).toBeGreaterThan(inspect);
    expect(HQ_DESKTOP_REGION_ORDER).toEqual([
      "welcome",
      "ask-infinity",
      "financial-pulse",
      "command",
      "compact-operating-summary",
      "operating-floor",
      "inspecting",
      "venture-intelligence",
      "financial-truth",
      "infrastructure",
    ]);
  });

  it("reuses the real Command chamber and room grid without duplicates or fake rooms", () => {
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const floor = read("components/dashboard/operator-console/hq-spatial-floor.tsx");
    expect(count(consoleSource, "<CommandChamber")).toBe(1);
    expect(count(consoleSource, "<HqSpatialFloor")).toBe(1);
    expect(count(consoleSource, "<VentureIntelligencePanel")).toBe(1);
    expect(floor).toContain("LIFECYCLE_ROOM_SEQUENCE");
    expect(floor).toContain("DepartmentRoom");
    expect(floor).not.toContain("CommandChamber");
    expect(ROOM_DISPLAY_NAMES.opportunity_lab.displayName).toBe("Venture Radar");
    expect(ROOM_DISPLAY_NAMES.research_department.displayName).toBe("Research Grid");
    expect(ROOM_DISPLAY_NAMES.strategy_finance.displayName).toBe("Profit Lab");
    expect(ROOM_DISPLAY_NAMES.company_operations.displayName).toBe("Blueprint Lab");
    expect(ROOM_DISPLAY_NAMES.systems_architect.displayName).toBe("Systems Architect");
    expect(ROOM_DISPLAY_NAMES.growth_department.displayName).toBe("Growth Nexus");
    expect(ROOM_DISPLAY_NAMES.creative_studio.displayName).toBe("Design Core");
    expect(ROOM_DISPLAY_NAMES.product_lab.displayName).toBe("Creation Lab");
    expect(ROOM_DISPLAY_NAMES.quality_control.displayName).toBe("Validation Station");
    expect(ROOM_DISPLAY_NAMES.launch_operations.displayName).toBe("Deployment Depot");
    expect(ROOM_DISPLAY_NAMES.intelligence_center.displayName).toBe("Signal Intelligence");
    expect(ROOM_DISPLAY_NAMES.operations.displayName).toBe("Operations Room");
    expect(ROOM_DISPLAY_NAMES.executive_office.displayName).toBe("Command");
    expect(LIFECYCLE_ROOM_SEQUENCE).toContain("systems_architect");
  });

  it("preserves live room states, Systems Architect hologram, and room click wiring", () => {
    const room = read("components/dashboard/operator-console/department-room.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const architect = read("components/dashboard/operator-console/systems-architect-workspace.tsx");
    expect(room).toContain("deriveRoomPresence");
    expect(room).toContain("buildRoomActivityExplanation");
    expect(room).toContain("ACTIVE_WORK");
    expect(consoleSource).toContain("onSelectDepartment={setSelectedDepartment}");
    expect(consoleSource).toContain('selectedDepartment === "systems_architect"');
    expect(architect).toContain("HQOutputDetailShell");
    expect(architect).toContain('id="systems-architect-workspace"');
    expect(deriveRoomPresence([], "RUNNING").state).toBe("EMPTY");
    expect(deriveRoomPresence([worker({ isActive: true, isDormant: false, motionActive: true, status: "RUNNING" })], "RUNNING").state).toBe(
      "ACTIVE_WORK",
    );
    expect(deriveRoomPresence([worker()], "RUNNING").state).toBe("PRESENT_IDLE");
    expect(deriveRoomPresence([worker({ status: "BLOCKED" })], "BLOCKED").state).toBe("BLOCKED");
  });

  it("shows a compact placeholder when HQ has no explicit inspection and keeps intelligence below rooms when selected", () => {
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(consoleSource).toContain("alwaysShowVentureIntelligence || inspection.context.explicit");
    expect(consoleSource).toContain("Select a venture from Command to inspect it.");
    expect(consoleSource).toContain("data-hq-venture-placeholder");
    expect(consoleSource).toContain("hq-venture-placeholder");
    expect(consoleSource).not.toMatch(/hq-venture-placeholder[\s\S]{0,80}min-h-\[/);
    expect(consoleSource.indexOf("<HqSpatialFloor")).toBeLessThan(consoleSource.indexOf("hq-venture-placeholder"));
    expect(consoleSource.indexOf("showVentureIntelligence")).toBeGreaterThan(-1);
  });

  it("scrolls to the venture intelligence anchor after a Command venture click without leaving /dashboard", () => {
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const link = read("components/dashboard/operator-console/hq-venture-inspection-link.tsx");
    const provider = read("components/dashboard/operator-console/hq-inspection-provider.tsx");
    const page = read("app/dashboard/page.tsx");
    expect(link).toContain("buildHqVentureInspectionHref");
    expect(link).toContain("router.push(href, { scroll: false })");
    expect(link).not.toContain("/dashboard/ventures/");
    expect(consoleSource).toContain('getElementById("venture-intelligence")');
    expect(consoleSource).toContain('behavior: "smooth"');
    expect(provider).toContain('if (context.entityType !== "VENTURE")');
    expect(provider).toContain("setWorkspaceOpen(true)");
    expect(page).toContain("preferredVentureId");
    expect(page).toContain("InfinityHqExperience");
  });

  it("keeps dedicated venture route on the same HQ-first shell with intelligence always shown", () => {
    const venturePage = read("app/dashboard/ventures/[ventureId]/page.tsx");
    const experience = read("components/dashboard/operator-console/infinity-hq-experience.tsx");
    const panel = read("components/dashboard/operator-console/venture-intelligence-panel.tsx");
    const detail = read("components/dashboard/operator-console/artifacts/hq-output-detail.tsx");
    const sections = read("lib/infinity/venture-intelligence/hq-sections.ts");
    expect(venturePage).toContain("alwaysShowVentureIntelligence");
    expect(experience).not.toContain("alwaysShowVentureIntelligence");
    expect(panel).toContain("HQOutputDetail");
    expect(panel).toContain("embedded");
    expect(sections).toContain('title: "Venture Command Deck"');
    expect(detail).toContain('money: "Money"');
    expect(detail).toContain("Market Advantage");
    expect(detail).toContain("Systems This Venture Needs");
    expect(sections).toContain("view.buildPlan");
    expect(detail).toContain("function CommandDeckBody");
  });

  it("does not force HQ Rooms onto Founder Idea Lab and does not reorder the shell on mobile", () => {
    const founder = read("components/dashboard/founder-ideas/founder-idea-lab.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const css = read("app/globals.css");
    expect(founder).not.toContain("HqSpatialFloor");
    expect(founder).not.toContain("CommandChamber");
    expect(founder).toContain("HQOutputDetail");
    expect(consoleSource).not.toMatch(/md:order-|order-\d/);
    expect(css).toContain(".hq-output-detail--embedded");
    expect(css).toContain("flex: 0 0 auto");
    expect(css).toContain(".hq-venture-inspection-divider");
    expect(css).toContain(".hq-venture-placeholder");
    expect(css).not.toMatch(/\.hq-venture-placeholder\s*\{[^}]*min-height:\s*(?:[5-9]|[1-9]\d)/);
  });
});
