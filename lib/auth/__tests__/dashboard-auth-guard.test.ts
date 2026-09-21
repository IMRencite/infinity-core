import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("dashboard auth guard semantics", () => {
  it("routes missing organization membership to onboarding instead of login", () => {
    const page = readFileSync("app/dashboard/page.tsx", "utf8");
    expect(page).toContain("requireOperatorOrgContext");
    expect(page).not.toContain('redirect("/login")');
  });

  it("requireOperatorOrgContext sends users to onboarding when membership absent", () => {
    const helper = readFileSync(
      "lib/infinity/operator-console/require-org-context.ts",
      "utf8",
    );
    expect(helper).toContain('redirect("/dashboard/onboarding")');
    expect(helper).toContain('result.status === "unauthenticated"');
    expect(helper).toContain('redirect("/login")');
  });

  it("requireOperatorOrgContext sends lookup failures to workspace unavailable", () => {
    const helper = readFileSync(
      "lib/infinity/operator-console/require-org-context.ts",
      "utf8",
    );
    expect(helper).toContain('result.status === "error"');
    expect(helper).toContain("workspaceUnavailablePath");
  });
});
