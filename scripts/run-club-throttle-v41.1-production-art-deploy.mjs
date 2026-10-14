#!/usr/bin/env node
/**
 * V41.1 — publish pinned production print masters to clubthrottle.com (no Gelato/Stripe/email).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { composeClubThrottleStorefrontFiles } from "../lib/infinity/commerce/club-throttle-storefront-compose.ts";
import { digestComposedStorefrontFiles } from "../lib/infinity/commerce/composed-storefront-file-digest-v1.ts";
import { executeClubThrottleProductionDeployment } from "../lib/infinity/commerce/club-throttle-deployment.ts";
import {
  auditClubThrottleDeployPackage,
  clubThrottleDeployTargetMeta,
  productionPrintMasterStaticAssetDeploymentQc,
  staticBinaryDeploymentPackagingQc,
} from "../lib/infinity/commerce/production-print-master-static-asset-deployment-v1.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
loadServerEnvFromLocalFile();
reloadVercelFromLocalFile();

const V41_DEPLOY_FAILURE_ROOT_CAUSE =
  "COMPOSE_DIGEST_CONCATENATED_ALL_FILE_CONTENTS: digestComposedStorefrontFiles used merged.map((f) => f.path + f.content).join() which materialized every base64 PNG into one V8 string (>512MB), throwing Invalid string length; secondary risk was appendPublicPngTree inlining large binaries as base64 strings.";

let composeOk = false;
try {
  const composed = composeClubThrottleStorefrontFiles(root);
  digestComposedStorefrontFiles(composed.files);
  composeOk = true;
} catch (e) {
  console.error(JSON.stringify({ ok: false, compose_error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
}

const pkgAudit = auditClubThrottleDeployPackage(root);
const target = clubThrottleDeployTargetMeta();

const deploy = await executeClubThrottleProductionDeployment({
  deploy: true,
  persistEvidence: true,
  aliasProduction: true,
  enforceBacklogDeployGuard: false,
  rebuildDarkGarmentArt: false,
  pollAttempts: 90,
  pollDelayMs: 8000,
});

const report = {
  mission: "V41.1_CLUB_THROTTLE_PRODUCTION_ART_ASSET_DEPLOYMENT",
  generated_at: new Date().toISOString(),
  V41_DEPLOY_FAILURE_ROOT_CAUSE,
  compose_precheck: composeOk ? "PASS" : "FAIL",
  DEPLOY_FILE_COUNT: pkgAudit.DEPLOY_FILE_COUNT,
  DEPLOY_TOTAL_BYTES: pkgAudit.DEPLOY_TOTAL_BYTES,
  LARGEST_DEPLOY_FILES: pkgAudit.LARGEST_DEPLOY_FILES,
  UNEXPECTED_DEPLOY_PATHS: pkgAudit.UNEXPECTED_DEPLOY_PATHS,
  BASE64_INLINED_BINARY_COUNT: pkgAudit.BASE64_INLINED_BINARY_COUNT,
  SOURCE_ABS_BINARY_COUNT: pkgAudit.SOURCE_ABS_BINARY_COUNT,
  PRODUCTION_PRINT_MASTER_STATIC_ASSET_DEPLOYMENT_QC: productionPrintMasterStaticAssetDeploymentQc(root),
  STATIC_BINARY_DEPLOYMENT_PACKAGING_QC: staticBinaryDeploymentPackagingQc(root),
  LARGE_STATIC_ASSET_DEPLOYMENT_QC: composeOk ? "PASS" : "FAIL",
  CLUB_THROTTLE_PRODUCTION_PROJECT: target.CLUB_THROTTLE_PRODUCTION_PROJECT,
  CLUB_THROTTLE_PRODUCTION_PROJECT_ID: target.CLUB_THROTTLE_PRODUCTION_PROJECT_ID,
  CLUB_THROTTLE_PRODUCTION_ALIAS: target.CLUB_THROTTLE_PRODUCTION_ALIAS,
  CLUB_THROTTLE_DEPLOY_TARGET_QC: target.CLUB_THROTTLE_PRODUCTION_PROJECT === "club-throttle" ? "PASS" : "FAIL",
  V41_1_PRODUCTION_DEPLOYMENT_ID: deploy.evidence.deployment_id ?? null,
  V41_1_PRODUCTION_DEPLOYMENT_QC: deploy.deployed ? "PASS" : "FAIL",
  deployment_url: deploy.deploymentUrl,
  safe_error: deploy.safeError,
};

mkdirSync(join(root, ".infinity/commerce"), { recursive: true });
writeFileSync(join(root, ".infinity/commerce/club-throttle-v41.1-production-art-deploy-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(deploy.deployed ? 0 : 1);
