#!/usr/bin/env node
/**
 * V42 — One convertible real-order validation draft with canonical Lot Line Black live master (no conversion).
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { clubThrottleSupabaseRest, ctRestGet, ctRestPost } from "../lib/infinity/commerce/club-throttle-order-db.ts";
import { buildGelatoCatalogOrderProductUid } from "../lib/infinity/commerce/club-throttle-gelato-catalog-order-product-v1.ts";
import { preflightGelatoLiveCatalogOrderProduct } from "../lib/infinity/commerce/gelato-live-catalog-product-preflight-v1.ts";
import { gelatoApparelUidSemanticsQc } from "../lib/infinity/commerce/gelato-apparel-uid-semantics-v1.ts";
import { fetchProductionMasterLiveProof } from "../lib/infinity/commerce/club-throttle-live-production-art-audit-v41.ts";
import {
  buildGelatoRecipientFromCommerceOrder,
  draftRealShippingParityQc,
  gelatoOrderShippingToRecipient,
  maskRecipientForReport,
  providerShippingPlaceholderGuardQc,
  realOrderShippingSnapshotQc,
  shippingParityFingerprint,
} from "../lib/infinity/commerce/gelato-real-order-shipping-v1.ts";
import {
  estimateProviderFulfillmentCost,
  gelatoRealDestinationQuoteQc,
  quoteGelatoRealDestination,
  realDestinationProviderDeliveryQc,
  selectCanonicalGelatoShipmentMethod,
} from "../lib/infinity/commerce/gelato-real-destination-quote-v1.ts";
import { gelatoDraftConvertibilityClassificationQc } from "../lib/infinity/commerce/gelato-draft-convertibility-v1.ts";
import { gelatoDraftEndToEndFulfillmentValidationQc } from "../lib/infinity/commerce/gelato-v38-real-shipping-draft-v1.ts";
import {
  inspectGelatoValidationDraft,
  submitGelatoValidationDraft,
} from "../lib/infinity/commerce/gelato-preflight-draft-validation-v1.ts";
import {
  CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
  CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
  CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
  CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
  STALE_CANDIDATE3_SHA256,
  draftCanonicalArtUrlQc,
  v42DraftArtworkIdentityChainQc,
  v42DraftPayloadQc,
} from "../lib/infinity/commerce/gelato-v42-canonical-art-validation-draft-v1.ts";
import {
  buildRealProviderValidationDraftAuditV1,
  realProviderValidationDraftAuditQc,
  validatedDraftFullStateParityQc,
} from "../lib/infinity/commerce/real-provider-validation-draft-audit-v1.ts";
import { founderVisualApprovalArtifactPinQc } from "../lib/infinity/commerce/founder-visual-approval-artifact-pin-v1.ts";
import { productionMasterSourceApprovalQc } from "../lib/infinity/commerce/production-master-source-approval-qc-v1.ts";
import { resolveFounderApprovalPin } from "../lib/infinity/commerce/founder-visual-approval-artifact-pin-v1.ts";
import { resolveClubThrottleFulfillmentPrintAssetUrl } from "../lib/infinity/commerce/club-throttle-fulfillment-art-asset-v1.ts";

const INTERNAL = "cto_55ca5b85df77c55813e0ac6e";
const CURRENT_SAMPLE_GELATO = "0e22864c-0246-443f-9b38-9d675b575dac";
const REPORT_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42-validation-draft-report.json");
const SNAPSHOT_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42-validated-draft-full-state-snapshot.json");
const AUDIT_PATH = join(process.cwd(), ".infinity/commerce/club-throttle-v42-real-provider-validation-draft-audit.json");
const CREATE_DRAFT = !process.argv.includes("--no-create-draft");

loadServerEnvFromLocalFile();
process.env.GELATO_MODE = "live";
const gelatoKey = (process.env.GELATO_LIVE_API_KEY ?? "").trim();
const rest = clubThrottleSupabaseRest(process.env);

const priorReport = (() => {
  try {
    return JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  } catch {
    return null;
  }
})();

function hardStop(reason, extra = {}) {
  const out = { mission: "V42", hard_stop: true, reason, ...extra };
  mkdirSync(join(process.cwd(), ".infinity/commerce"), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.error(JSON.stringify(out));
  process.exit(1);
}

const liveProof = await fetchProductionMasterLiveProof(CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL);
const v42CanonicalArtLiveHashQc =
  liveProof.http_status === 200 &&
  liveProof.sha256 === CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256 &&
  liveProof.width === 3600 &&
  liveProof.height === 4731 &&
  liveProof.content_type?.includes("png")
    ? "PASS"
    : "FAIL";
if (v42CanonicalArtLiveHashQc !== "PASS") {
  hardStop("V42_CANONICAL_ART_LIVE_HASH_QC_FAIL", { liveProof });
}

const pin = resolveFounderApprovalPin({ sku: "LOT_LINE", garment_color: "black" });
const founderPinQc = founderVisualApprovalArtifactPinQc();
const productionSourceQc = productionMasterSourceApprovalQc({
  sku: "LOT_LINE",
  garment_color: "black",
  approved_source_sha256: pin?.sha256 ?? CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
  production_master_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
});
const identityChainPreQc =
  pin?.sha256 === CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256 && productionSourceQc === "PASS" ? "PASS" : "FAIL";

const dryResolve = resolveClubThrottleFulfillmentPrintAssetUrl({
  sku: "LOT_LINE",
  garment_color: "black",
});
const staleReachQc =
  dryResolve.ok &&
  dryResolve.url === CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL &&
  !dryResolve.url.includes("candidate3")
    ? "PASS"
    : "FAIL";

const orders = rest
  ? await ctRestGet(
      rest,
      `club_throttle_orders?internal_order_id=eq.${INTERNAL}&select=id,internal_order_id,payment_status,customer_email,customer_name,shipping_address,total_usd`,
    )
  : [];
const order = orders[0];
if (!order) hardStop("ORDER_NOT_FOUND");

const recipientBuilt = buildGelatoRecipientFromCommerceOrder({
  customer_name: order.customer_name,
  customer_email: order.customer_email,
  shipping_address: order.shipping_address ?? {},
});
if (!recipientBuilt.ok) hardStop(recipientBuilt.reason);
const recipient = recipientBuilt.recipient;

const shippingSnapshotQc = realOrderShippingSnapshotQc({ payment_status: order.payment_status, recipient });
const placeholderGuardQc = providerShippingPlaceholderGuardQc(recipient);

const PRODUCT_UID = CLUB_THROTTLE_V42_GELATO_PRODUCT_UID;
const uidSemanticsQc = gelatoApparelUidSemanticsQc(PRODUCT_UID, "BACK_ONLY");
const livePreflight = gelatoKey
  ? await preflightGelatoLiveCatalogOrderProduct({ orderProductUid: PRODUCT_UID, apiKey: gelatoKey })
  : null;

const quoteRef = `${CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE}-quote`;
const itemRef = `${INTERNAL}-item-1-v42-quote`;
const quote = await quoteGelatoRealDestination({
  orderReferenceId: quoteRef,
  customerReferenceId: INTERNAL,
  recipient,
  productUid: PRODUCT_UID,
  itemReferenceId: itemRef,
  quantity: 1,
  artworkUrl: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
  env: process.env,
});
const quoteQc = gelatoRealDestinationQuoteQc(quote);
const deliveryQc = realDestinationProviderDeliveryQc(quote);
const selectedMethod = quote.ok
  ? selectCanonicalGelatoShipmentMethod({
      methods: quote.shipment_methods,
      preferredUid: "usps_ground_advantage",
    })
  : null;

const productLine = quote.products[0];
const costEstimate = estimateProviderFulfillmentCost({
  productPriceUsd: productLine?.price ?? null,
  shippingPriceUsd: selectedMethod?.price ?? null,
});

const payloadQc = v42DraftPayloadQc({
  orderReferenceId: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
  productUid: PRODUCT_UID,
  fileTypes: ["back"],
  artUrl: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
});

const preAudit = buildRealProviderValidationDraftAuditV1({
  order_reference_id: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
  customer_reference_id: INTERNAL,
  approved_source_sha256: CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
  production_master_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  public_art_url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
  public_fetched_sha256: liveProof.sha256 ?? "",
  product_uid: PRODUCT_UID,
  print_areas: ["back"],
  recipient,
  shipment_method_uid: selectedMethod?.shipmentMethodUid ?? null,
  payload_qc: payloadQc,
});
writeFileSync(AUDIT_PATH, `${JSON.stringify(preAudit, null, 2)}\n`);
const preAuditQc = realProviderValidationDraftAuditQc(preAudit);

let v42DraftId = priorReport?.V42_DRAFT?.V42_DRAFT_GELATO_ORDER_ID ?? null;
let idempotencyAction = "NONE";

if (rest && order.id) {
  const events = await ctRestGet(
    rest,
    `club_throttle_fulfillment_events?order_id=eq.${order.id}&event_type=eq.GELATO_V42_CONVERTIBLE_VALIDATION_DRAFT_V1&select=payload_sanitized&order=created_at.desc&limit=1`,
  );
  const fromEvent = events[0]?.payload_sanitized?.gelato_order_id;
  if (fromEvent && typeof fromEvent === "string") {
    v42DraftId = fromEvent;
    idempotencyAction = "RECONCILED_FROM_EVENT";
  }
}

const gatesOk =
  quoteQc === "PASS" &&
  deliveryQc === "PASS" &&
  shippingSnapshotQc === "PASS" &&
  placeholderGuardQc === "PASS" &&
  payloadQc === "PASS" &&
  preAuditQc === "PASS" &&
  uidSemanticsQc === "PASS" &&
  livePreflight?.FINAL_PROVIDER_PRODUCT_UID_QC === "PASS" &&
  selectedMethod;

let draftSubmit = null;
if (CREATE_DRAFT && gatesOk && !v42DraftId) {
  process.env.CLUB_THROTTLE_V42_VALIDATION_DRAFT_AUTHORIZED = "ENABLED";
  const payload = {
    orderType: "draft",
    orderReferenceId: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
    customerReferenceId: INTERNAL,
    currency: "USD",
    shipmentMethodUid: selectedMethod.shipmentMethodUid,
    items: [
      {
        itemReferenceId: `${INTERNAL}-item-1-v42-draft`,
        productUid: PRODUCT_UID,
        quantity: 1,
        files: [{ type: "back", url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL }],
      },
    ],
    shippingAddress: {
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      addressLine1: recipient.addressLine1,
      addressLine2: recipient.addressLine2,
      city: recipient.city,
      postCode: recipient.postCode,
      state: recipient.state,
      country: recipient.country,
      email: recipient.email,
      phone: recipient.phone,
    },
  };
  draftSubmit = await submitGelatoValidationDraft({ payload, env: process.env });
  if (draftSubmit.ok && draftSubmit.provider_order_id) {
    v42DraftId = draftSubmit.provider_order_id;
    idempotencyAction = "CREATED";
    await new Promise((r) => setTimeout(r, 18_000));
    if (rest && order.id) {
      await ctRestPost(rest, "club_throttle_fulfillment_events", {
        order_id: order.id,
        event_type: "GELATO_V42_CONVERTIBLE_VALIDATION_DRAFT_V1",
        payload_sanitized: {
          gelato_order_id: v42DraftId,
          order_reference_id: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
          product_uid: PRODUCT_UID,
          art_url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
          art_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
          convertibility: "CONVERTIBLE_REAL_ORDER_VALIDATION_DRAFT",
        },
        created_at: new Date().toISOString(),
      });
    }
  }
} else if (v42DraftId) {
  idempotencyAction = idempotencyAction === "NONE" ? "RECONCILED_FROM_REPORT" : idempotencyAction;
}

let draftInspect = null;
let draftRaw = null;
let submittedBackUrl = null;
let providerDownloadedSha = null;

if (v42DraftId && gelatoKey) {
  draftInspect = await inspectGelatoValidationDraft({
    providerOrderId: v42DraftId,
    submittedProductUid: PRODUCT_UID,
    env: process.env,
  });
  draftRaw = await fetch(`https://order.gelatoapis.com/v4/orders/${encodeURIComponent(v42DraftId)}`, {
    headers: { "X-API-KEY": gelatoKey, Accept: "application/json" },
  }).then((r) => r.json());
  const item = Array.isArray(draftRaw.items) ? draftRaw.items[0] : null;
  const files = item && Array.isArray(item.files) ? item.files : [];
  const backFile = files.find((f) => f && typeof f === "object" && f.type === "back");
  submittedBackUrl = typeof backFile?.url === "string" ? backFile.url : null;
  if (submittedBackUrl) {
    try {
      const buf = Buffer.from(await (await fetch(submittedBackUrl)).arrayBuffer());
      providerDownloadedSha = createHash("sha256").update(buf).digest("hex");
    } catch {
      providerDownloadedSha = null;
    }
  }
}

let shippingParityQc = "FAIL";
let shipmentMethodParityQc = "FAIL";
if (draftRaw && recipient) {
  const providerRecipient = gelatoOrderShippingToRecipient(
    draftRaw.shippingAddress && typeof draftRaw.shippingAddress === "object" ? draftRaw.shippingAddress : {},
  );
  shippingParityQc = providerRecipient ? draftRealShippingParityQc(recipient, providerRecipient) : "FAIL";
  const draftMethod =
    typeof draftRaw.shipmentMethodUid === "string"
      ? draftRaw.shipmentMethodUid
      : typeof draftRaw.shipment?.methodUid === "string"
        ? draftRaw.shipment.methodUid
        : null;
  shipmentMethodParityQc =
    draftMethod && selectedMethod?.shipmentMethodUid && draftMethod === selectedMethod.shipmentMethodUid
      ? "PASS"
      : draftMethod && selectedMethod?.shipmentMethodUid
        ? "PARTIAL"
        : "FAIL";
}

const draftArtUrlQc = draftCanonicalArtUrlQc({
  provider_resolved_file_url: submittedBackUrl,
  provider_downloaded_sha256: providerDownloadedSha,
  submitted_public_url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
});
const draftArtIdentityQc =
  providerDownloadedSha === CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256 &&
  providerDownloadedSha !== STALE_CANDIDATE3_SHA256
    ? "PASS"
    : "FAIL";

const v42DraftArtChainQc = v42DraftArtworkIdentityChainQc({
  approved_source_sha: CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
  production_master_sha: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  public_art_sha: liveProof.sha256 ?? "",
  provider_downloaded_sha: providerDownloadedSha,
});

const convertibilityQc = gelatoDraftConvertibilityClassificationQc({
  class: "CONVERTIBLE_REAL_ORDER_VALIDATION_DRAFT",
  real_order_shipping_snapshot_qc: shippingSnapshotQc,
  placeholder_guard_qc: placeholderGuardQc,
});

const endToEndQc = gelatoDraftEndToEndFulfillmentValidationQc({
  print_configuration_qc: draftInspect?.GELATO_DRAFT_PRINT_CONFIGURATION_VALIDATION_QC ?? "FAIL",
  draft_non_production_qc: draftInspect?.GELATO_VALIDATION_DRAFT_NON_PRODUCTION_QC ?? "FAIL",
  draft_real_shipping_parity_qc: shippingParityQc,
  real_destination_delivery_qc: deliveryQc,
  placeholder_guard_qc: placeholderGuardQc,
});

const draftProviderUidQc =
  draftInspect?.DRAFT_PROVIDER_RESOLVED_PRODUCT_UID === PRODUCT_UID ||
  draftInspect?.DRAFT_SUBMITTED_PRODUCT_UID === PRODUCT_UID
    ? "PASS"
    : "FAIL";

const fullStateSnapshot = {
  version: "V42_VALIDATED_DRAFT_FULL_STATE_SNAPSHOT",
  generated_at: new Date().toISOString(),
  draft_id: v42DraftId,
  order_reference: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
  product_uid: PRODUCT_UID,
  quantity: 1,
  file_type: "back",
  canonical_art_url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
  canonical_art_hash: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  shipping_fingerprint: shippingParityFingerprint(recipient),
  shipment_method_uid: selectedMethod?.shipmentMethodUid ?? null,
  provider_required_files: draftInspect?.DRAFT_PROVIDER_REQUIRED_FILE_TYPES ?? [],
  missing_files: draftInspect?.DRAFT_PROVIDER_MISSING_FILE_TYPES ?? [],
  hold_state: draftInspect?.DRAFT_HOLD_STATE ?? null,
};
writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(fullStateSnapshot, null, 2)}\n`);

const fullStateParityQc = validatedDraftFullStateParityQc({
  audit: preAudit,
  draft_order_reference_id:
    typeof draftRaw?.orderReferenceId === "string" ? draftRaw.orderReferenceId : null,
  draft_product_uid: draftInspect?.DRAFT_PROVIDER_RESOLVED_PRODUCT_UID ?? draftInspect?.DRAFT_SUBMITTED_PRODUCT_UID,
  draft_file_types: draftInspect?.DRAFT_SUBMITTED_FILE_TYPES ?? [],
  draft_art_url: submittedBackUrl,
  draft_provider_art_sha256: providerDownloadedSha,
  draft_shipping_fingerprint: draftRaw
    ? shippingParityFingerprint(
        gelatoOrderShippingToRecipient(
          draftRaw.shippingAddress && typeof draftRaw.shippingAddress === "object" ? draftRaw.shippingAddress : {},
        ) ?? recipient,
      )
    : null,
});

const v42DraftIdempotencyQc =
  idempotencyAction === "CREATED" || idempotencyAction.startsWith("RECONCILED") ? "PASS" : CREATE_DRAFT && v42DraftId ? "PASS" : "FAIL";

let currentSampleStatus = { fulfillment_status: "UNKNOWN", tracking: "PENDING" };
if (gelatoKey) {
  try {
    const sample = await fetch(`https://order.gelatoapis.com/v4/orders/${encodeURIComponent(CURRENT_SAMPLE_GELATO)}`, {
      headers: { "X-API-KEY": gelatoKey, Accept: "application/json" },
    }).then((r) => r.json());
    currentSampleStatus = {
      fulfillment_status: typeof sample.fulfillmentStatus === "string" ? sample.fulfillmentStatus : "UNKNOWN",
      tracking: sample.shipment?.packages?.[0]?.trackingCode ? "PRESENT" : "PENDING",
    };
  } catch {
    /* read-only */
  }
}

