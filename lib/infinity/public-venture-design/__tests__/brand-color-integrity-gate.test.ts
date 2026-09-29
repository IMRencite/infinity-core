import { describe, expect, it } from "vitest";
import {
  evaluateBrandColorIntegrityGate,
  whiteBleedSymbolFixture,
  buildSymbolMaskFromReference,
} from "../brand-color-integrity-gate";

describe("BrandColorIntegrityGate", () => {
  it("fails white contamination in blue symbol fixture", () => {
    const fx = whiteBleedSymbolFixture();
    const gate = evaluateBrandColorIntegrityGate(fx);
    expect(gate.result).toBe("FAIL");
    expect(gate.whiteContaminationInSymbol).toBeGreaterThan(0);
  });

  it("passes intact blue symbol against reference parity", () => {
    const fx = whiteBleedSymbolFixture();
    const ref = new Uint8ClampedArray(fx.rgba);
    const rgba = new Uint8ClampedArray(fx.rgba);
    for (let y = 11; y < 28; y += 1) {
      for (let x = 36; x < 50; x += 1) {
        const i = (y * fx.width + x) * 4;
        rgba[i] = 40;
        rgba[i + 1] = 120;
        rgba[i + 2] = 240;
        rgba[i + 3] = 255;
      }
    }
    const gate = evaluateBrandColorIntegrityGate({
      width: fx.width,
      height: fx.height,
      rgba,
      referenceRgba: ref,
    });
    expect(gate.whiteContaminationInSymbol).toBe(0);
    expect(gate.result).toBe("PASS");
  });
});
