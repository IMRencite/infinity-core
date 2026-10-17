import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGelatoConfig } from "../commercialization/providers/gelato/config.ts";
import { GELATO_ECOMMERCE_API } from "../commercialization/providers/gelato/ecommerce-preflight.ts";
import { GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID } from "../commercialization/providers/gelato/founder-templates.ts";
import { CLUB_THROTTLE_GELATO_STORE_ID } from "../commercialization/providers/gelato/lot-line-capability-probe-v2-plan.ts";
import { LOT_LINE_PROBE_V2_PRODUCT_ID } from "./lot-line-gelato-existing-product-update-path.ts";
import { GELATO_GILDAN_5000_WHITE_M_VARIANT_ID } from "./gelato-gildan-5000-print-areas.ts";
import {
  classifyGelatoAsyncProductReadiness,
  GELATO_ASYNC_POLL_BACKOFF_MS,
} from "./gelato-async-product-readiness.ts";
import { evaluateSourceDetailSufficiencyQc } from "./source-detail-sufficiency-qc.ts";

export const CANDIDATE3_NEW_PRODUCT_PROBE_BACK_PLACEHOLDER_NAME =
  "candidate3_back_art_20e44d1d.png" as const;

export const CANDIDATE3_NEW_PRODUCT_PROBE_TITLE =
  "[CAPABILITY-PROBE-V3] Club Throttle Lot Line Tee — Candidate 3 Identity QC" as const;

export const CANDIDATE3_NEW_PRODUCT_PROBE_RESULT_REL =
  ".infinity/commerce/club-throttle-lot-line-candidate3-new-product-probe-result.json" as const;

/** Legacy probe product — frozen; never target writes. */
export const FROZEN_LINEAGE_PROBE_PRODUCT_ID = LOT_LINE_PROBE_V2_PRODUCT_ID;

const FROZEN_PRODUCT_IMAGE_IDS = [
  "ff979948-f7f0-49a4-907a-9d33a549c585",
  "9c371fbd-2d7c-4080-9e52-7c5efb78855e",
] as const;

function parseGelatoTs(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value.replace(/(\+\d{4})$/, "+00:00"));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function snapshotProductImages(product: Record<string, unknown> | null) {
  const images = Array.isArray(product?.productImages) ? product.productImages : [];
  return images.map((row) => {
    const img = row as Record<string, unknown>;
    return {
      id: img.id ?? null,
      createdAt: img.createdAt ?? null,
      updatedAt: img.updatedAt ?? null,
      status: img.status ?? null,
    };
  });
}

