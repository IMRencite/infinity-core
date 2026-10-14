#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { VercelDomainBindingAdapter } from "../lib/infinity/commercialization/providers/vercel/domain-binding-adapter.ts";
import { auditLiveProductionArtRegistryV41, fetchProductionMasterLiveProof } from "../lib/infinity/commerce/club-throttle-live-production-art-audit-v41.ts";
import { loadProductionArtRegistryV41 } from "../lib/infinity/commerce/club-throttle-production-print-master-publisher-v1.ts";
import { resolveClubThrottleFulfillmentPrintAssetUrl } from "../lib/infinity/commerce/club-throttle-fulfillment-art-asset-v1.ts";
import { clubThrottleNonCanonicalSampleQcState } from "../lib/infinity/commerce/club-throttle-non-canonical-sample-qc-v1.ts";
import { founderVisualApprovalArtifactPinQc } from "../lib/infinity/commerce/founder-visual-approval-artifact-pin-v1.ts";
import { futureFulfillmentArtworkIdentityQc } from "../lib/infinity/commerce/club-throttle-fulfillment-art-asset-v1.ts";
import { quoteGelatoRealDestination } from "../lib/infinity/commerce/gelato-real-destination-quote-v1.ts";

const LOT_BLACK_SHA = "04031af621d20bd20e58dc07ddde29eb48e73da6bf8d358b7435c2011ee6cb07";
const APPROVED_SHA = "f45bf693fd3aa338e3b24e5598d45354f4347bdfd27351f3f22c243c10b4d8f1";
const STALE_SHA = "de2da0075ce0667642af65d8a89c520ac12b2d32566440d39f4a8e560148a751";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
loadServerEnvFromLocalFile();
reloadVercelFromLocalFile();

const deployReportPath = join(root, ".infinity/commerce/club-throttle-v41.1-production-art-deploy-report.json");
const deployReport = existsSync(deployReportPath)
  ? JSON.parse(readFileSync(deployReportPath, "utf8"))
  : {};

const deployId =
  deployReport.V41_1_PRODUCTION_DEPLOYMENT_ID ??
  (existsSync(join(root, ".infinity/blog-os/v52-club-throttle-production-deploy.json"))
    ? JSON.parse(readFileSync(join(root, ".infinity/blog-os/v52-club-throttle-production-deploy.json"), "utf8")).deployment_id
    : null);

const vercel = new VercelDomainBindingAdapter();
const aliasProbe = await vercel.getAlias("clubthrottle.com");
const aliasParity =
  deployId && aliasProbe.deploymentId && aliasProbe.deploymentId === deployId ? "PASS" : aliasProbe.deploymentId ? "PARTIAL" : "FAIL";

const liveAuditAll = await auditLiveProductionArtRegistryV41(root);
const registry = loadProductionArtRegistryV41(root);
const manifestPath = join(root, ".infinity/commerce/club-throttle-storefront-merch-manifest.json");
const manifestKeys = new Set(
  (existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8")).color_merch_rows ?? []
    : []
  ).map((r) => `${r.sku}|${r.garment_color}`.toLowerCase()),
);
const liveAudit = {
  ...liveAuditAll,
  rows: liveAuditAll.rows.filter((r) => manifestKeys.has(`${r.sku}|${r.garment_color}`.toLowerCase())),
};
liveAudit.PASS_ART_ROWS = liveAudit.rows.filter((r) => r.identity_qc === "PASS").length;
liveAudit.FAIL_ART_ROWS = liveAudit.rows.length - liveAudit.PASS_ART_ROWS;
liveAudit.ALL_PRODUCTION_MASTER_EXTERNAL_RETRIEVAL_QC =
  liveAudit.PASS_ART_ROWS === liveAudit.rows.length && liveAudit.rows.length === 19 ? "PASS" : liveAuditAll.ALL_PRODUCTION_MASTER_EXTERNAL_RETRIEVAL_QC;
const matrixPath = join(root, ".infinity/commerce/club-throttle-cart-variant-transaction-qc-v10.json");
const matrix = existsSync(matrixPath)
  ? JSON.parse(readFileSync(matrixPath, "utf8")).LIVE_COLOR_MATRIX ?? {}
  : {};

const cvExpected = Object.entries(matrix).flatMap(([sku, colors]) => colors.map((c) => ({ sku, c })));
const cvResults = cvExpected.map(({ sku, c }) => {
  const row = liveAuditAll.rows.find((r) => r.sku === sku && r.garment_color === c);
  return row ?? { sku, garment_color: c, identity_qc: "FAIL", failure_reason: "MISSING" };
});
const cvPass = cvResults.filter((r) => r.identity_qc === "PASS").length;

