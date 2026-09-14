import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateFounderHqRuntimeSourceGate,
  FOUNDER_HQ_CANONICAL_DASHBOARD,
  FOUNDER_HQ_CANONICAL_ORIGIN,
  FOUNDER_HQ_CANONICAL_PORT,
  isCanonicalFounderHqOrigin,
} from "../local-hq-proof";

describe("founder HQ runtime source of truth", () => {
  it("1-3: locks founder proof and Playwright to localhost:3000 and rejects 3001", () => {
    const playwright = readFileSync(join(process.cwd(), "playwright.config.ts"), "utf8");
    expect(playwright).toContain("http://localhost:3000");
    expect(playwright).toContain("port 3001 is non-canonical");
    expect(FOUNDER_HQ_CANONICAL_PORT).toBe(3000);
    expect(FOUNDER_HQ_CANONICAL_ORIGIN).toBe("http://localhost:3000");
    expect(FOUNDER_HQ_CANONICAL_DASHBOARD).toBe("http://localhost:3000/dashboard");
    expect(isCanonicalFounderHqOrigin("http://localhost:3000/dashboard")).toBe(true);
    expect(isCanonicalFounderHqOrigin("http://127.0.0.1:3000/dashboard")).toBe(true);
    expect(isCanonicalFounderHqOrigin("http://localhost:3001/dashboard")).toBe(false);
    expect(evaluateFounderHqRuntimeSourceGate({ inspectedOrigin: "http://localhost:3000" }).result).toBe("PASS");
    expect(evaluateFounderHqRuntimeSourceGate({ inspectedOrigin: "http://localhost:3001" }).result).toBe("FAIL");
  });
});
