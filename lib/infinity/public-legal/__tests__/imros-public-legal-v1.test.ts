import { describe, expect, it } from "vitest";
import {
  evaluateLegalPageSubstantiveCoverageGate,
  evaluateLegalPageThinnessGate,
  evaluatePrivacyPolicyCompletenessGate,
  evaluateTermsOfServiceCompletenessGate,
  evaluateVentureLegalBoundaryGate,
  legalSentenceCount,
  legalWordCount,
  readPublicLegalSources,
} from "..";

describe("IMROS public legal pages", () => {
  it("rejects one-sentence legal stubs and requires substantive coverage", () => {
    const { privacy, terms } = readPublicLegalSources();
    expect(legalWordCount(privacy)).toBeGreaterThan(400);
    expect(legalWordCount(terms)).toBeGreaterThan(400);
    expect(legalSentenceCount(privacy)).toBeGreaterThan(8);
    expect(legalSentenceCount(terms)).toBeGreaterThan(8);
    expect(evaluateLegalPageThinnessGate().result).toBe("PASS");
    expect(evaluatePrivacyPolicyCompletenessGate().result).toBe("PASS");
    expect(evaluateTermsOfServiceCompletenessGate().result).toBe("PASS");
    expect(evaluateVentureLegalBoundaryGate().result).toBe("PASS");
    expect(evaluateLegalPageSubstantiveCoverageGate().result).toBe("PASS");
  });

  it("keeps IMROS legal pages from replacing venture legal stacks", () => {
    const { privacy, terms } = readPublicLegalSources();
    expect(privacy.toLowerCase()).toMatch(/not a substitute|does not replace/);
    expect(terms.toLowerCase()).toMatch(/does not replace|venture-specific/);
    expect(`${privacy}\n${terms}`).toMatch(/own required legal stack/i);
    expect(`${privacy}\n${terms}`).not.toMatch(/covers every venture identically/i);
  });
});
