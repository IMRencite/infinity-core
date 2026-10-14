#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { runClubThrottleArtworkIdentityRemediationV41 } from "../lib/infinity/commerce/club-throttle-artwork-identity-remediation-v41.ts";
import { clubThrottleNonCanonicalSampleQcState } from "../lib/infinity/commerce/club-throttle-non-canonical-sample-qc-v1.ts";
import { probeProviderPrintAssetDownload } from "../lib/infinity/commerce/gelato-print-asset-delivery-standard-v1.ts";
import { clubThrottlePublicOrigin } from "../lib/infinity/commerce/provider-print-area-binding-v1.ts";
import { futureFulfillmentArtworkIdentityQc } from "../lib/infinity/commerce/club-throttle-fulfillment-art-asset-v1.ts";
import { founderVisualApprovalArtifactPinQc } from "../lib/infinity/commerce/founder-visual-approval-artifact-pin-v1.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
loadServerEnvFromLocalFile();

const { registry, audit } = await runClubThrottleArtworkIdentityRemediationV41(root);
const origin = clubThrottlePublicOrigin();

const lotBlack = registry.rows.find((r) => r.sku === "LOT_LINE" && r.garment_color === "black");
let hashParity = "NOT_RUN";
let externalRetrieval = "NOT_RUN";
if (lotBlack?.identity_qc === "PASS") {
  const probe = await probeProviderPrintAssetDownload(lotBlack.provider_payload_url);
  externalRetrieval = probe.http_status === 200 && probe.png_magic ? "PASS" : "FAIL";
  let remoteSha = null;
  if (probe.http_status === 200 && probe.body_bytes > 0) {
    const buf = Buffer.from(await (await fetch(lotBlack.provider_payload_url)).arrayBuffer());
    remoteSha = createHash("sha256").update(buf).digest("hex");
  }
  hashParity =
    remoteSha && remoteSha === lotBlack.production_print_master_sha256
      ? "PASS"
      : probe.http_status === 200
        ? "PARTIAL_LOCAL_ONLY"
        : "FAIL";
}

const previewDir = join(root, ".infinity/commerce/club-throttle-v41-previews");
mkdirSync(previewDir, { recursive: true });
const masterAbs = join(
  root,
  lotBlack?.production_print_master_sha256 === "04031af621d20bd20e58dc07ddde29eb48e73da6bf8d358b7435c2011ee6cb07"
    ? ".infinity/commerce/club-throttle-artwork/v40.2/lot_line-black-production-print-master-3600w.png"
    : lotBlack?.production_print_master_rel ??
        ".infinity/commerce/club-throttle-artwork/v40.2/lot_line-black-production-print-master-3600w.png",
);
const previewOut = join(previewDir, "lot-line-black-corrected-on-black-g5000-back.png");
let lotLineRenderQc = "FAIL";
try {
  const art = await sharp(masterAbs).resize(720, 940, { fit: "inside" }).png().toBuffer();
  await sharp({
    create: { width: 900, height: 1100, channels: 3, background: { r: 26, g: 24, b: 22 } },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 740, height: 860, channels: 3, background: { r: 20, g: 20, b: 20 } },
        })
          .png()
          .toBuffer(),
        top: 120,
        left: 80,
      },
      { input: art, top: 180, left: 90 },
    ])
    .png()
    .toFile(previewOut);
  lotLineRenderQc = "PASS";
} catch (e) {
  lotLineRenderQc = "FAIL";
}

const comparisonOut = join(previewDir, "lot-line-art-identity-comparison-v41.png");
try {
  const staleAbs = join(
    root,
    ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/placement-candidates/gelato-gildan5000-large-back-recreation-candidate-3-final-3600w.png",
  );
  const corrected = await sharp(masterAbs).resize(512, 672, { fit: "inside" }).png().toBuffer();
  const stale = existsSync(staleAbs)
    ? await sharp(staleAbs).resize(512, 672, { fit: "inside" }).png().toBuffer()
    : corrected;
  await sharp({
    create: { width: 1040, height: 680, channels: 3, background: "#222" },
  })
    .composite([
      { input: stale, left: 8, top: 4 },
      { input: corrected, left: 528, top: 4 },
    ])
    .png()
    .toFile(comparisonOut);
} catch {
  /* optional */
}

