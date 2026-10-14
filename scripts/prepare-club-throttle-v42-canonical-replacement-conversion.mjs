#!/usr/bin/env node
/**
 * V42+ — Founder-gated conversion readiness for validated canonical replacement draft.
 * Does NOT PATCH Gelato unless CLUB_THROTTLE_V42_DRAFT_CONVERSION_AUTHORIZED=ENABLED.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { ClubThrottleGelatoLiveOrderAdapter } from "../lib/infinity/commerce/club-throttle-gelato-live-order-adapter.ts";
import {
  CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
  CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
  CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  canonicalReplacementConversionAuthorityQc,
  canonicalReplacementConversionReadyQc,
  evaluateCanonicalReplacementDraftConversion,
  productionConversionAuthorized,
  v42ValidatedDraftSnapshotLockQc,
} from "../lib/infinity/commerce/gelato-v42-canonical-art-validation-draft-v1.ts";
import { inspectGelatoValidationDraft } from "../lib/infinity/commerce/gelato-preflight-draft-validation-v1.ts";

const REPORT_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42-validation-draft-report.json");
const LOCK_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42-validated-draft-snapshot-lock.json");
const OUT_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42-conversion-readiness-report.json");

loadServerEnvFromLocalFile();
process.env.GELATO_MODE = "live";

const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));

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
  provider_downloaded_art_hash: lock.provider_downloaded_art_hash,
  shipping_fingerprint: lock.shipping_fingerprint,
  shipment_method_uid: lock.shipment_method_uid,
  provider_required_files: lock.provider_required_files,
  missing_files: lock.missing_files,
  hold_state: lock.hold_state,
};

const snapshotLockQc = v42ValidatedDraftSnapshotLockQc(snapshotForLock);
const prodAuthFlag = productionConversionAuthorized({
  production_conversion_authorized: report.AUTHORITY?.PRODUCTION_CONVERSION_AUTHORIZED === true,
  env: process.env,
});

const conversionAttempt = evaluateCanonicalReplacementDraftConversion({
  provider_order_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
  production_conversion_authorized: report.AUTHORITY?.PRODUCTION_CONVERSION_AUTHORIZED === true,
  env: process.env,
});

const authorityQc = canonicalReplacementConversionAuthorityQc({
  production_conversion_authorized: prodAuthFlag,
  conversion_attempt: conversionAttempt,
});

const ready = canonicalReplacementConversionReadyQc({
  snapshot_lock_qc: snapshotLockQc,
  end_to_end_validation_qc: report.COMBINED?.GELATO_DRAFT_END_TO_END_FULFILLMENT_VALIDATION_QC ?? "FAIL",
  artwork_identity_chain_qc: report.PRINT_ART?.V42_DRAFT_ARTWORK_IDENTITY_CHAIN_QC ?? "FAIL",
  production_conversion_authorized: prodAuthFlag,
});

let liveDraftInspect = null;
if ((process.env.GELATO_LIVE_API_KEY ?? "").trim()) {
  liveDraftInspect = await inspectGelatoValidationDraft({
    providerOrderId: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
    submittedProductUid: CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
    env: process.env,
  });
}

let patchResult = null;
if (conversionAttempt.allowed && prodAuthFlag) {
  const adapter = new ClubThrottleGelatoLiveOrderAdapter({ env: process.env });
  patchResult = await adapter.patchProductionOrder(
    CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
    conversionAttempt.patch_body,
  );
}

const out = {
  mission: "V42_CANONICAL_REPLACEMENT_CONVERSION_READINESS",
  generated_at: new Date().toISOString(),
  V42_DRAFT_GELATO_ORDER_ID: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
  V42_VALIDATED_DRAFT_SNAPSHOT_LOCK_QC: snapshotLockQc,
  CANONICAL_REPLACEMENT_CONVERSION_AUTHORITY_QC: authorityQc,
  CANONICAL_REPLACEMENT_CONVERSION_READY: ready,
  PRODUCTION_CONVERSION_AUTHORIZED: prodAuthFlag,
  conversion_attempt: {
    allowed: conversionAttempt.allowed,
    reason: conversionAttempt.reason,
    patch_body: conversionAttempt.patch_body,
  },
  live_draft_order_type: liveDraftInspect?.DRAFT_ORDER_TYPE ?? null,
  live_non_production_qc: liveDraftInspect?.GELATO_VALIDATION_DRAFT_NON_PRODUCTION_QC ?? null,
  provider_downloaded_art_sha_expected: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  patch_executed: patchResult !== null,
  patch_ok: patchResult?.ok ?? null,
};

mkdirSync(join(process.cwd(), ".infinity/commerce"), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(snapshotLockQc === "PASS" && authorityQc === "PASS" && !patchResult ? 0 : patchResult && !patchResult.ok ? 1 : 0);
