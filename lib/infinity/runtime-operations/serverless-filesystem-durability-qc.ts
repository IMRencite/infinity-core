import { readFileSync } from "node:fs";
import { join } from "node:path";
import { durableLocalPersistEnabled, isServerlessEphemeralFilesystem } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";

export const SERVERLESS_FILESYSTEM_DURABILITY_QC = "SERVERLESS_FILESYSTEM_DURABILITY_QC" as const;

const PRODUCTION_ROUTE_FS_SITES = [
  "lib/infinity/growth-engine/occupancynpv-experiment.ts",
  "app/api/runtime/venture-operating-cycle/route.ts",
  "lib/infinity/venture-discovery/venture-candidate-validation-queue-v1.ts",
] as const;

export const SERVERLESS_RUNTIME_LOCAL_PERSISTENCE_GUARD_V1 =
  "SERVERLESS_RUNTIME_LOCAL_PERSISTENCE_GUARD_V1" as const;

export function evaluateServerlessFilesystemDurabilityQc(cwd = process.cwd()): {
  SERVERLESS_FILESYSTEM_DURABILITY_QC: "PASS" | "FAIL";
  SERVERLESS_RUNTIME_LOCAL_PERSISTENCE_GUARD_QC: "PASS" | "FAIL";
  ephemeral_runtime: boolean;
  durable_local_persist_enabled: boolean;
  rows: Array<{ path: string; guarded: boolean; blind_mkdir_write: boolean }>;
} {
  const rows = PRODUCTION_ROUTE_FS_SITES.map((rel) => {
    const source = readFileSync(join(cwd, rel), "utf8");
    const guarded =
      source.includes("durableLocalPersistEnabled") ||
      source.includes("writeLocalJsonIfDurable") ||
      source.includes("persist: false") ||
      source.includes("persist:false");
    const blind_mkdir_write =
      /mkdirSync\s*\(/.test(source) && !guarded && /writeFileSync\s*\(/.test(source);
    return { path: rel, guarded, blind_mkdir_write };
  });
  const fail = rows.some((r) => r.blind_mkdir_write);
  return {
    SERVERLESS_FILESYSTEM_DURABILITY_QC: fail ? "FAIL" : "PASS",
    SERVERLESS_RUNTIME_LOCAL_PERSISTENCE_GUARD_QC: fail ? "FAIL" : "PASS",
    ephemeral_runtime: isServerlessEphemeralFilesystem(),
    durable_local_persist_enabled: durableLocalPersistEnabled(),
    rows,
  };
}