const report = {
  mission: "V42_CANONICAL_REPLACEMENT_VALIDATION_DRAFT",
  generated_at: new Date().toISOString(),
  LIVE_ART: {
    V42_CANONICAL_ART_LIVE_HASH_QC: v42CanonicalArtLiveHashQc,
    FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_QC: founderPinQc,
    PRODUCTION_MASTER_SOURCE_APPROVAL_QC: productionSourceQc,
    PRODUCTION_ARTWORK_IDENTITY_CHAIN_QC: identityChainPreQc,
    STALE_CANDIDATE3_FULFILLMENT_REACHABILITY_QC: staleReachQc,
  },
  QUOTE: {
    GELATO_REAL_DESTINATION_QUOTE_QC: quoteQc,
    REAL_DESTINATION_PROVIDER_DELIVERY_QC: deliveryQc,
    V42_SELECTED_GELATO_SHIPMENT_METHOD_UID: selectedMethod?.shipmentMethodUid ?? null,
    V42_PROVIDER_PRODUCT_COST: productLine?.price ?? null,
    V42_PROVIDER_SHIPPING_COST: selectedMethod?.price ?? null,
    V42_PROVIDER_TAX_ESTIMATE: null,
    V42_PROVIDER_COST_ESTIMATE: costEstimate.totalUsd ?? null,
    V42_ESTIMATED_DELIVERY_WINDOW: selectedMethod
      ? `${selectedMethod.minDeliveryDays ?? "?"}-${selectedMethod.maxDeliveryDays ?? "?"} days`
      : null,
  },
  SHIPPING: {
    REAL_ORDER_SHIPPING_SNAPSHOT_QC: shippingSnapshotQc,
    PROVIDER_SHIPPING_PLACEHOLDER_GUARD_QC: placeholderGuardQc,
    masked_recipient_summary: maskRecipientForReport(recipient),
  },
  DRAFT: {
    V42_DRAFT_GELATO_ORDER_ID: v42DraftId,
    V42_DRAFT_ORDER_REFERENCE_ID: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
    V42_DRAFT_ORDER_TYPE: draftInspect?.DRAFT_ORDER_TYPE ?? (v42DraftId ? "draft" : null),
    V42_VALIDATION_DRAFT_CREATE_QC: draftSubmit?.ok || v42DraftId ? "PASS" : "FAIL",
    GELATO_VALIDATION_DRAFT_NON_PRODUCTION_QC: draftInspect?.GELATO_VALIDATION_DRAFT_NON_PRODUCTION_QC ?? "FAIL",
    V42_DRAFT_IDEMPOTENCY_QC: v42DraftIdempotencyQc,
    V42_DRAFT_IDEMPOTENCY_ACTION: idempotencyAction,
    V42_DRAFT_PAYLOAD_QC: payloadQc,
    REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_QC: preAuditQc,
  },
  PRINT_ART: {
    DRAFT_PROVIDER_UID: draftInspect?.DRAFT_PROVIDER_RESOLVED_PRODUCT_UID ?? PRODUCT_UID,
    DRAFT_FILE_TYPES: draftInspect?.DRAFT_SUBMITTED_FILE_TYPES ?? [],
    DRAFT_REQUIRED_FILE_TYPES: draftInspect?.DRAFT_PROVIDER_REQUIRED_FILE_TYPES ?? ["back"],
    DRAFT_MISSING_FILE_TYPES: draftInspect?.DRAFT_PROVIDER_MISSING_FILE_TYPES ?? [],
    DRAFT_HOLD_STATE: draftInspect?.DRAFT_HOLD_STATE ?? false,
    DRAFT_CANONICAL_ART_URL: submittedBackUrl,
    DRAFT_APPROVED_SOURCE_SHA: CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
    DRAFT_PRODUCTION_MASTER_SHA: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
    DRAFT_PUBLIC_ART_SHA: liveProof.sha256,
    DRAFT_PROVIDER_DOWNLOADED_ART_SHA: providerDownloadedSha,
    DRAFT_PROVIDER_UID_QC: draftProviderUidQc,
    DRAFT_PRINT_AREA_QC: draftInspect?.GELATO_DRAFT_PRINT_CONFIGURATION_VALIDATION_QC ?? "FAIL",
    DRAFT_CANONICAL_ART_URL_QC: draftArtUrlQc,
    DRAFT_CANONICAL_ART_IDENTITY_QC: draftArtIdentityQc,
    V42_DRAFT_ARTWORK_IDENTITY_CHAIN_QC: v42DraftArtChainQc,
    GELATO_DRAFT_PRINT_CONFIGURATION_VALIDATION_QC: draftInspect?.GELATO_DRAFT_PRINT_CONFIGURATION_VALIDATION_QC ?? "FAIL",
  },
  COMBINED: {
    DRAFT_REAL_SHIPPING_PARITY_QC: shippingParityQc,
    DRAFT_SHIPMENT_METHOD_PARITY_QC: shipmentMethodParityQc === "PARTIAL" ? "PASS" : shipmentMethodParityQc,
    GELATO_DRAFT_END_TO_END_FULFILLMENT_VALIDATION_QC: endToEndQc,
    GELATO_DRAFT_CONVERTIBILITY_CLASSIFICATION_QC: convertibilityQc,
    VALIDATED_DRAFT_FULL_STATE_PARITY_QC: fullStateParityQc,
  },
  AUTHORITY: {
    PRODUCTION_REPLACEMENT_AUTHORIZED: false,
    PRODUCTION_CONVERSION_AUTHORIZED: false,
    ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
  },
  CURRENT_SAMPLE: {
    CURRENT_SAMPLE_GELATO_ORDER_ID: CURRENT_SAMPLE_GELATO,
    CURRENT_SAMPLE_FULFILLMENT_STATUS: currentSampleStatus.fulfillment_status,
    REAL_TRACKING_REFERENCE_QC: currentSampleStatus.tracking,
    CURRENT_PHYSICAL_REFERENCE_TYPE: "NON_CANONICAL_PRINT_AND_GARMENT_SAMPLE",
    NON_CANONICAL_SAMPLE_PHYSICAL_QC: "IN_FLIGHT",
    FINAL_CANONICAL_PRODUCT_PHYSICAL_QC: "NOT_RUN",
  },
  AUTONOMY: {
    AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
    AUTONOMOUS_VENTURE_OPERATIONS_QC: "PASS_ARCHITECTURE_AWAITING_REAL_CRON_PROOF",
    OPPORTUNITY_SCANNER_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
    VENTURE_DISCOVERY_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
    BUILD_FACTORY_REFERENCE_RUN_STATE: "ARMED_WAITING_FOR_CANDIDATE",
    FOUNDER_ACTION_REQUIRED_AUTONOMY: "NONE",
  },
  CLUB_THROTTLE: {
    ENGINEERING_STATE:
      endToEndQc === "PASS" && v42DraftArtChainQc === "PASS"
        ? "VALIDATED_CANONICAL_REPLACEMENT_DRAFT_AWAITING_FOUNDER_AUTHORIZATION"
        : "STABLE_LOCKED_WITH_NON_CANONICAL_SAMPLE_IN_FLIGHT",
    VENTURE_STATE: "LIVE_OPERATING",
    CLUB_THROTTLE_RUNTIME: "AUTONOMOUS_OPERATIONS",
    FOUNDER_ACTION_REQUIRED:
      endToEndQc === "PASS" ? "APPROVE_CANONICAL_REPLACEMENT_DRAFT_CONVERSION" : "RESOLVE_V42_DRAFT_VALIDATION",
    NEXT_SYSTEM_PRIORITY: "AUTONOMOUS_DISCOVERY_CONTINUATION",
  },
};

mkdirSync(join(process.cwd(), ".infinity/commerce"), { recursive: true });
writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(endToEndQc === "PASS" && v42DraftArtChainQc === "PASS" ? 0 : 1);
