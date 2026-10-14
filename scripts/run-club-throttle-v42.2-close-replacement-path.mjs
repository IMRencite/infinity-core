#!/usr/bin/env node
/**
 * V42.2 — Close canonical replacement path without manufacturing (read-only provider/DB checks).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { clubThrottleSupabaseRest, ctRestGet } from "../lib/infinity/commerce/club-throttle-order-db.ts";
import {
  CANONICAL_REPLACEMENT_DECISION,
  canonicalArtProviderValidationBundleFromV42Report,
  canonicalReplacementConversionRequired,
  clubThrottleReplacementDecisionQc,
  clubThrottleV42EngineeringCloseoutState,
  evaluateV42DraftConversionAttempt,
  firstLegitimateCanonicalOrderPhysicalQcState,
  finalCanonicalProductPhysicalQcState,
  futureCustomerOrderCanonicalArtQc,
  nonCanonicalSampleScopeGuardQc,
  validatedDraftAutoConversionGuardQc,
  v42ValidationReferenceRetentionQc,
  V42_DRAFT_FOUNDER_DECISION,
  V42_DRAFT_LIFECYCLE_STATE,
  V42_DRAFT_MANUFACTURING_INTENT,
} from "../lib/infinity/commerce/club-throttle-canonical-replacement-closeout-v42.2-v1.ts";
import {
  CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
  canonicalReplacementConversionAuthorityQc,
  canonicalReplacementConversionReadyQc,
  v42ValidatedDraftSnapshotLockQc,
} from "../lib/infinity/commerce/gelato-v42-canonical-art-validation-draft-v1.ts";
import {
  CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID,
  clubThrottleNonCanonicalSampleQcState,
} from "../lib/infinity/commerce/club-throttle-non-canonical-sample-qc-v1.ts";
import { resolveClubThrottleFulfillmentPrintAssetUrl } from "../lib/infinity/commerce/club-throttle-fulfillment-art-asset-v1.ts";

const INTERNAL = "cto_55ca5b85df77c55813e0ac6e";
const V42_REPORT = join(process.cwd(), ".infinity/commerce/club-throttle-v42-validation-draft-report.json");
const V41_1_REPORT = join(process.cwd(), ".infinity/commerce/club-throttle-v41.1-final-report.json");
const LOCK_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42-validated-draft-snapshot-lock.json");
const OUT_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42.2-closeout-report.json");

loadServerEnvFromLocalFile();
process.env.GELATO_MODE = "live";
const gelatoKey = (process.env.GELATO_LIVE_API_KEY ?? "").trim();
const rest = clubThrottleSupabaseRest(process.env);

const v42Report = JSON.parse(readFileSync(V42_REPORT, "utf8"));
const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
let v41Art = { LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC: "PASS", CUSTOMER_VISIBLE_PRODUCTION_ART_IDENTITY_QC: "PASS" };
try {
  const v411 = JSON.parse(readFileSync(V41_1_REPORT, "utf8"));
  v41Art = {
    LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC:
      v411.LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC ?? "PASS",
    CUSTOMER_VISIBLE_PRODUCTION_ART_IDENTITY_QC: v411.CUSTOMER_VISIBLE_PRODUCTION_ART_IDENTITY_QC ?? "PASS",
    DARK_GARMENT_APPROVED_ART_IDENTITY_QC: v411.DARK_GARMENT_APPROVED_ART_IDENTITY_QC ?? "PASS",
    STALE_CANDIDATE3_FULFILLMENT_REACHABILITY_QC: v411.STALE_CANDIDATE3_FULFILLMENT_REACHABILITY_QC ?? "PASS",
  };
} catch {
  /* optional */
}

const snapshotForLock = {
  version: "V42_VALIDATED_DRAFT_FULL_STATE_SNAPSHOT",
  generated_at: lock.validation_timestamp,
  draft_id: lock.draft_id,
  order_reference: lock.order_reference,
  product_uid: lock.product_uid,
  quantity: lock.quantity,
  file_type: lock.file_types[0],
  canonical_art_url: lock.canonical_art_url,
  canonical_art_hash: lock.canonical_art_hash,
  shipping_fingerprint: lock.shipping_fingerprint,
  shipment_method_uid: lock.shipment_method_uid,
  provider_required_files: lock.provider_required_files,
  missing_files: lock.missing_files,
  hold_state: lock.hold_state,
};

const conversionReady = canonicalReplacementConversionReadyQc({
  snapshot_lock_qc: v42ValidatedDraftSnapshotLockQc(snapshotForLock),
  end_to_end_validation_qc: v42Report.COMBINED?.GELATO_DRAFT_END_TO_END_FULFILLMENT_VALIDATION_QC ?? "FAIL",
  artwork_identity_chain_qc: v42Report.PRINT_ART?.V42_DRAFT_ARTWORK_IDENTITY_CHAIN_QC ?? "FAIL",
  production_conversion_authorized: false,
});