export function evaluateNewProductMediaProvenance(input: {
  newProductId: string | null;
  postStartedMs: number;
  product: Record<string, unknown> | null;
}): {
  NEW_PRODUCT_MEDIA_PROVENANCE_QC: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const { newProductId, postStartedMs, product } = input;
  if (!newProductId) reasons.push("missing_new_product_id");
  if (newProductId === FROZEN_LINEAGE_PROBE_PRODUCT_ID) reasons.push("matches_frozen_lineage_product");
  if (!product) reasons.push("missing_product_payload");

  const createdMs = parseGelatoTs(String(product?.createdAt ?? ""));
  if (createdMs == null) reasons.push("missing_or_unparseable_product_createdAt");
  else if (createdMs < postStartedMs - 120_000) reasons.push("product_createdAt_predates_post_window");

  const images = snapshotProductImages(product);
  if (images.length === 0) reasons.push("no_product_images");
  for (const img of images) {
    if (img.id && FROZEN_PRODUCT_IMAGE_IDS.includes(String(img.id) as (typeof FROZEN_PRODUCT_IMAGE_IDS)[number])) {
      reasons.push(`reused_frozen_product_image_id:${img.id}`);
    }
    const imgCreated = parseGelatoTs(String(img.createdAt ?? ""));
    if (imgCreated == null) reasons.push(`unparseable_image_createdAt:${img.id}`);
    else if (imgCreated < postStartedMs - 120_000) reasons.push(`stale_image_createdAt:${img.id}`);
  }

  return {
    NEW_PRODUCT_MEDIA_PROVENANCE_QC: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export type Candidate3NewProductProbePreflight = {
  STORE_SAFETY_QC: "PASS" | "FAIL";
  NEW_CANDIDATE3_PUBLIC_ASSET_QC: "PASS" | "FAIL";
  FRONT_PUBLIC_URL_QC: "PASS" | "FAIL";
  TAG_PUBLIC_URL_QC: "PASS" | "FAIL";
  NEW_ASSET_URL: string;
  NEW_ASSET_SHA256: string;
  FRONT_URL: string;
  TAG_URL: string;
  STAGING_DEPLOY_ID: string;
  STAGING_HOST: string;
};

export async function executeLotLineCandidate3NewProductProbe(input: {
  cwd?: string;
  preflight: Candidate3NewProductProbePreflight;
}): Promise<Record<string, unknown>> {
  const cwd = input.cwd ?? process.cwd();
  const auth = (process.env.LOT_LINE_CANDIDATE3_NEW_PRODUCT_PROBE_AUTHORIZED ?? "").trim().toUpperCase();
  if (auth !== "YES" && auth !== "TRUE" && auth !== "1") {
    throw new Error("LOT_LINE_CANDIDATE3_NEW_PRODUCT_PROBE_NOT_AUTHORIZED");
  }

  const pf = input.preflight;
  for (const g of [pf.STORE_SAFETY_QC, pf.NEW_CANDIDATE3_PUBLIC_ASSET_QC, pf.FRONT_PUBLIC_URL_QC, pf.TAG_PUBLIC_URL_QC]) {
    if (g !== "PASS") throw new Error("PRE_WRITE_GATES_FAILED");
  }

  const config = loadGelatoConfig();
  if (!config.credentials) throw new Error("GELATO_CREDENTIALS_MISSING");

  const storeId = CLUB_THROTTLE_GELATO_STORE_ID;
  const createBody = {
    templateId: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    title: CANDIDATE3_NEW_PRODUCT_PROBE_TITLE,
    description:
      "Hidden Infinity capability probe — Candidate 3 create-time artwork binding QC. Not for sale. Do not publish.",
    isVisibleInTheOnlineStore: false,
    variants: [
      {
        templateVariantId: GELATO_GILDAN_5000_WHITE_M_VARIANT_ID,
        imagePlaceholders: [
          { name: "front_art.png", fileUrl: pf.FRONT_URL, fitMethod: "meet" },
          {
            name: CANDIDATE3_NEW_PRODUCT_PROBE_BACK_PLACEHOLDER_NAME,
            fileUrl: pf.NEW_ASSET_URL,
            fitMethod: "meet",
          },
          { name: "tag-art.png", fileUrl: pf.TAG_URL, fitMethod: "meet" },
        ],
      },
    ],
  };

  const postStartedMs = Date.now();
  const createUrl = `${GELATO_ECOMMERCE_API}/v1/stores/${encodeURIComponent(storeId)}/products:create-from-template`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      "X-API-KEY": config.credentials.headerValue(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBody),
  });
  const createJson = (await createRes.json().catch(() => null)) as Record<string, unknown> | null;
  const createError = createRes.ok
    ? null
    : typeof createJson?.message === "string"
      ? createJson.message
      : JSON.stringify(createJson ?? { status: createRes.status }).slice(0, 1200);

  process.env.LOT_LINE_CANDIDATE3_NEW_PRODUCT_PROBE_AUTHORIZED = "NO";

  const newProductId = createJson?.id != null ? String(createJson.id) : null;
  let afterProduct: Record<string, unknown> | null = createRes.ok ? createJson : null;

  const polls: Array<Record<string, unknown>> = [];
  let lastAsync: ReturnType<typeof classifyGelatoAsyncProductReadiness> | undefined;
  let lastProvenance = evaluateNewProductMediaProvenance({
    newProductId,
    postStartedMs,
    product: afterProduct,
  });

  const pollDelaysMs = [0, 30_000, 60_000, 120_000, 180_000, 300_000] as const;

  const persist = (partial: Record<string, unknown>) => {
    writeFileSync(join(cwd, CANDIDATE3_NEW_PRODUCT_PROBE_RESULT_REL), `${JSON.stringify(partial, null, 2)}\n`);
  };

  if (newProductId && createRes.ok) {
    const productUrl = `${GELATO_ECOMMERCE_API}/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(newProductId)}`;
    for (const delayMs of pollDelaysMs) {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      const res = await fetch(productUrl, { headers: { "X-API-KEY": config.credentials.headerValue() } });
      afterProduct = res.ok ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : afterProduct;
      const images = snapshotProductImages(afterProduct);
      lastProvenance = evaluateNewProductMediaProvenance({
        newProductId,
        postStartedMs,
        product: afterProduct,
      });
      lastAsync = classifyGelatoAsyncProductReadiness(
        {
          status: String(afterProduct?.status ?? ""),
          previewUrl: (afterProduct?.previewUrl as string | null) ?? null,
          productImages_count: images.length,
          variant_count: Array.isArray(afterProduct?.variants) ? afterProduct.variants.length : 0,
        },
        { elapsed_ms_since_create: Date.now() - postStartedMs },
      );
      polls.push({
        at: new Date().toISOString(),
        http: res.status,
        product_id: afterProduct?.id ?? null,
        status: afterProduct?.status ?? null,
        createdAt: afterProduct?.createdAt ?? null,
        updatedAt: afterProduct?.updatedAt ?? null,
        productImages: images,
        async_qc: lastAsync,
        media_provenance: lastProvenance,
      });
      const ready =
        lastProvenance.NEW_PRODUCT_MEDIA_PROVENANCE_QC === "PASS" &&
        (lastAsync.GELATO_ASYNC_PRODUCT_READINESS_QC === "ACTIVE_WITH_MEDIA" ||
          lastAsync.GELATO_ASYNC_PRODUCT_READINESS_QC === "PROCESSING");
      if (
        lastProvenance.NEW_PRODUCT_MEDIA_PROVENANCE_QC === "PASS" &&
        lastAsync.GELATO_ASYNC_PRODUCT_READINESS_QC === "ACTIVE_WITH_MEDIA"
      ) {
        break;
      }
      if (lastAsync.GELATO_ASYNC_PRODUCT_READINESS_QC === "PROVIDER_ERROR") break;
      if (lastAsync.GELATO_ASYNC_PRODUCT_READINESS_QC === "PROCESSING_TIMEOUT") break;
      if (ready && images.length > 0) break;
    }
  }

  const sourceDetail = evaluateSourceDetailSufficiencyQc({ upsampled_provider_asset: true });
  const productImages = snapshotProductImages(afterProduct);

  let result: Record<string, unknown> = {
    generated_at: new Date().toISOString(),
    scope: "LOT_LINE_CANDIDATE3_NEW_PRODUCT_PROBE",
    FROZEN_LINEAGE_PROBE_PRODUCT_ID,
    FOUNDER_SELECTED_RECREATION: "CANDIDATE_3",
    LOT_LINE_CANDIDATE3_NEW_PRODUCT_PROBE_AUTHORIZED: "NO",
    FORMAL_GELATO_WRITES_THIS_RUN: createRes.ok ? 1 : 0,
    GELATO_WRITE_CALLS_THIS_RUN: createRes.ok ? 1 : 0,
    POST_CREATE_PRODUCT_CALLS: createRes.ok ? 1 : 0,
    PUT_CALLS: 0,
    ENDPOINT_DISCOVERY_WRITES: 0,
    store_id: storeId,
    template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    template_variant_id: GELATO_GILDAN_5000_WHITE_M_VARIANT_ID,
    POST_HTTP: createRes.status,
    post_error: createError,
    NEW_PRODUCT_ID: newProductId,
    NEW_PRODUCT_CREATED_AT: afterProduct?.createdAt ?? null,
    NEW_PRODUCT_UPDATED_AT: afterProduct?.updatedAt ?? null,
    PRODUCT_IMAGE_IDS: productImages.map((i) => i.id),
    PRODUCT_IMAGE_CREATED_AT: productImages.map((i) => i.createdAt),
    PRODUCT_IMAGE_UPDATED_AT: productImages.map((i) => i.updatedAt),
    NEW_PRODUCT_MEDIA_PROVENANCE_QC: lastProvenance.NEW_PRODUCT_MEDIA_PROVENANCE_QC,
    media_provenance_reasons: lastProvenance.reasons,
    staging: {
      NEW_ASSET_URL: pf.NEW_ASSET_URL,
      NEW_ASSET_SHA256: pf.NEW_ASSET_SHA256,
      NEW_CANDIDATE3_PUBLIC_ASSET_QC: pf.NEW_CANDIDATE3_PUBLIC_ASSET_QC,
      STAGING_DEPLOY_ID: pf.STAGING_DEPLOY_ID,
      STAGING_HOST: pf.STAGING_HOST,
    },
    preflight_gates: pf,
    create: {
      api_operation: `POST ${createUrl.replace(GELATO_ECOMMERCE_API, "")}`,
      request_body: createBody,
      CREATE_BACK_FILE_NAME: CANDIDATE3_NEW_PRODUCT_PROBE_BACK_PLACEHOLDER_NAME,
      CREATE_BACK_FILE_URL: pf.NEW_ASSET_URL,
      CREATE_BACK_FIT_METHOD: "meet",
      CREATE_PAYLOAD_CREATIVE_IDENTITY_QC:
        pf.NEW_CANDIDATE3_PUBLIC_ASSET_QC === "PASS" ? "PASS" : "FAIL",
    },
    POST_PROCESSING: {
      STATUS: afterProduct?.status ?? null,
      GELATO_ASYNC_PRODUCT_READINESS_QC: lastAsync?.GELATO_ASYNC_PRODUCT_READINESS_QC ?? "UNKNOWN",
    },
    read_only_polls: polls,
    founder_procedure: {
      product_title: CANDIDATE3_NEW_PRODUCT_PROBE_TITLE,
      step: "Open ONLY this product → Edit designs → Back — DO NOT resize/reposition/save before first capture",
      capture_identity: ["FOUNDER_RENDERED_CREATIVE", "PROVIDER_ASSET_IDENTITY_QC"],
      capture_placement_after_identity_pass: [
        "INITIAL_BACK_PROVIDER_DPI",
        "INITIAL_FRAME_WIDTH_MM",
        "INITIAL_FRAME_HEIGHT_MM",
        "INITIAL_ART_SCALE_CLASSIFICATION",
        "INITIAL_CENTERING",
        "INITIAL_VERTICAL_POSITION",
        "INITIAL_COLLAR_CLEARANCE",
        "INITIAL_CLIPPING",
      ],
      preview_qc: [
        "CHECKERBOARD_VISIBLE",
        "MATTE_VISIBLE",
        "RECTANGULAR_BACKGROUND_VISIBLE",
        "MAGENTA_SPILL_VISIBLE",
      ],
    },
    founder_evidence: {
      FOUNDER_RENDERED_CREATIVE: null,
      PROVIDER_ASSET_IDENTITY_QC: "PENDING_FOUNDER",
      INITIAL_BACK_PROVIDER_DPI: null,
      INITIAL_FRAME_WIDTH_MM: null,
      INITIAL_FRAME_HEIGHT_MM: null,
      INITIAL_ART_SCALE_CLASSIFICATION: "PENDING_FOUNDER_AFTER_IDENTITY_PASS",
      INITIAL_CENTERING: "PENDING_FOUNDER",
      INITIAL_VERTICAL_POSITION: "PENDING_FOUNDER",
      INITIAL_COLLAR_CLEARANCE: "PENDING_FOUNDER",
      INITIAL_CLIPPING: "PENDING_FOUNDER",
    },
    visual_contract: {
      CHECKERBOARD_VISIBLE: "PENDING_FOUNDER",
      MATTE_VISIBLE: "PENDING_FOUNDER",
      RECTANGULAR_BACKGROUND_VISIBLE: "PENDING_FOUNDER",
      MAGENTA_SPILL_VISIBLE: "PENDING_FOUNDER",
    },
    qc: {
      PROVIDER_INITIAL_SCALE_QC: "PENDING_FOUNDER_AFTER_IDENTITY_PASS",
      PROVIDER_EFFECTIVE_DPI_QC: "PENDING_FOUNDER_AFTER_IDENTITY_PASS",
      GELATO_ACTUAL_PLACEMENT_QC: "PENDING_FOUNDER",
      GELATO_PRODUCT_CREATION_ASSET_BINDING_QC: "PENDING_FOUNDER",
      GELATO_PROVIDER_ASSET_INGESTION_QC: "PENDING_FOUNDER",
      APPAREL_PRINT_SCALE_AND_RESOLUTION_QC: "PENDING",
      BACK_PRODUCT_VISUAL_QC: "PENDING_FOUNDER",
    },
    profile_freeze_on_pass: {
      GILDAN_5000_LARGE_BACK_CREATIVE_STRATEGY: "FRESH_APPAREL_RECREATION_ULTRA_TIGHT",
      GELATO_FINAL_ARTWORK_BINDING_STRATEGY: "CREATE_WITH_FINAL_ARTWORK",
    },
    SOURCE_DETAIL_SUFFICIENCY_QC: sourceDetail.SOURCE_DETAIL_SUFFICIENCY_QC,
    holds: {
      MASS_PRODUCT_CREATION: "HOLD",
      MASS_PRODUCT_PUBLICATION: "HOLD",
      NEXT_GROK_BATCH: "HOLD",
      CT_LOT_LINE_1_FOUNDER_REVIEW: "PENDING",
    },
  };

  persist(result);
  return result;
}
