import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateBrandExperienceQualityGate,
  evaluatePublicImrBrandMarkGate,
} from "../visual-gates";

const ROOT = process.cwd();

describe("IMROS public IMR brand mark v1", () => {
  it("places a transparent IMR mark at the top right and QC-checks it", () => {
    const gate = evaluatePublicImrBrandMarkGate();
    expect(gate.reasons.join(" | ")).toBe("IMR_MARK_TOP_RIGHT_TRANSPARENT");
    expect(gate.result).toBe("PASS");
    expect(evaluateBrandExperienceQualityGate().result).toBe("PASS");
    expect(existsSync(join(ROOT, "public/brand/imr-mark.png"))).toBe(true);
    const live = readFileSync(join(ROOT, "components/public/operations-room/live-operations-room.tsx"), "utf8");
    const legal = readFileSync(join(ROOT, "components/public/legal/legal-shell.tsx"), "utf8");
    const mark = readFileSync(join(ROOT, "components/public/operations-room/imr-brand-mark.tsx"), "utf8");
    expect(live).toContain("ImrBrandMark");
    expect(legal).toContain("ImrBrandMark");
    expect(mark).toContain('alt="IMR"');
    expect(mark).toContain("/brand/imr-mark.png");
  });
});
