#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => (existsSync(join(root, rel)) ? JSON.parse(readFileSync(join(root, rel), "utf8")) : {});

const deploy = read(".infinity/commerce/club-throttle-v41.1-production-art-deploy-report.json");
const live = read(".infinity/commerce/club-throttle-v41.1-live-art-verification-report.json");

const report = {
  mission: "V41.1_CLUB_THROTTLE_PRODUCTION_ART_ASSET_DEPLOYMENT",
  generated_at: new Date().toISOString(),
  DEPLOY_FAILURE: {
    V41_DEPLOY_FAILURE_ROOT_CAUSE: deploy.V41_DEPLOY_FAILURE_ROOT_CAUSE,
    DEPLOY_FILE_COUNT: deploy.DEPLOY_FILE_COUNT,
    DEPLOY_TOTAL_BYTES: deploy.DEPLOY_TOTAL_BYTES,
    LARGEST_DEPLOY_FILES: deploy.LARGEST_DEPLOY_FILES,
    UNEXPECTED_DEPLOY_PATHS: deploy.UNEXPECTED_DEPLOY_PATHS,
    PRODUCTION_PRINT_MASTER_STATIC_ASSET_DEPLOYMENT_QC: deploy.PRODUCTION_PRINT_MASTER_STATIC_ASSET_DEPLOYMENT_QC,
    STATIC_BINARY_DEPLOYMENT_PACKAGING_QC: deploy.STATIC_BINARY_DEPLOYMENT_PACKAGING_QC,
    LARGE_STATIC_ASSET_DEPLOYMENT_QC: deploy.LARGE_STATIC_ASSET_DEPLOYMENT_QC,
  },
  CLUB_THROTTLE_DEPLOYMENT: {
    CLUB_THROTTLE_PRODUCTION_PROJECT: deploy.CLUB_THROTTLE_PRODUCTION_PROJECT,
    CLUB_THROTTLE_PRODUCTION_ALIAS: deploy.CLUB_THROTTLE_PRODUCTION_ALIAS,
    CLUB_THROTTLE_DEPLOY_TARGET_QC: deploy.CLUB_THROTTLE_DEPLOY_TARGET_QC,
    V41_1_PRODUCTION_DEPLOYMENT_ID: deploy.V41_1_PRODUCTION_DEPLOYMENT_ID,
    V41_1_PRODUCTION_DEPLOYMENT_QC: deploy.V41_1_PRODUCTION_DEPLOYMENT_QC,
    CLUB_THROTTLE_PRODUCTION_ALIAS_PARITY_QC: live.CLUB_THROTTLE_PRODUCTION_ALIAS_PARITY_QC,
  },
  ...live,
};

writeFileSync(join(root, ".infinity/commerce/club-throttle-v41.1-final-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
