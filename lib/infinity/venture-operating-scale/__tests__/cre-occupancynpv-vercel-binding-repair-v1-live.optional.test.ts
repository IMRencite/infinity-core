import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreOccupancynpvVercelDeploymentBindingRepairV1Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1 live", () => {
  it("rebinds occupancynpv.com to the accepted READY deployment without rewriting DNS", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreOccupancynpvVercelDeploymentBindingRepairV1Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-occupancynpv-vercel-binding-repair-v1-report.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.repair.cloudflareDnsChanged).toBe("NO");
    expect(result.actions.deployments).toBe(0);
    expect(result.actions.stripeWrites).toBe(0);
    expect(result.artifact.regenerated).toBe("NO");
    expect(result.actions.publiclyLaunched).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 180_000);
});
