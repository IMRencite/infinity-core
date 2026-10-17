import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  prepareReleaseIdentityFiles,
  verifyBuiltArtifactReleaseIdentity,
} from "../release-identity-generator";
import { resolveRuntimeReleaseSha, resetBakedReleaseIdentityCache } from "../release-identity";

describe("release identity generator", () => {
  it("STALE_VALID_RELEASE_IDENTITY_REGRESSION_QC: regenerates from source B over stale file A and env A", () => {
    const dir = mkdtempSync(join(tmpdir(), "release-id-gen-"));
    const stale = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const source = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    writeFileSync(
      join(dir, "release-identity.json"),
      `${JSON.stringify({
        deployable_unit: "infinity-runtime",
        release_sha: stale,
        release_tree_hash: "tree",
        release_dirty: false,
        build_graph_hash: "graph",
        schema_version_required: "communication-recovery-release-v8",
        build_timestamp: "2026-09-20T00:00:00.000Z",
        release_sequence: "v8",
      })}\n`,
    );
    const prior = process.env.COMMUNICATION_RELEASE_SHA;
    process.env.COMMUNICATION_RELEASE_SHA = stale;
    resetBakedReleaseIdentityCache();

    const prep = prepareReleaseIdentityFiles({
      destRoot: dir,
      sourceCommitSha: source,
      identity: {
        deployable_unit: "infinity-runtime",
        release_sha: source,
        release_tree_hash: "tree",
        release_dirty: false,
        build_graph_hash: "graph",
        schema_version_required: "communication-recovery-release-v8",
        build_timestamp: "2026-09-20T00:00:00.000Z",
        release_sequence: "v8",
      },
    });
    expect(prep.PREBUILD_RELEASE_IDENTITY_ACTION).toBe("REGENERATE");
    expect(prep.RELEASE_IDENTITY_FILE_PARITY_QC).toBe("PASS");
    expect(prep.RELEASE_IDENTITY_GENERATED_SHA).toBe(source);

    const artifact = verifyBuiltArtifactReleaseIdentity(dir, source);
    expect(artifact.BUILT_ARTIFACT_RELEASE_IDENTITY_QC).toBe("PASS");

    resetBakedReleaseIdentityCache();
    const resolved = resolveRuntimeReleaseSha({
      deployable_unit: "infinity-runtime",
      release_sha: source,
      release_tree_hash: "tree",
      release_dirty: false,
      build_graph_hash: "graph",
      schema_version_required: "communication-recovery-release-v8",
      build_timestamp: "2026-09-20T00:00:00.000Z",
      release_sequence: "v8",
    });
    expect(resolved).toBe(source);
    expect(resolved).not.toBe(stale);

    process.env.COMMUNICATION_RELEASE_SHA = prior;
    rmSync(dir, { recursive: true, force: true });
  });
});
