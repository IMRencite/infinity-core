import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { resolveClubThrottlePipelineArtifactRoot } from "../club-throttle-autonomous-product-pipeline-v1.ts";

describe("serverless creative artifact root", () => {
  it("uses /tmp under cloud runtime and never /var/task", () => {
    const cwd = mkdtempSync(join(tmpdir(), "ct-repo-root-"));
    const cloud = resolveClubThrottlePipelineArtifactRoot(cwd, {
      INFINITY_CLOUD_RUNTIME: "1",
    } as NodeJS.ProcessEnv);
    expect(cloud).toBe(join("/tmp", "infinity-commerce-autonomous-product-pipeline"));
    expect(cloud.includes("/var/task")).toBe(false);

    const attemptDir = join(cloud, "ct-merch-concept-v43-3", "attempts", "probe-attempt");
    mkdirSync(attemptDir, { recursive: true });
    const rawPath = join(attemptDir, "raw-provider.png");
    const processedPath = join(attemptDir, "post-processed.png");
    const manifestPath = join(cloud, "ct-merch-concept-v43-3", "paid-creative-attempts.json");
    writeFileSync(rawPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(processedPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(manifestPath, '{"attempts":[]}\n');
    expect(existsSync(rawPath)).toBe(true);
    expect(existsSync(processedPath)).toBe(true);
    expect(existsSync(manifestPath)).toBe(true);
    expect(rawPath.replace(/\\/g, "/").includes("/tmp/infinity-commerce-autonomous-product-pipeline")).toBe(true);
  });

  it("keeps repo-local .infinity path for normal dev", () => {
    const cwd = mkdtempSync(join(tmpdir(), "ct-dev-root-"));
    const local = resolveClubThrottlePipelineArtifactRoot(cwd, {} as NodeJS.ProcessEnv);
    expect(local).toBe(join(cwd, ".infinity/commerce/autonomous-product-pipeline"));
  });
});
