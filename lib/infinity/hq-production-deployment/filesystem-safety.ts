import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HQ_SERVERLESS_FILESYSTEM_SAFETY_GATE, type HqNamedGate } from "./contract";

export const HQ_SERVERLESS_FS_WRITE_CLASS = [
  "LOCAL_DEV_ONLY",
  "DURABLE_PRODUCTION_REQUIRED",
  "EPHEMERAL_SAFE",
  "INVALID_ON_VERCEL",
] as const;

export type HqServerlessFsWriteClass = (typeof HQ_SERVERLESS_FS_WRITE_CLASS)[number];

/** Authenticated HQ render-path writers that must never mutate Vercel disk as durable state. */
export const HQ_AUTHENTICATED_RENDER_FS_SITES = [
  "lib/infinity/opportunity-universe-hq/persist.ts",
  "lib/infinity/venture-operating-scale/persist.ts",
  "lib/infinity/venture-economics/persist.ts",
  "lib/infinity/canonical-work/store.ts",
  "lib/infinity/mission-activity/persist-disk.ts",
  "lib/infinity/venture-operating-scale/post-launch-operating-runtime.ts",
  "lib/infinity/autonomous-operating-loop/persist.ts",
  "lib/infinity/financial-truth/cache.ts",
  "lib/infinity/venture-operating-scale/occupancynpv-artifact-lineage.ts",
] as const;

export function classifyHqFilesystemWrite(input: {
  requiredForHqRender: boolean;
  durableLocalPersistGuarded: boolean;
  ephemeralScratch: boolean;
}): HqServerlessFsWriteClass {
  if (input.requiredForHqRender && !input.durableLocalPersistGuarded && !input.ephemeralScratch) {
    return "INVALID_ON_VERCEL";
  }
  if (input.ephemeralScratch && !input.requiredForHqRender) return "EPHEMERAL_SAFE";
  if (input.requiredForHqRender) return "DURABLE_PRODUCTION_REQUIRED";
  return "LOCAL_DEV_ONLY";
}

export function auditHqServerlessFilesystemSites(cwd = process.cwd()): Array<{
  path: string;
  guarded: boolean;
  classification: HqServerlessFsWriteClass;
}> {
  return HQ_AUTHENTICATED_RENDER_FS_SITES.map((rel) => {
    const source = readFileSync(join(cwd, rel), "utf8");
    const guarded = source.includes("durableLocalPersistEnabled");
    return {
      path: rel,
      guarded,
      classification: classifyHqFilesystemWrite({
        requiredForHqRender: false,
        durableLocalPersistGuarded: guarded,
        ephemeralScratch: false,
      }),
    };
  });
}

export function evaluateHQServerlessFilesystemSafetyGate(input?: {
  cwd?: string;
  invalidOnVercelWrites?: number;
}): HqNamedGate {
  const sites = auditHqServerlessFilesystemSites(input?.cwd);
  const unguarded = sites.filter((row) => !row.guarded).map((row) => row.path);
  const invalid = input?.invalidOnVercelWrites ?? unguarded.length;
  return {
    gate: HQ_SERVERLESS_FILESYSTEM_SAFETY_GATE,
    result: invalid === 0 && unguarded.length === 0 ? "PASS" : "FAIL",
    reasons: unguarded.length
      ? unguarded.map((path) => `UNGUARDED_FS_WRITE:${path}`)
      : invalid > 0
        ? ["INVALID_ON_VERCEL_WRITES_REMAIN"]
        : ["NO_INVALID_VERCEL_FS_WRITES_ON_HQ_RENDER"],
  };
}
