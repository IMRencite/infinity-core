import { describe, expect, it } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { VERCEL_V1_DEPLOYMENT_MODE } from "@/lib/infinity/production-artifact/constants";
import { mapInfinityDeployToVercelLivePayload } from "@/lib/infinity/governed-deployment-execution";

const deployBase = {
  organizationId: "org-mode-test",
  actionType: "hosting.deploy",
  target: "infinity-test-live-verification-gde",
  correlationId: "corr-mode",
};

const required = {
  production_artifact_id: "infinity-vercel-live-verification-artifact-v1",
  commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  repository_full_name: "infinity-org/infinity-test-live-verification-gde",
};

describe("Vercel adapter deployment mode contract", () => {
  it("accepts the canonical git_integrated mode and defaults to it when omitted", async () => {
    const explicit = await vercelAdapter.validate({
      ...deployBase,
      payload: { ...required, deployment_mode: VERCEL_V1_DEPLOYMENT_MODE },
    });
    const omitted = await vercelAdapter.validate({
      ...deployBase,
      payload: { ...required },
    });
    expect(VERCEL_V1_DEPLOYMENT_MODE).toBe("git_integrated");
    expect(explicit).toEqual({ valid: true, issues: [] });
    expect(omitted).toEqual({ valid: true, issues: [] });
  });

  it("maps the live-run failing git value at the Vercel live port and keeps adapter validation strict", async () => {
    const mapped = mapInfinityDeployToVercelLivePayload({
      ...required,
      deployment_mode: "git",
    });
    expect(mapped.deployment_mode).toBe("git_integrated");
    expect(mapped.target).toBe("preview");
    const mappedValid = await vercelAdapter.validate({
      ...deployBase,
      payload: mapped,
    });
    expect(mappedValid.valid).toBe(true);
    const stale = await vercelAdapter.validate({
      ...deployBase,
      payload: { ...required, deployment_mode: "git" },
    });
    expect(stale).toEqual({ valid: false, issues: ["unsupported_deployment_mode"] });
  });

  it("blocks genuinely invalid modes and does not accept a wildcard", async () => {
    for (const mode of ["files", "cli", "wildcard", "*", "production", "preview"]) {
      const result = await vercelAdapter.validate({
        ...deployBase,
        payload: { ...required, deployment_mode: mode },
      });
      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(["unsupported_deployment_mode"]);
    }
  });

  it("keeps create/verify provider-neutral about deployment mode", async () => {
    const create = await vercelAdapter.validate({
      ...deployBase,
      actionType: "hosting.create_project",
      payload: { repository_full_name: required.repository_full_name, deployment_mode: "git" },
    });
    const verify = await vercelAdapter.validate({
      ...deployBase,
      actionType: "hosting.verify_deployment",
      payload: { deployment_id: "dpl_test", deployment_mode: "git" },
    });
    expect(create.valid).toBe(true);
    expect(verify.valid).toBe(true);
  });
});