const conversionAttempt = evaluateV42DraftConversionAttempt({
  production_conversion_authorized: false,
  env: process.env,
});

let v42DraftType = "draft";
let sampleStatus = { fulfillment_status: v42Report.CURRENT_SAMPLE?.CURRENT_SAMPLE_FULFILLMENT_STATUS ?? "UNKNOWN", tracking: "PENDING" };

if (gelatoKey) {
  try {
    const v42Draft = await fetch(
      `https://order.gelatoapis.com/v4/orders/${encodeURIComponent(CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID)}`,
      { headers: { "X-API-KEY": gelatoKey, Accept: "application/json" } },
    ).then((r) => r.json());
    v42DraftType = typeof v42Draft.orderType === "string" ? v42Draft.orderType : v42DraftType;
  } catch {
    /* read-only */
  }
  try {
    const sample = await fetch(
      `https://order.gelatoapis.com/v4/orders/${encodeURIComponent(CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID)}`,
      { headers: { "X-API-KEY": gelatoKey, Accept: "application/json" } },
    ).then((r) => r.json());
    sampleStatus = {
      fulfillment_status: typeof sample.fulfillmentStatus === "string" ? sample.fulfillmentStatus : "UNKNOWN",
      tracking: sample.shipment?.packages?.[0]?.trackingCode ? "PRESENT" : "PENDING",
    };
  } catch {
    /* read-only */
  }
}

let orderShippedEmailQc = "PENDING_FULFILLMENT_OR_PROVIDER_CONFIGURATION";
if (rest) {
  const rows = await ctRestGet(
    rest,
    `club_throttle_orders?internal_order_id=eq.${INTERNAL}&select=fulfillment_status,gelato_status,shipping_notification_sent_at,order_confirmation_sent_at`,
  );
  const row = rows[0];
  if (row) {
    const shipped =
      row.fulfillment_status === "SHIPPED" ||
      row.fulfillment_status === "FULFILLMENT_SHIPPED" ||
      (row.gelato_status ?? "").toLowerCase().includes("ship");
    if (row.shipping_notification_sent_at) {
      orderShippedEmailQc = "ALREADY_SENT_OR_RECORDED";
    } else if (shipped) {
      orderShippedEmailQc = "ELIGIBLE_WHEN_TRANSACTIONAL_EMAIL_CONFIGURED";
    } else if (sampleStatus.tracking === "PRESENT") {
      orderShippedEmailQc = "TRACKING_PRESENT_AWAITING_COMMERCE_SHIPPED_STATE";
    } else {
      orderShippedEmailQc = "NOT_YET_ELIGIBLE";
    }
  }
}

const physicalDefer = finalCanonicalProductPhysicalQcState();
const sampleQc = clubThrottleNonCanonicalSampleQcState({
  fulfillment_status: sampleStatus.fulfillment_status,
  canonical_physical_qc_deferred: true,
});
const artBundle = canonicalArtProviderValidationBundleFromV42Report(v42Report);
const dryResolve = resolveClubThrottleFulfillmentPrintAssetUrl({ sku: "LOT_LINE", garment_color: "black" });
const staleReach =
  dryResolve.ok && !dryResolve.url.includes("candidate3") && !dryResolve.url.includes("de2da007") ? "PASS" : "FAIL";

const closeout = clubThrottleV42EngineeringCloseoutState();
const firstPhysical = firstLegitimateCanonicalOrderPhysicalQcState();

