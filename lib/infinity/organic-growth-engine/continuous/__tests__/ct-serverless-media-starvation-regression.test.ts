import { describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  CT_AFTER_DARK_RUNTIME_HERO_REL,
  evaluateBlogRuntimeAfterDarkPredeployProbe,
  evaluateBlogRuntimeMediaArtifactQc,
  evaluateCtServerlessMediaStarvationRegressionQc,
} from "../blog-runtime-media-artifact-qc";

describe("CT serverless media starvation regression", () => {
  it("fails runtime artifact QC when after-dark hero webp is absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "infinity-runtime-artifact-"));
    mkdirSync(join(dir, "public/visual"), { recursive: true });
    try {
      const artifact = evaluateBlogRuntimeMediaArtifactQc({ artifact_root: dir });
      expect(artifact.result).toBe("FAIL");
      expect(artifact.CT_AFTER_DARK_RUNTIME_MEDIA_EXISTS).toBe(false);
      expect(artifact.missing).toContain(CT_AFTER_DARK_RUNTIME_HERO_REL);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("blocks after-dark predeploy with asset_missing_on_disk when hero absent on serverless cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "infinity-runtime-predeploy-"));
    try {
      cpSync(join(process.cwd(), "lib"), join(dir, "lib"), { recursive: true });
      mkdirSync(join(dir, "public/visual"), { recursive: true });
      mkdirSync(join(dir, "public/media"), { recursive: true });
      const probe = evaluateBlogRuntimeAfterDarkPredeployProbe({ artifact_root: dir });
      expect(probe.CT_RUNTIME_PREDEPLOY_DEPLOY_ALLOWED).toBe(false);
      expect(probe.CT_RUNTIME_PREDEPLOY_REASONS.some((r) => /asset_missing_on_disk|BLOG_MEDIA/i.test(r))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  it("passes artifact + after-dark predeploy on full committed repo tree", () => {
    if (!existsSync(join(process.cwd(), CT_AFTER_DARK_RUNTIME_HERO_REL))) {
      expect.unreachable("tracked hero webp missing from repo");
    }
    const regression = evaluateCtServerlessMediaStarvationRegressionQc({ artifact_root: process.cwd() });
    expect(regression.result).toBe("PASS");
    const artifact = evaluateBlogRuntimeMediaArtifactQc({ artifact_root: process.cwd() });
    expect(artifact.INFINITY_RUNTIME_PUBLIC_VISUAL_COPY_QC).toBe("PASS");
    expect(artifact.INFINITY_RUNTIME_PUBLIC_MEDIA_COPY_QC).toBe("PASS");
  }, 120_000);
});
