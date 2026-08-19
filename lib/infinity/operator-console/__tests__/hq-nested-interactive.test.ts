import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "components/dashboard/operator-console");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("HQ nested interactive markup", () => {
  it("department room uses div role=button shell instead of outer button", () => {
    const source = readSource("infinity-room/infinity-room-shell.tsx");
    expect(source).toContain('role="button"');
    expect(source).not.toMatch(/<button[\s\S]*RoomArtifactSurface/);
    expect(readSource("department-room.tsx")).not.toContain("<button");
  });

  it("command chamber uses div role=button shell", () => {
    expect(readSource("command-chamber.tsx")).not.toContain("<button");
    expect(readSource("command-chamber.tsx")).toContain("DecisionToken");
  });

  it("artifact cards use div role=button not nested button", () => {
    const primitives = readSource("artifacts/primitives.tsx");
    expect(primitives).toContain('role="button"');
    expect(primitives).not.toMatch(/<button[\s\S]*ArtifactCard/);
    expect(primitives).toContain("DecisionBadge");
    const cardBody = primitives.slice(primitives.indexOf("export function ArtifactCard"), primitives.indexOf("export function DecisionToken"));
    expect(cardBody).not.toContain("<DecisionToken");
    expect(cardBody).not.toContain("<button");
  });

  it("decision tokens inside cards are non-interactive badges", () => {
    const primitives = readSource("artifacts/primitives.tsx");
    expect(primitives).toMatch(/selection_blueprint[\s\S]*DecisionBadge/);
  });

  it("artifact overflow control expands remaining artifacts instead of acting as a dead +N", () => {
    const primitives = readSource("artifacts/primitives.tsx");
    expect(primitives).toContain("onExpandOverflow");
    expect(primitives).toContain("Show ${count} more artifacts");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("openRoomInventory");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("View all");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("Scroll artifacts left");
    expect(readSource("artifacts/room-artifact-inventory.tsx")).toContain("Room inventory");
    expect(readSource("artifacts/hq-output-detail.tsx")).toContain("Back to room inventory");
  });

  it("artifact clicks stop propagation from room shell", () => {
    expect(readSource("artifacts/primitives.tsx")).toContain("stopPropagation");
  });

  it("keyboard helpers support Enter and Space", () => {
    const keyboard = readSource("infinity-room/room-keyboard.ts");
    expect(keyboard).toContain('"Enter"');
    expect(keyboard).toContain('" "');
  });
});