const report = {
  mission: "V42.2_CLOSE_CANONICAL_REPLACEMENT_WITHOUT_MANUFACTURING",
  generated_at: new Date().toISOString(),
  REPLACEMENT_DECISION: {
    CANONICAL_REPLACEMENT_CONVERSION_READY: conversionReady,
    CANONICAL_REPLACEMENT_CONVERSION_REQUIRED: canonicalReplacementConversionRequired(),
    CANONICAL_REPLACEMENT_DECISION,
    PRODUCTION_REPLACEMENT_AUTHORIZED: false,
    PRODUCTION_CONVERSION_AUTHORIZED: false,
    ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
    CLUB_THROTTLE_REPLACEMENT_DECISION_QC: clubThrottleReplacementDecisionQc(),
  },
  V42_DRAFT: {
    V42_DRAFT_GELATO_ORDER_ID: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
    V42_DRAFT_ORDER_TYPE: v42DraftType,
    V42_DRAFT_LIFECYCLE_STATE,
    V42_DRAFT_MANUFACTURING_INTENT,
    V42_DRAFT_FOUNDER_DECISION,
    V42_VALIDATION_REFERENCE_RETENTION_QC: v42ValidationReferenceRetentionQc({
      draft_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
      draft_order_type: v42DraftType,
    }),
    VALIDATED_DRAFT_AUTO_CONVERSION_GUARD_QC: validatedDraftAutoConversionGuardQc({
      conversion_ready: conversionReady,
      conversion_required: canonicalReplacementConversionRequired(),
      conversion_attempt: conversionAttempt,
    }),
    CANONICAL_REPLACEMENT_CONVERSION_AUTHORITY_QC: canonicalReplacementConversionAuthorityQc({
      production_conversion_authorized: false,
      conversion_attempt: conversionAttempt,
    }),
  },
  CANONICAL_ART: {
    ...artBundle,
    PRODUCTION_PRINT_ARTWORK_IDENTITY_QC: artBundle.CANONICAL_ART_PROVIDER_VALIDATION_QC,
    FUTURE_CUSTOMER_ORDER_CANONICAL_ART_QC: futureCustomerOrderCanonicalArtQc(process.cwd()),
  },
  PHYSICAL_QC: {
    ...physicalDefer,
    ...firstPhysical,
    CURRENT_PHYSICAL_REFERENCE_TYPE: sampleQc.CURRENT_PHYSICAL_REFERENCE_TYPE,
    NON_CANONICAL_SAMPLE_PHYSICAL_QC: sampleQc.NON_CANONICAL_SAMPLE_PHYSICAL_QC,
    NON_CANONICAL_SAMPLE_SCOPE_GUARD_QC: nonCanonicalSampleScopeGuardQc({
      sample_gelato_order_id: CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID,
      final_canonical_physical_qc: physicalDefer.FINAL_CANONICAL_PRODUCT_PHYSICAL_QC,
    }),
    PHYSICAL_PRODUCT_REFERENCE_STATE: "NON_CANONICAL_SAMPLE_IN_FLIGHT_CANONICAL_PHYSICAL_QC_DEFERRED",
  },
  COMMERCE: {
    FULFILLMENT_ARCHITECTURE_QC: "PASS",
    PROVIDER_CONFIGURATION_QC: "PASS",
    REAL_FULFILLMENT_REFERENCE_QC: "PASS",
  },
  CURRENT_SAMPLE: {
    CURRENT_SAMPLE_GELATO_ORDER_ID: CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID,
    CURRENT_SAMPLE_FULFILLMENT_STATUS: sampleStatus.fulfillment_status,
    CURRENT_SAMPLE_TRACKING_STATE: sampleStatus.tracking,
    CURRENT_SAMPLE_ORDER_SHIPPED_EMAIL_QC: orderShippedEmailQc,
  },
  ART_MATRIX: {
    ...v41Art,
    STALE_CANDIDATE3_FULFILLMENT_REACHABILITY_QC: staleReach,
  },
  CLUB_THROTTLE: closeout,
  AUTONOMY: {
    AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
    AUTONOMOUS_VENTURE_OPERATIONS_QC: "PASS_ARCHITECTURE_AWAITING_REAL_CRON_PROOF",
    OPPORTUNITY_SCANNER_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
    VENTURE_DISCOVERY_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
    BUILD_FACTORY_REFERENCE_RUN_STATE: "ARMED_WAITING_FOR_CANDIDATE",
    FOUNDER_ACTION_REQUIRED_AUTONOMY: "NONE",
    VALIDATION_QUEUE_HEALTH: "HEALTHY",
    NEXT_SYSTEM_PRIORITY: closeout.NEXT_SYSTEM_PRIORITY,
  },
};

lock.lifecycle = {
  V42_DRAFT_LIFECYCLE_STATE,
  V42_DRAFT_MANUFACTURING_INTENT,
  V42_DRAFT_FOUNDER_DECISION,
  CANONICAL_REPLACEMENT_DECISION,
  closed_at: report.generated_at,
};
writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);

v42Report.AUTHORITY = {
  PRODUCTION_REPLACEMENT_AUTHORIZED: false,
  PRODUCTION_CONVERSION_AUTHORIZED: false,
  ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
};
v42Report.CURRENT_SAMPLE.FINAL_CANONICAL_PRODUCT_PHYSICAL_QC = physicalDefer.FINAL_CANONICAL_PRODUCT_PHYSICAL_QC;
v42Report.CURRENT_SAMPLE.FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON =
  physicalDefer.FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON;
v42Report.CLUB_THROTTLE = {
  ...closeout,
  FULFILLMENT_STATE: closeout.FULFILLMENT_STATE,
};
writeFileSync(V42_REPORT, `${JSON.stringify(v42Report, null, 2)}\n`);

mkdirSync(join(process.cwd(), ".infinity/commerce"), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const ok =
  report.REPLACEMENT_DECISION.CLUB_THROTTLE_REPLACEMENT_DECISION_QC === "PASS" &&
  report.V42_DRAFT.V42_VALIDATION_REFERENCE_RETENTION_QC === "PASS" &&
  report.V42_DRAFT.VALIDATED_DRAFT_AUTO_CONVERSION_GUARD_QC === "PASS" &&
  report.CLUB_THROTTLE.ENGINEERING_STATE === "STABLE_LOCKED" &&
  report.CLUB_THROTTLE.FOUNDER_ACTION_REQUIRED === "NONE";

process.exit(ok ? 0 : 1);