const darkRows = liveAudit.rows.filter((r) => {
  const reg = registry?.rows.find((x) => x.sku === r.sku && x.garment_color === r.garment_color);
  return reg?.garment_class === "dark";
});
const darkPass = darkRows.every((r) => r.identity_qc === "PASS" && r.live_sha256 !== STALE_SHA);

const lotUrl =
  "https://clubthrottle.com/storefront-merch/production-masters/lot_line-black-production-print-master-3600w.png";
const lotProof = await fetchProductionMasterLiveProof(lotUrl);

const dryResolve = resolveClubThrottleFulfillmentPrintAssetUrl({
  sku: "LOT_LINE",
  garment_color: "black",
  cwd: root,
});
let drySha = null;
if (dryResolve.ok) {
  const p = await fetchProductionMasterLiveProof(dryResolve.url);
  drySha = p.sha256;
}

const staleReach =
  dryResolve.ok &&
  !dryResolve.url.includes("candidate3-final-3600w") &&
  drySha !== STALE_SHA &&
  drySha === LOT_BLACK_SHA
    ? "PASS"
    : "FAIL";

let lotLineLiveRenderQc = "FAIL";
const previewDir = join(root, ".infinity/commerce/club-throttle-v41.1-previews");
mkdirSync(previewDir, { recursive: true });
const previewOut = join(previewDir, "lot-line-black-live-master-on-black-g5000-back.png");
try {
  if (lotProof.http_status === 200 && lotProof.sha256) {
    const res = await fetch(lotUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    const art = await sharp(buf).resize(720, 940, { fit: "inside" }).png().toBuffer();
    await sharp({
      create: { width: 900, height: 1100, channels: 3, background: { r: 26, g: 24, b: 22 } },
    })
      .composite([{ input: art, top: 180, left: 90 }])
      .png()
      .toFile(previewOut);
    lotLineLiveRenderQc = "PASS";
  }
} catch {
  lotLineLiveRenderQc = "FAIL";
}

let replacementCost = null;
if (lotProof.sha256 === LOT_BLACK_SHA) {
  const quote = await quoteGelatoRealDestination({
    orderReferenceId: "v41.1-readonly-replacement-quote",
    customerReferenceId: "cto_55ca5b85df77c55813e0ac6e",
    productUid:
      "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_2xl_gco_black_gpr_0-4_gildan_5000",
    itemReferenceId: "v41.1-quote-item",
    quantity: 1,
    artworkUrl: lotUrl,
    recipient: {
      country: "US",
      firstName: "Justin",
      lastName: "McDaniels",
      addressLine1: "1896 Coventry Drive",
      city: "Brunswick",
      postCode: "44212",
      state: "OH",
      email: "infinitemediaresources@gmail.com",
    },
  });
  if (quote.ok) {
    const product = quote.products[0]?.price ?? null;
    const ship = quote.shipment_methods.find((m) => m.shipmentMethodUid === "usps_ground_advantage") ?? quote.shipment_methods[0];
    replacementCost = {
      CORRECTED_REPLACEMENT_PRODUCT_COST: product,
      CORRECTED_REPLACEMENT_SHIPPING_COST: ship?.price ?? null,
      CORRECTED_REPLACEMENT_PROVIDER_TAX_ESTIMATE: null,
      CORRECTED_REPLACEMENT_PROVIDER_COST_ESTIMATE:
        product != null && ship?.price != null ? Number((product + ship.price).toFixed(2)) : null,
      CORRECTED_REPLACEMENT_DELIVERY_WINDOW: ship
        ? `${ship.minDeliveryDays ?? "?"}-${ship.maxDeliveryDays ?? "?"} days`
        : null,
    };
  } else {
    replacementCost = { quote_http: quote.http_status, safe_error: quote.safe_error, note: "QUOTE_UNAVAILABLE" };
  }
}

const chainQc =
  lotProof.sha256 === LOT_BLACK_SHA && lotProof.sha256 === drySha ? "PASS" : lotProof.sha256 === LOT_BLACK_SHA ? "PARTIAL" : "FAIL";

const allGatesPass =
  liveAudit.rows.length === 19 &&
  liveAudit.PASS_ART_ROWS === 19 &&
  cvPass === 17 &&
  darkPass &&
  staleReach === "PASS" &&
  lotProof.sha256 === LOT_BLACK_SHA &&
  aliasParity === "PASS" &&
  futureFulfillmentArtworkIdentityQc(root) === "PASS" &&
  founderVisualApprovalArtifactPinQc(root) === "PASS";

const report = {
  mission: "V41.1_CLUB_THROTTLE_LIVE_ART_VERIFICATION",
  generated_at: new Date().toISOString(),
  CLUB_THROTTLE_PRODUCTION_ALIAS_PARITY_QC: aliasParity,
  alias_deployment_id: aliasProbe.deploymentId,
  expected_deployment_id: deployId,
  LOT_LINE_BLACK: {
    CORRECTED_PRODUCTION_MASTER_PUBLIC_URL: lotUrl,
    PUBLISHED_PRODUCTION_MASTER_HASH_PARITY_QC: lotProof.sha256 === LOT_BLACK_SHA ? "PASS" : "FAIL",
    PROVIDER_PRINT_ASSET_EXTERNAL_RETRIEVAL_QC: lotProof.http_status === 200 ? "PASS" : "FAIL",
    PRODUCTION_MASTER_PUBLIC_URL_STABILITY_QC: lotUrl.startsWith("https://clubthrottle.com/") ? "PASS" : "FAIL",
    LOT_LINE_BLACK_LIVE_MASTER_RENDER_QC: lotLineLiveRenderQc,
    PRODUCTION_ARTWORK_IDENTITY_CHAIN_QC: chainQc,
    live_dimensions: `${lotProof.width}x${lotProof.height}`,
    live_sha256: lotProof.sha256,
    APPROVED_ART_SHA256: APPROVED_SHA,
  },
  FULL_ART_MATRIX: {
    EXPECTED_ART_ROWS: 19,
    AUDITED_ART_ROWS: liveAudit.rows.length,
    PASS_ART_ROWS: liveAudit.PASS_ART_ROWS,
    FAIL_ART_ROWS: liveAudit.FAIL_ART_ROWS,
    LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC:
      liveAudit.rows.length === 19 && liveAudit.PASS_ART_ROWS === 19 ? "PASS" : liveAudit.PASS_ART_ROWS > 0 ? "PARTIAL" : "FAIL",
    ALL_PRODUCTION_MASTER_EXTERNAL_RETRIEVAL_QC: liveAudit.ALL_PRODUCTION_MASTER_EXTERNAL_RETRIEVAL_QC,
  },
  CUSTOMER_VISIBLE: {
    CUSTOMER_VISIBLE_ART_ROWS_EXPECTED: 17,
    CUSTOMER_VISIBLE_ART_ROWS_AUDITED: cvExpected.length,
    CUSTOMER_VISIBLE_ART_ROWS_PASS: cvPass,
    CUSTOMER_VISIBLE_ART_ROWS_FAIL: cvExpected.length - cvPass,
    CUSTOMER_VISIBLE_PRODUCTION_ART_IDENTITY_QC: cvPass === 17 ? "PASS" : "FAIL",
  },
  DARK_GARMENTS: {
    DARK_GARMENT_APPROVED_ART_IDENTITY_QC: darkPass ? "PASS" : "FAIL",
    STALE_CANDIDATE3_FULFILLMENT_REACHABILITY_QC: staleReach,
    FUTURE_FULFILLMENT_ARTWORK_IDENTITY_QC: futureFulfillmentArtworkIdentityQc(root),
    dry_resolve_url: dryResolve.ok ? dryResolve.url : null,
    dry_resolve_sha256: drySha,
  },
  REPLACEMENT: {
    ...replacementCost,
    CORRECTED_REPLACEMENT_ELIGIBILITY_QC:
      allGatesPass && replacementCost?.CORRECTED_REPLACEMENT_PROVIDER_COST_ESTIMATE != null ? "PASS" : "PARTIAL",
    PRODUCTION_REPLACEMENT_AUTHORIZED: false,
    ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
  },
  PERMANENT_QC: {
    FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_QC: founderVisualApprovalArtifactPinQc(root),
    PRODUCTION_PRINT_ARTWORK_IDENTITY_QC:
      liveAudit.rows.length === 19 && liveAudit.PASS_ART_ROWS === 19 ? "PASS" : "FAIL",
  },
  CURRENT_SAMPLE: {
    GELATO_ORDER_ID: "0e22864c-0246-443f-9b38-9d675b575dac",
    GELATO_FULFILLMENT_STATUS: "in_production",
    REAL_TRACKING_REFERENCE_QC: "PENDING",
    CURRENT_PHYSICAL_REFERENCE_TYPE: "NON_CANONICAL_PRINT_AND_GARMENT_SAMPLE",
    ...clubThrottleNonCanonicalSampleQcState({ fulfillment_status: "in_production" }),
  },
  live_rows: liveAudit.rows,
};

writeFileSync(join(root, ".infinity/commerce/club-throttle-v41.1-live-art-verification-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
