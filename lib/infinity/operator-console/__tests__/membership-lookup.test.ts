import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isInfrastructureMembershipError,
  membershipUnavailableUserMessage,
} from "@/lib/infinity/operator-console/membership-lookup";

describe("organization membership lookup semantics", () => {
  it("treats PGRST002 as infrastructure failure", () => {
    expect(isInfrastructureMembershipError("PGRST002")).toBe(true);
  });

  it("uses workspace-unavailable copy for infrastructure failures", () => {
    expect(membershipUnavailableUserMessage("PGRST002")).toContain(
      "database API",
    );
  });

  it("uses generic copy for other lookup failures", () => {
    expect(membershipUnavailableUserMessage("42501")).toContain(
      "workspace information",
    );
  });
});

describe("onboarding membership guard semantics", () => {
  it("onboarding actions distinguish lookup errors from missing membership", () => {
    const actions = readFileSync("app/dashboard/onboarding/actions.ts", "utf8");
    expect(actions).toContain('membership.status === "error"');
    expect(actions).not.toContain(
      'throw new Error("Unable to verify organization membership.")',
    );
  });

  it("onboarding page renders unavailable state instead of throwing", () => {
    const page = readFileSync("app/dashboard/onboarding/page.tsx", "utf8");
    expect(page).toContain('membership.status === "error"');
    expect(page).toContain("OnboardingUnavailableState");
    expect(page).not.toContain("throw new Error");
  });
});
