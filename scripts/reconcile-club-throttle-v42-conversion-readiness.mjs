#!/usr/bin/env node
/** Read-only: conversion readiness QC from durable V42 lock + report (no Gelato PATCH/POST). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canonicalReplacementConversionAuthorityQc,
  canonicalReplacementConversionReadyQc,
  v42ValidatedDraftSnapshotLockQc,
} from "../lib/infinity/commerce/gelato-v42-canonical-art-validation-draft-v1.ts";
import {
  canonicalReplacementConversionRequired,
  evaluateV42DraftConversionAttempt,
} from "../lib/infinity/commerce/club-throttle-canonical-replacement-closeout-v42.2-v1.ts";

const report = JSON.parse(
  readFileSync(join(process.cwd(), ".infinity/commerce/club-throttle-v42-validation-draft-report.json"), "utf8"),
);
const lock = JSON.parse(
  readFileSync(join(process.cwd(), ".infinity/commerce/club-throttle-v42-validated-draft-snapshot-lock.json"), "utf8"),
);

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

const snapshotLockQc = v42ValidatedDraftSnapshotLockQc(snapshotForLock);
const conversionAttempt = evaluateV42DraftConversionAttempt({
  production_conversion_authorized: false,
  env: {},
});
const authorityQc = canonicalReplacementConversionAuthorityQc({
  production_conversion_authorized: false,
  conversion_attempt: conversionAttempt,
});
const ready = canonicalReplacementConversionReadyQc({
  snapshot_lock_qc: snapshotLockQc,
  end_to_end_validation_qc: report.COMBINED?.GELATO_DRAFT_END_TO_END_FULFILLMENT_VALIDATION_QC ?? "FAIL",
  artwork_identity_chain_qc: report.PRINT_ART?.V42_DRAFT_ARTWORK_IDENTITY_CHAIN_QC ?? "FAIL",
  production_conversion_authorized: false,
});

console.log(
  JSON.stringify(
    {
      V42_VALIDATED_DRAFT_SNAPSHOT_LOCK_QC: snapshotLockQc,
      CANONICAL_REPLACEMENT_CONVERSION_AUTHORITY_QC: authorityQc,
      CANONICAL_REPLACEMENT_CONVERSION_READY: ready,
      CANONICAL_REPLACEMENT_CONVERSION_REQUIRED: canonicalReplacementConversionRequired(),
    },
    null,
    2,
  ),
);
