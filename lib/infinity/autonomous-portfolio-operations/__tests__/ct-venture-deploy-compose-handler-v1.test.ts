import { describe, expect, it } from "vitest";
import { composeClubThrottleStorefrontFiles } from "@/lib/infinity/commerce/club-throttle-storefront-compose";
import { shouldInstallIsolatedRuntimeStorefrontComposeStub } from "@/lib/infinity/commerce/infinity-runtime-storefront-compose-stub-policy";

describe("CT VENTURE_DEPLOY handler compose path", () => {
  it("CT_VENTURE_DEPLOY_HANDLER_COMPOSE_QC: real compose succeeds for after-dark bundle contract", () => {
    expect(
      shouldInstallIsolatedRuntimeStorefrontComposeStub({
        INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY: "1",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    const composed = composeClubThrottleStorefrontFiles(process.cwd());
    const paths = composed.files.map((f) => f.path.replace(/\\/g, "/"));
    expect(paths.some((p) => p.includes("journal/night-riding/how-to-ride-after-dark"))).toBe(true);
    expect(paths.some((p) => p.includes("public/visual/journal-hero-night-ride.webp"))).toBe(true);
  });
});
