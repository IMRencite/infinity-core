import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_HQ_ROOM_IDS,
  COMMAND_ROOM_ID,
  FINAL_ROOM_DISPLAY_NAMES,
  LIFECYCLE_ROOM_SEQUENCE,
  ROOM_DISPLAY_NAMES,
  getRoomDisplayNames,
} from "../room-naming";

const COMPONENTS = join(process.cwd(), "components/dashboard/operator-console");
const CSS = join(process.cwd(), "app/globals.css");

function readComponent(relativePath: string): string {
  return readFileSync(join(COMPONENTS, relativePath), "utf8");
}

const EXPECTED_SHORT: Record<string, string> = {
  opportunity_lab: "Finds new business ideas and opportunities worth exploring.",
  research_department: "Checks the market, customers, competitors, facts, and evidence behind an idea.",
  strategy_finance: "Figures out how the business can make money and whether the economics make sense.",
  company_operations: "Turns a validated idea into a clear business plan and build roadmap.",
  growth_department: "Plans how the venture will attract customers and grow.",
  creative_studio: "Creates the brand, visuals, messaging, and creative direction.",
  product_lab: "Builds the product, website, software, assets, and systems the venture needs.",
  quality_control: "Tests the work, catches problems, and decides if the venture is ready to move forward.",
  launch_operations: "Handles the technical steps needed to put the venture online.",
  intelligence_center: "Watches performance, learns what is working, and finds what should improve next.",
  executive_office: "Coordinates the whole venture and decides what should happen next.",
};

describe("HQ room job descriptions v1", () => {
  it("keeps one canonical metadata source for every HQ room", () => {
    expect(ALL_HQ_ROOM_IDS).toHaveLength(11);
    expect(Object.keys(ROOM_DISPLAY_NAMES)).toHaveLength(11);
    for (const id of ALL_HQ_ROOM_IDS) {
      const names = getRoomDisplayNames(id);
      expect(names.shortDescription.trim().length).toBeGreaterThan(20);
      expect(names.expandedDescription.trim().length).toBeGreaterThan(names.shortDescription.length);
      expect(names.supportingLabel).toBe(names.shortDescription);
      expect(names.shortDescription).toBe(EXPECTED_SHORT[id]);
      expect(names.shortDescription).not.toMatch(/leverages advanced intelligence|revolutionizes|next-generation|synergizes/i);
    }
  });

  it("gives Command a coordinating job description", () => {
    const command = getRoomDisplayNames(COMMAND_ROOM_ID);
    expect(command.displayName).toBe("Command");
    expect(command.shortDescription).toBe("Coordinates the whole venture and decides what should happen next.");
    expect(command.expandedDescription).toContain("operating brain");
    expect(LIFECYCLE_ROOM_SEQUENCE.includes(COMMAND_ROOM_ID)).toBe(false);
  });

  it("does not leave any room description empty", () => {
    for (const names of Object.values(ROOM_DISPLAY_NAMES)) {
      expect(names.shortDescription).toBeTruthy();
      expect(names.expandedDescription).toBeTruthy();
    }
  });

  it("renders short descriptions on operating-floor cards", () => {
    const room = readComponent("department-room.tsx");
    expect(room).toContain("hq-room-job");
    expect(room).toContain("{supportingLabel}");
    expect(room).toContain("activityHeadline");
    expect(room).not.toContain("snapshot?.displayHeadline ?? supportingLabel");
    expect(room).toContain("RoomPresenceTrack");
    expect(readComponent("infinity-room/room-presence-track.tsx")).toContain("Agents in room");
    expect(room).not.toMatch(/Workers in room/);
  });

  it("renders Command short description separately from current mission status", () => {
    const command = readComponent("command-chamber.tsx");
    expect(command).toContain("names.shortDescription");
    expect(command).toContain("hq-room-job");
    expect(command).toContain("Current mission");
  });

  it("shows expanded descriptions in the existing room detail panel", () => {
    const detail = readComponent("department-detail-panel.tsx");
    expect(detail).toContain("What happens here");
    expect(detail).toContain("names.expandedDescription");
    expect(detail).toContain("What Infinity is doing");
    expect(detail).toContain("Agents in room");
    expect(detail).not.toMatch(/Workers in room/);
  });

  it("preserves canonical operating-floor order and room identity", () => {
    expect(LIFECYCLE_ROOM_SEQUENCE).toEqual([
      "opportunity_lab",
      "research_department",
      "strategy_finance",
      "company_operations",
      "growth_department",
      "creative_studio",
      "product_lab",
      "quality_control",
      "launch_operations",
      "intelligence_center",
    ]);
    expect(FINAL_ROOM_DISPLAY_NAMES).toEqual([
      "Venture Radar",
      "Research Grid",
      "Profit Lab",
      "Blueprint Lab",
      "Growth Nexus",
      "Design Core",
      "Creation Lab",
      "Validation Station",
      "Deployment Depot",
      "Signal Intelligence",
      "Command",
    ]);
    expect(readComponent("hq-spatial-floor.tsx")).toContain("LIFECYCLE_ROOM_SEQUENCE");
    expect(readComponent("hq-spatial-floor.tsx")).toContain("getRoomDisplayNames");
  });

  it("keeps job copy wrapping instead of clipping or overflowing horizontally", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain(".hq-room-job");
    expect(css).toContain("overflow-wrap: break-word");
    expect(css).toContain("white-space: normal");
    expect(css).not.toMatch(/\.hq-room-job\s*\{[^}]*white-space:\s*nowrap/);
    const room = readComponent("department-room.tsx");
    expect(room).not.toMatch(/hq-room-job[^>]*(line-clamp|truncate|whitespace-nowrap)/);
  });
});
