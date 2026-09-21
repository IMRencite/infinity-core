import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluatePublicOperationsFloorLayoutGate } from "../visual-gates";
import { evaluatePublicOrganicPrivacy } from "@/lib/infinity/organic-growth-engine/continuous/public";

describe("Public operations floor layout", () => {
  it("makes HQ full width and keeps a shared 3/2/1 room grid", () => {
    const gate = evaluatePublicOperationsFloorLayoutGate();
    expect(gate.result).toBe("PASS");
    const css = readFileSync(join(process.cwd(), "components/public/operations-room/operations-room.module.css"), "utf8");
    const floor = readFileSync(join(process.cwd(), "components/public/operations-room/operations-floor.tsx"), "utf8");
    expect(floor.indexOf('"OPERATIONS"')).toBeLessThan(floor.indexOf('"RESEARCH"'));
    expect(css).toContain("repeat(3, minmax(0, 1fr))");
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(css).toContain("grid-column: 1 / -1");
    expect(css).toContain("#e879f9");
    expect(css).toContain("#3dffb0");
    expect(css).toContain("#7dd3fc");
    expect(css).toContain("prefers-reduced-motion");
    expect(evaluatePublicOrganicPrivacy("Improving published resources").result).toBe("PASS");
  });
});
