import { describe, expect, it } from "vitest";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

describe("infinity runtime deploy source isolation", () => {
  it(
    "UNTRACKED_SOURCE_LEAKAGE_REGRESSION_QC: sentinel absent from detached worktree",
    () => {
    const repoRoot = process.cwd();
    const sentinelRel = ".infinity/_untracked-leak-sentinel-do-not-commit.txt";
    const sentinelPath = join(repoRoot, sentinelRel);
    writeFileSync(sentinelPath, `sentinel-${Date.now()}\n`);
    try {
      const sha = (spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout || "").trim();
      const wt = join(tmpdir(), `infinity-runtime-src-test-${sha.slice(0, 8)}`);
      if (existsSync(wt)) {
        spawnSync("git", ["worktree", "remove", "--force", wt], { cwd: repoRoot, shell: true });
      }
      const add = spawnSync("git", ["worktree", "add", "--detach", wt, sha], { cwd: repoRoot, shell: true });
      expect(add.status).toBe(0);
      expect(existsSync(join(wt, sentinelRel))).toBe(false);
      spawnSync("git", ["worktree", "remove", "--force", wt], { cwd: repoRoot, shell: true });
    } finally {
      if (existsSync(sentinelPath)) rmSync(sentinelPath, { force: true });
    }
  },
    30_000,
  );
});
