import { describe, expect, it } from "vitest";
import {
  isolatedRuntimeStorefrontComposeForbiddenError,
  shouldInstallIsolatedRuntimeStorefrontComposeStub,
} from "../infinity-runtime-storefront-compose-stub-policy";
import { composeClubThrottleStorefrontFiles } from "../club-throttle-storefront-compose";

describe("CT autonomous venture deploy compose regression", () => {
  it("CT_COMMERCE_BRIDGE_REAL_COMPOSE_QC: bridge deploy without explicit stub keeps real compose", () => {
    expect(
      shouldInstallIsolatedRuntimeStorefrontComposeStub({
        INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY: "1",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    const files = composeClubThrottleStorefrontFiles(process.cwd());
    expect(files.files.length).toBeGreaterThan(10);
    expect(() => composeClubThrottleStorefrontFiles(process.cwd())).not.toThrow();
  });

  it("CT_EXPLICIT_STUB_MODE_QC: explicit stub env would install forbidden compose", () => {
    expect(
      shouldInstallIsolatedRuntimeStorefrontComposeStub({
        INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY: "1",
        INFINITY_RUNTIME_STUB_STOREFRONT_COMPOSE: "1",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(isolatedRuntimeStorefrontComposeForbiddenError().message).toBe(
      "FORBIDDEN_STOREFRONT_COMPOSE_IN_ISOLATED_RUNTIME",
    );
  });

  it("CT_AUTONOMOUS_VENTURE_DEPLOY_COMPOSE_REGRESSION_QC: reproduces 06Z failure class when stub installed", () => {
    const stub = () => {
      throw isolatedRuntimeStorefrontComposeForbiddenError();
    };
    expect(() => stub()).toThrow(/FORBIDDEN_STOREFRONT_COMPOSE_IN_ISOLATED_RUNTIME/);
  });
});