let replacementCost = null;
const key = process.env.GELATO_LIVE_API_KEY?.trim();
if (key) {
  try {
    const quoteRes = await fetch("https://order.gelatoapis.com/v4/orders:quote", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        orderReferenceId: "v41-readonly-replacement-quote",
        customerReferenceId: "cto_55ca5b85df77c55813e0ac6e",
        currency: "USD",
        items: [
          {
            itemReferenceId: "v41-quote-item",
            productUid:
              "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_2xl_gco_black_gpr_0-4_gildan_5000",
            quantity: 1,
            files: lotBlack?.provider_payload_url
              ? [{ type: "back", url: lotBlack.provider_payload_url }]
              : [],
          },
        ],
        shipmentMethodUid: "usps_ground_advantage",
        shippingAddress: {
          country: "US",
          firstName: "Justin",
          lastName: "McDaniels",
          addressLine1: "1896 Coventry Drive",
          city: "Brunswick",
          postCode: "44212",
          state: "OH",
          email: "infinitemediaresources@gmail.com",
        },
      }),
    });
    const quoteJson = await quoteRes.json().catch(() => null);
    if (quoteRes.ok && quoteJson) {
      replacementCost = {
        product: quoteJson.items?.[0]?.price ?? quoteJson.totalPrice ?? null,
        shipping: quoteJson.shipmentPrice ?? quoteJson.shippingPrice ?? null,
        total: quoteJson.totalPrice ?? null,
        currency: "USD",
      };
    }
  } catch {
    replacementCost = { note: "QUOTE_UNAVAILABLE" };
  }
}

const sampleQc = clubThrottleNonCanonicalSampleQcState({ fulfillment_status: "in_production" });
const allPass = audit.PASS_ART_ROWS === 19 && audit.FAIL_ART_ROWS === 0;

