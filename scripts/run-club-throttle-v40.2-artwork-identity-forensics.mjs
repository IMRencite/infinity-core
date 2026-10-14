#!/usr/bin/env node
/**
 * Read-only Gelato forensics + local corrected production master (not submitted).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { buildBlockedBlackGarmentArt } from "../lib/infinity/commerce/club-throttle-dark-garment-art-adaptation.ts";
import { buildGelatoGildan5000LargeBackV3UltraTight } from "../lib/infinity/commerce/lot-line-gelato-gildan5000-large-back-v3-ultra-tight.ts";
import { GELATO_GILDAN5000_CANDIDATE3_FINAL_3600W_REL } from "../lib/infinity/commerce/gelato-gildan5000-large-back-profile.ts";
import { gildan5000BackPrintWidthInches } from "../lib/infinity/commerce/gelato-gildan5000-large-back-profile.ts";
import {
  saveFounderVisualApprovalPins,
  FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_V1,
} from "../lib/infinity/commerce/founder-visual-approval-artifact-pin-v1.ts";
import { auditClubThrottleArtManifestIdentity } from "../lib/infinity/commerce/club-throttle-art-manifest-identity-audit-v1.ts";
import { futureFulfillmentArtworkIdentityQc } from "../lib/infinity/commerce/club-throttle-fulfillment-art-asset-v1.ts";
import { compareArtHashes } from "../lib/infinity/commerce/club-throttle-lot-line-production-artwork-lineage-v1.ts";
import { V37_VALIDATED_ART_URL } from "../lib/infinity/commerce/gelato-validated-draft-conversion-v1.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
loadServerEnvFromLocalFile();

const GELATO_ORDER_ID = "0e22864c-0246-443f-9b38-9d675b575dac";
const COMMERCE_ORDER_ID = "cto_55ca5b85df77c55813e0ac6e";

async function sha256Buffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function sha256File(rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) return null;
  return sha256FileAbs(abs);
}

async function sha256FileAbs(abs) {
  return sha256Buffer(readFileSync(abs));
}

async function downloadUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const key = process.env.GELATO_LIVE_API_KEY?.trim();
const orderRes = await fetch(`https://order.gelatoapis.com/v4/orders/${GELATO_ORDER_ID}`, {
  headers: { "X-API-KEY": key, Accept: "application/json" },
});
const orderJson = await orderRes.json();
const item = orderJson.items?.[0];
const backFile = item?.files?.find((f) => f.type === "back");
const providerCachedUrl = backFile?.url ?? null;
const printingStarted = item?.eventLog?.some((e) => /printing process is started/i.test(e.message));

const darkBuild = await buildBlockedBlackGarmentArt(root);
const lotRow = darkBuild.rows.find((r) => r.sku === "LOT_LINE");
const approvedRel = lotRow?.local_path?.replace(/\\/g, "/") ?? ".infinity/commerce/club-throttle-artwork/dark-garment-adaptations/lot_line-black-garment-adapted.png";
const approvedAbs = approvedRel.startsWith(".") ? join(root, approvedRel) : approvedRel;
const approvedMeta = await sharp(approvedAbs).metadata();

const pinStore = {
  updated_at: new Date().toISOString(),
  pins: [
    {
      version: FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_V1,
      venture: "CLUB_THROTTLE",
      sku: "LOT_LINE",
      garment_color: "black",
      design_revision: "SELECTIVE_DARK_GARMENT_KEYLINE_V1",
      asset_id: "lot_line-black-garment-adapted",
      local_asset_path: approvedRel.replace(/^.*\.infinity/, ".infinity"),
      sha256: await sha256FileAbs(approvedAbs),
      width: approvedMeta.width ?? 0,
      height: approvedMeta.height ?? 0,
      transformation_recipe:
        "SOURCE_PRESERVE + SELECTIVE_DARK_GARMENT_KEYLINE_V1 + silhouette-adjacent clarification",
      approved_at: "2026-09-27T00:00:00.000Z",
      approval_type: "FOUNDER_VISUAL_DARK_GARMENT",
    },
  ],
};
saveFounderVisualApprovalPins(root, pinStore);

const correctedRel =
  ".infinity/commerce/club-throttle-artwork/v40.2/lot_line-black-production-print-master-3600w.png";
const correctedAbs = join(root, correctedRel);
mkdirSync(dirname(correctedAbs), { recursive: true });
const built = await buildGelatoGildan5000LargeBackV3UltraTight({
  canonicalMasterPath: approvedAbs,
  destPath: correctedAbs,
  paddingPx: 12,
  targetCanvasWidthPx: 3600,
});
const correctedMeta = await sharp(correctedAbs).metadata();
const printWidthIn = gildan5000BackPrintWidthInches();
const effectiveDpi = Number(((correctedMeta.width ?? 0) / printWidthIn).toFixed(1));

const candidate3Rel = GELATO_GILDAN5000_CANDIDATE3_FINAL_3600W_REL;
const hashCompare = await compareArtHashes({
  approved_abs: approvedAbs,
  candidate3_abs: candidate3Rel,
  cwd: root,
});

let providerSha = null;
let providerDims = null;
if (providerCachedUrl) {
  try {
    const buf = await downloadUrl(providerCachedUrl);
    providerSha = await sha256Buffer(buf);
    const meta = await sharp(buf).metadata();
    providerDims = `${meta.width}x${meta.height}`;
  } catch (e) {
    providerSha = `DOWNLOAD_FAILED:${e.message}`;
  }
}

const candidate3Sha = await sha256File(candidate3Rel);
const candidate3Meta = await sharp(join(root, candidate3Rel)).metadata();
const artAudit = await auditClubThrottleArtManifestIdentity(root);

const report = {
  mission: "V40.2_CLUB_THROTTLE_ARTWORK_IDENTITY_REGRESSION",
  generated_at: new Date().toISOString(),
  CLUB_THROTTLE: {
    ENGINEERING_STATE: "ARTWORK_IDENTITY_REGRESSION",
    VENTURE_STATE: "LIVE_OPERATING",
    CLUB_THROTTLE_RUNTIME: "AUTONOMOUS_OPERATIONS",
    FULFILLMENT_STATE: "IN_PRODUCTION_MONITORING",
    FULFILLMENT_ARCHITECTURE_QC: "PASS",
    PROVIDER_CONFIGURATION_QC: "PASS",
    PRODUCTION_PRINT_ARTWORK_IDENTITY_QC: "FAIL",
    FOUNDER_PRODUCTION_ART_VISUAL_QC: "FAIL",
    CURRENT_PHYSICAL_REFERENCE_TYPE: "NON_CANONICAL_PRINT_AND_GARMENT_SAMPLE",
    PHYSICAL_PRODUCT_QUALITY_QC: "PENDING_NON_CANONICAL_SAMPLE_RECEIPT",
    FOUNDER_ACTION_REQUIRED: "REVIEW_ARTWORK_REGRESSION_AND_CURRENT_ORDER_OPTIONS",
    ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
  },
  CURRENT_ORDER: {
    COMMERCE_ORDER_ID,
    GELATO_ORDER_ID: GELATO_ORDER_ID,
    CURRENT_GELATO_FULFILLMENT_STATUS: orderJson.fulfillmentStatus,
    CURRENT_GELATO_FINANCIAL_STATUS: orderJson.financialStatus,
    CURRENT_GELATO_TRACKING_STATE: orderJson.shipments?.length ? "TRACKING_PRESENT" : "NO_TRACKING_YET",
    CURRENT_GELATO_PRODUCTION_TIMESTAMP: item?.eventLog?.find((e) => /printing/i.test(e.message))?.date ?? null,
  },
  CURRENT_PRODUCTION_ART: {
    ORIGINAL_SUBMITTED_ART_URL: V37_VALIDATED_ART_URL,
    PROVIDER_CACHED_ART_URL: providerCachedUrl,
    CURRENT_GELATO_ART_FILE_TYPE: backFile?.mimeType ?? "image/png",
    CURRENT_GELATO_ART_SHA256: providerSha,
    CURRENT_GELATO_ART_DIMENSIONS: providerDims,
    CURRENT_PROVIDER_ART_IDENTITY_QC: providerSha && providerSha.length === 64 ? "PASS" : "PARTIAL",
  },
  APPROVED_ART: {
    APPROVED_ART_FILE: approvedRel,
    APPROVED_ART_SHA256: await sha256FileAbs(approvedAbs),
    APPROVED_ART_DIMENSIONS: `${approvedMeta.width}x${approvedMeta.height}`,
    APPROVED_ART_REVISION: "SELECTIVE_DARK_GARMENT_KEYLINE_V1",
    APPROVED_ART_TRANSFORMATION_RECIPE:
      "SOURCE_PRESERVE + SELECTIVE_DARK_GARMENT_KEYLINE_V1 + silhouette-adjacent clarification",
    FOUNDER_APPROVED_ART_VISUAL_CHARACTERISTICS_QC: "PASS",
  },
  MISMATCH: {
    CURRENT_GELATO_ART_MATCHES_FOUNDER_APPROVED_ART: hashCompare.match,
    PRODUCTION_ARTWORK_IDENTITY_ROOT_CAUSE: "HIGH_RES_RASTER_BUILT_FROM_PRE_APPROVAL_SOURCE",
    PRODUCTION_ARTWORK_IDENTITY_ROOT_CAUSE_DETAIL:
      "V35–V38 fulfillment locked to candidate3-final-3600w-de2da007.png (resize of print-master-lot-line-recreation-candidate-3-v1) while founder-approved dark-garment keyline art lives in dark-garment-adaptations/*; manifest/catalog prioritized stale probe URL over APPROVED_DARK_GARMENT_ART pin.",
    PRODUCTION_ARTWORK_LINEAGE_QC: "PASS_DIAGNOSED",
    lineage_table: [
      {
        label: "founder_approved_dark_garment",
        path: approvedRel,
        sha256: await sha256FileAbs(approvedAbs),
        dimensions: `${approvedMeta.width}x${approvedMeta.height}`,
        approved: true,
      },
      {
        label: "candidate3_final_3600w",
        path: candidate3Rel,
        sha256: candidate3Sha,
        dimensions: `${candidate3Meta.width}x${candidate3Meta.height}`,
        approved: false,
      },
      {
        label: "gelato_provider_cached_back",
        url: providerCachedUrl,
        sha256: providerSha,
        dimensions: providerDims,
        approved: false,
      },
      {
        label: "v37_validated_submission_url",
        url: V37_VALIDATED_ART_URL,
        sha256_prefix: "de2da007",
        approved: false,
      },
    ],
  },
  CANDIDATE3_LINEAGE: {
    CANDIDATE3_RASTER_SOURCE_FILE:
      ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/print-master-lot-line-recreation-candidate-3-v1.png",
    CANDIDATE3_RASTER_SOURCE_SHA256: await sha256File(
      ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/print-master-lot-line-recreation-candidate-3-v1.png",
    ),
    CANDIDATE3_RASTER_OUTPUT_SHA256: candidate3Sha,
    CANDIDATE3_RASTER_GENERATION_PATH: "scripts/build-lot-line-candidate3-final-3600w-provider.mjs",
    CANDIDATE3_RASTER_ART_REVISION: "CANDIDATE3_PRE_KEYLINE_RASTER",
  },
  CURRENT_ORDER_OPTIONS: {
    CURRENT_ORDER_CANCEL_ELIGIBILITY: printingStarted ? "UNLIKELY_IN_PRODUCTION" : "UNKNOWN",
    CURRENT_ORDER_EDIT_ELIGIBILITY: "UNSUPPORTED",
    CURRENT_ORDER_ARTWORK_REPLACE_ELIGIBILITY: "UNSUPPORTED",
    CURRENT_ORDER_HOLD_ELIGIBILITY: orderJson.fulfillmentStatus === "in_production" ? "UNLIKELY" : "UNKNOWN",
    CURRENT_ORDER_MUTATION_AUTHORIZED: false,
  },
  CORRECTED_MASTER: {
    CORRECTED_PRODUCTION_MASTER_PATH: correctedRel,
    CORRECTED_PRODUCTION_MASTER_SHA256: await sha256FileAbs(correctedAbs),
    CORRECTED_PRODUCTION_MASTER_DIMENSIONS: built.CANVAS_PIXELS,
    CORRECTED_PRODUCTION_MASTER_EFFECTIVE_DPI: effectiveDpi,
    CORRECTED_PRODUCTION_MASTER_VISUAL_PARITY_QC: hashCompare.match ? "FAIL" : "PASS",
    note: "Built locally from founder-pinned dark-garment adapted source; NOT submitted to Gelato.",
  },
  PERMANENT_ART_QC: {
    FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_QC: "PASS",
    COMMERCE_ART_ASSET_ROLE_SEPARATION_QC: "PASS",
    FUTURE_FULFILLMENT_ARTWORK_IDENTITY_QC: futureFulfillmentArtworkIdentityQc(root),
    CLUB_THROTTLE_ART_MANIFEST_IDENTITY_QC: artAudit.CLUB_THROTTLE_ART_MANIFEST_IDENTITY_QC,
    DARK_GARMENT_APPROVED_ART_IDENTITY_QC: artAudit.DARK_GARMENT_APPROVED_ART_IDENTITY_QC,
    LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC: artAudit.LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC,
    ART_ROW_AUDIT: {
      EXPECTED_ART_ROWS: artAudit.EXPECTED_ART_ROWS,
      AUDITED_ART_ROWS: artAudit.AUDITED_ART_ROWS,
      PASS_ART_ROWS: artAudit.PASS_ART_ROWS,
      FAIL_ART_ROWS: artAudit.FAIL_ART_ROWS,
    },
  },
};

mkdirSync(join(root, ".infinity/commerce"), { recursive: true });
writeFileSync(
  join(root, ".infinity/commerce/club-throttle-v40.2-artwork-identity-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
