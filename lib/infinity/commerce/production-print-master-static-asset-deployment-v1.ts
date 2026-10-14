import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { composeClubThrottleStorefrontFiles } from "./club-throttle-storefront-compose.ts";
import { composedFileInlineStringBytes } from "./composed-storefront-file-digest-v1.ts";
import { CLUB_THROTTLE_VERCEL_PROJECT_ID } from "./club-throttle-vercel-production-env-audit.ts";
import { CLUB_THROTTLE_STOREFRONT_PROJECT } from "./club-throttle-storefront-compose.ts";

export const PRODUCTION_PRINT_MASTER_STATIC_ASSET_DEPLOYMENT_V1 =
  "PRODUCTION_PRINT_MASTER_STATIC_ASSET_DEPLOYMENT_V1" as const;

export const STATIC_BINARY_DEPLOYMENT_PACKAGING_QC_V1 = "STATIC_BINARY_DEPLOYMENT_PACKAGING_QC_V1" as const;

const UNEXPECTED_DEPLOY_PREFIXES = [
  ".infinity/",
  "node_modules/",
  ".next/",
  ".git/",
] as const;

export function auditClubThrottleDeployPackage(cwd = process.cwd()): {
  DEPLOY_FILE_COUNT: number;
  DEPLOY_TOTAL_BYTES: number;
  LARGEST_DEPLOY_FILES: Array<{ path: string; bytes: number }>;
  UNEXPECTED_DEPLOY_PATHS: string[];
  BASE64_INLINED_BINARY_COUNT: number;
  SOURCE_ABS_BINARY_COUNT: number;
  PRODUCTION_MASTER_FILE_COUNT: number;
} {
  const composed = composeClubThrottleStorefrontFiles(cwd);
  let total = 0;
  const sizes: Array<{ path: string; bytes: number }> = [];
  let base64Bin = 0;
  let sourceAbsBin = 0;
  let productionMasters = 0;
  const unexpected: string[] = [];
  for (const file of composed.files) {
    const norm = file.path.replace(/\\/g, "/");
    for (const bad of UNEXPECTED_DEPLOY_PREFIXES) {
      if (norm.startsWith(bad) || norm.includes(`/${bad}`)) unexpected.push(norm);
    }
    if (file.sourceAbs) sourceAbsBin++;
    else if (file.encoding === "base64") base64Bin++;
    if (norm.includes("storefront-merch/production-masters/")) productionMasters++;
    const bytes = composedFileInlineStringBytes(file);
    total += bytes;
    sizes.push({ path: norm, bytes });
  }
  sizes.sort((a, b) => b.bytes - a.bytes);
  return {
    DEPLOY_FILE_COUNT: composed.files.length,
    DEPLOY_TOTAL_BYTES: total,
    LARGEST_DEPLOY_FILES: sizes.slice(0, 12),
    UNEXPECTED_DEPLOY_PATHS: [...new Set(unexpected)],
    BASE64_INLINED_BINARY_COUNT: base64Bin,
    SOURCE_ABS_BINARY_COUNT: sourceAbsBin,
    PRODUCTION_MASTER_FILE_COUNT: productionMasters,
  };
}

export function staticBinaryDeploymentPackagingQc(cwd = process.cwd()): "PASS" | "FAIL" {
  const audit = auditClubThrottleDeployPackage(cwd);
  if (audit.UNEXPECTED_DEPLOY_PATHS.length > 0) return "FAIL";
  if (audit.PRODUCTION_MASTER_FILE_COUNT < 19) return "FAIL";
  if (audit.SOURCE_ABS_BINARY_COUNT < audit.PRODUCTION_MASTER_FILE_COUNT) return "FAIL";
  return "PASS";
}

export function productionPrintMasterStaticAssetDeploymentQc(cwd = process.cwd()): "PASS" | "FAIL" {
  const mastersDir = join(cwd, "public/storefront-merch/production-masters");
  if (!existsSync(mastersDir)) return "FAIL";
  const pngs = readdirSync(mastersDir).filter((n) => n.endsWith(".png"));
  if (pngs.length < 19) return "FAIL";
  for (const name of pngs) {
    if (statSync(join(mastersDir, name)).size < 1024) return "FAIL";
  }
  return staticBinaryDeploymentPackagingQc(cwd) === "PASS" ? "PASS" : "FAIL";
}

export function clubThrottleDeployTargetMeta() {
  return {
    CLUB_THROTTLE_PRODUCTION_PROJECT: CLUB_THROTTLE_STOREFRONT_PROJECT,
    CLUB_THROTTLE_PRODUCTION_PROJECT_ID: CLUB_THROTTLE_VERCEL_PROJECT_ID,
    CLUB_THROTTLE_PRODUCTION_ALIAS: "clubthrottle.com",
  };
}
