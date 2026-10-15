import { describe, expect, it, vi } from "vitest";
import {
  assertPriorDeploymentBundleIdentityParity,
  classifyProductionVerifyHttpOutcome,
  mergeVentureDeployOutputLineage,
  readPriorDeploymentIdFromLineage,
  resolveAuthoritativeDeploymentId,
  upstreamDeployBlocksProductionVerify,
} from "../venture-async-deploy-reconciliation-v1";
import { executeBoundedVentureDeploy } from "../async-venture-deployment-reconciliation-v1";

describe("async deploy reconciliation v44.2.2", () => {
  it("reads prior deployment id from authoritative lineage fields", () => {
    expect(readPriorDeploymentIdFromLineage({ deployment_id: "dpl_abc" })).toBe("dpl_abc");
    expect(readPriorDeploymentIdFromLineage({ authoritative_deployment_id: "dpl_def" })).toBe("dpl_def");
    expect(readPriorDeploymentIdFromLineage({})).toBeNull();
  });

  it("selects earliest telemetry deployment and supersedes later duplicates", () => {
    const picked = resolveAuthoritativeDeploymentId({
      output_lineage: { deployment_id: "dpl_newest" },
      telemetry_deployments: [
        { deployment_id: "dpl_first", created_at: "t1", build_status: "IN_PROGRESS" },
        { deployment_id: "dpl_second", created_at: "t2", build_status: "IN_PROGRESS" },
      ],
    });
    expect(picked.authoritative_deployment_id).toBe("dpl_first");
    expect(picked.superseded_deployment_ids).toEqual(["dpl_second", "dpl_newest"]);
  });

  it("merges output lineage without dropping superseded ids", () => {
    const merged = mergeVentureDeployOutputLineage(
      { deployment_id: "dpl_old", asset_identity: "asset-a" },
      { deployment_id: "dpl_new", authoritative_deployment_id: "dpl_new" },
    );
    expect(merged.deployment_id).toBe("dpl_new");
    expect(merged.superseded_deployment_ids).toContain("dpl_old");
  });

  it("fails closed on frozen manifest mismatch", () => {
    const result = assertPriorDeploymentBundleIdentityParity({
      prior_deployment_id: "dpl_x",
      revision: {
        venture_id: "occupancynpv",
        asset_id: "asset-a",
        asset_revision: "asset-a",
        frozen_bundle_manifest_hash: "hash-a",
      },
      persisted: { frozen_bundle_manifest_hash: "hash-b", asset_identity: "asset-a" },
    });
    expect(result.ok).toBe(false);
  });

  it("blocks production verify until venture deploy completes", () => {
    expect(
      upstreamDeployBlocksProductionVerify({
        status: "IN_PROGRESS",
      } as never).blocked,
    ).toBe(true);
    expect(
      upstreamDeployBlocksProductionVerify({
        status: "COMPLETED",
      } as never).blocked,
    ).toBe(false);
  });

  it("classifies pre-ready 404 as upstream wait not terminal failure", () => {
    const outcome = classifyProductionVerifyHttpOutcome({ http_status: 404, upstream_blocked: false });
    expect(outcome.terminal).toBe(false);
    expect(outcome.safe_error).toBe("UPSTREAM_DEPLOYMENT_NOT_READY");
  });

  it("second bounded deploy attempt passes prior deployment id to deployer", async () => {
    const deployApprovedVentureProductionBundle = vi.fn(async (input: { prior_deployment_id?: string | null }) => ({
      ok: false,
      venture_id: "occupancynpv",
      deployment_id: input.prior_deployment_id ?? null,
      production_url: null,
      safe_error: "VERCEL_DEPLOYMENT_NOT_READY",
      aliased: false,
      provider_post_count: 0,
    }));
    vi.doMock("../../autonomous-venture-production-deployer-v1", () => ({
      deployApprovedVentureProductionBundle,
    }));
    const { executeBoundedVentureDeploy: execute } = await import("../async-venture-deployment-reconciliation-v1");
    const result = await execute({
      venture_id: "occupancynpv",
      prior_deployment_id: "dpl_prior",
      frozen_revision: {
        venture_id: "occupancynpv",
        asset_id: "asset-a",
        asset_revision: "asset-a",
        frozen_bundle_manifest_hash: "hash-a",
      },
      persisted_deploy_lineage: { asset_identity: "asset-a", frozen_bundle_manifest_hash: "hash-a" },
    });
    expect(result.phase).toBe("IN_PROGRESS");
    expect(result.deployment_id).toBe("dpl_prior");
  });
});

describe("executeBoundedVentureDeploy prior propagation", () => {
  it("returns IN_PROGRESS when deployer reports not ready with existing id", async () => {
    vi.resetModules();
    vi.doMock("../../autonomous-venture-production-deployer-v1", () => ({
      deployApprovedVentureProductionBundle: vi.fn(async () => ({
        ok: false,
        venture_id: "occupancynpv",
        deployment_id: "dpl_existing",
        production_url: null,
        safe_error: "VERCEL_DEPLOYMENT_NOT_READY",
        aliased: false,
        provider_post_count: 0,
      })),
    }));
    const { executeBoundedVentureDeploy: execute } = await import("../async-venture-deployment-reconciliation-v1");
    const result = await execute({
      venture_id: "occupancynpv",
      prior_deployment_id: "dpl_existing",
    });
    expect(result.phase).toBe("IN_PROGRESS");
    if (result.phase === "IN_PROGRESS") {
      expect(result.provider_post_count).toBe(0);
    }
  });
});