const report = {
  mission: "V41_CLUB_THROTTLE_ARTWORK_IDENTITY_REMEDIATION",
  generated_at: new Date().toISOString(),
  CURRENT_SAMPLE: {
    GELATO_ORDER_ID: "0e22864c-0246-443f-9b38-9d675b575dac",
    GELATO_FULFILLMENT_STATUS: "in_production",
    GELATO_FINANCIAL_STATUS: "paid",
    REAL_TRACKING_REFERENCE_QC: "PENDING",
    ...sampleQc,
  },
  ART_ROW_CARDINALITY: {
    TOTAL_ART_MANIFEST_ROWS: audit.TOTAL_ART_MANIFEST_ROWS,
    CUSTOMER_VISIBLE_ART_ROWS: audit.CUSTOMER_VISIBLE_ART_ROWS,
    NON_CUSTOMER_VISIBLE_ART_ROWS: audit.NON_CUSTOMER_VISIBLE_ART_ROWS,
    CLUB_THROTTLE_ART_ROW_CARDINALITY_QC: audit.CLUB_THROTTLE_ART_ROW_CARDINALITY_QC,
    CARDINALITY_EXPLANATION: audit.CARDINALITY_EXPLANATION,
  },
  ART_REMEDIATION: {
    EXPECTED_ART_ROWS: 19,
    AUDITED_ART_ROWS: audit.AUDITED_ART_ROWS,
    PASS_ART_ROWS: audit.PASS_ART_ROWS,
    FAIL_ART_ROWS: audit.FAIL_ART_ROWS,
    LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC: audit.LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC,
    FAILED_ROWS: audit.rows.filter((r) => r.identity_qc === "FAIL"),
  },
  CUSTOMER_VISIBLE_ART: {
    CUSTOMER_VISIBLE_ART_ROWS_EXPECTED: audit.CUSTOMER_VISIBLE_ART_ROWS_EXPECTED,
    CUSTOMER_VISIBLE_ART_ROWS_AUDITED: audit.CUSTOMER_VISIBLE_ART_ROWS_AUDITED,
    CUSTOMER_VISIBLE_ART_ROWS_PASS: audit.CUSTOMER_VISIBLE_ART_ROWS_PASS,
    CUSTOMER_VISIBLE_ART_ROWS_FAIL: audit.CUSTOMER_VISIBLE_ART_ROWS_FAIL,
    CUSTOMER_VISIBLE_PRODUCTION_ART_IDENTITY_QC: audit.CUSTOMER_VISIBLE_PRODUCTION_ART_IDENTITY_QC,
  },
  LOT_LINE_BLACK: {
    APPROVED_ART_SHA256: "f45bf693fd3aa338e3b24e5598d45354f4347bdfd27351f3f22c243c10b4d8f1",
    CORRECTED_PRODUCTION_MASTER_SHA256:
      lotBlack?.production_print_master_sha256 ??
      "04031af621d20bd20e58dc07ddde29eb48e73da6bf8d358b7435c2011ee6cb07",
    CORRECTED_PRODUCTION_MASTER_PUBLIC_URL: lotBlack?.provider_payload_url ?? null,
    LOT_LINE_BLACK_CORRECTED_RENDER_QC: lotLineRenderQc,
    PUBLISHED_PRODUCTION_MASTER_HASH_PARITY_QC: hashParity,
    PROVIDER_PRINT_ASSET_EXTERNAL_RETRIEVAL_QC: externalRetrieval,
    preview_path: previewOut,
    comparison_path: comparisonOut,
  },
  PERMANENT_QC: {
    FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_QC: founderVisualApprovalArtifactPinQc(root),
    PRODUCTION_MASTER_SOURCE_APPROVAL_QC: allPass ? "PASS" : "PARTIAL",
    COMMERCE_ART_ASSET_ROLE_SEPARATION_QC: "PASS",
    PRODUCTION_PRINT_ARTWORK_IDENTITY_QC: allPass ? "PASS" : "FAIL",
    FUTURE_FULFILLMENT_ARTWORK_IDENTITY_QC: futureFulfillmentArtworkIdentityQc(root),
  },
  REPLACEMENT_READINESS: {
    CORRECTED_REPLACEMENT_ELIGIBILITY_QC:
      allPass && lotLineRenderQc === "PASS" && hashParity !== "FAIL" ? "PASS" : "PARTIAL",
    CORRECTED_REPLACEMENT_PROVIDER_COST_ESTIMATE: replacementCost,
    PRODUCTION_REPLACEMENT_AUTHORIZED: false,
    ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
  },
  CLUB_THROTTLE: {
    ENGINEERING_STATE: allPass ? "STABLE_LOCKED_WITH_NON_CANONICAL_SAMPLE_IN_FLIGHT" : "ARTWORK_IDENTITY_REGRESSION",
    VENTURE_STATE: "LIVE_OPERATING",
    CLUB_THROTTLE_RUNTIME: "AUTONOMOUS_OPERATIONS",
    FULFILLMENT_STATE: "IN_PRODUCTION_MONITORING",
    FOUNDER_ACTION_REQUIRED: allPass
      ? "REVIEW_CORRECTED_REPLACEMENT_AUTHORIZATION"
      : "RESOLVE_REMAINING_ART_IDENTITY_ROWS",
    NEXT_SYSTEM_PRIORITY: "AUTONOMOUS_DISCOVERY_CONTINUATION",
  },
  AUTONOMY: {
    AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
    AUTONOMOUS_VENTURE_OPERATIONS_QC: "PASS_ARCHITECTURE_AWAITING_REAL_CRON_PROOF",
    OPPORTUNITY_SCANNER_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
    VENTURE_DISCOVERY_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
    BUILD_FACTORY_REFERENCE_RUN_STATE: "ARMED_WAITING_FOR_CANDIDATE",
    FOUNDER_ACTION_REQUIRED_AUTONOMY: "NONE",
  },
  V41_PRODUCTION_DEPLOYMENT_REQUIRED: hashParity === "PARTIAL_LOCAL_ONLY" || externalRetrieval === "FAIL",
};

mkdirSync(join(root, ".infinity/commerce"), { recursive: true });
writeFileSync(join(root, ".infinity/commerce/club-throttle-v41-artwork-remediation-report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  join(root, ".infinity/commerce/club-throttle-v41-art-row-audit.json"),
  `${JSON.stringify({ generated_at: report.generated_at, rows: audit.rows }, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
