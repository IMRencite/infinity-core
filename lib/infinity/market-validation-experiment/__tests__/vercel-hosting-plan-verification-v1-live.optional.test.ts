import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeVercelHostingPlanVerification } from "../vercel-hosting-plan-verification";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("VERCEL HOSTING PLAN VERIFICATION V1 live", () => {
  it("reads the Vercel team plan that owns the CRE deployment without upgrading", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    const result = await executeVercelHostingPlanVerification({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/vercel-hosting-plan-verification-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.purchases).toBe(0);
    expect(result.planChanges).toBe(0);
    expect(result.deployments).toBe(0);
    expect(result.domainBindings).toBe(0);
    expect(result.dnsWrites).toBe(0);
    expect(result.publiclyLaunched).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 60_000);
});
