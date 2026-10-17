import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGelatoConfig } from "../commercialization/providers/gelato/config.ts";
import { GELATO_ECOMMERCE_API } from "../commercialization/providers/gelato/ecommerce-preflight.ts";
import { GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID } from "../commercialization/providers/gelato/founder-templates.ts";
import { CLUB_THROTTLE_GELATO_STORE_ID } from "../commercialization/providers/gelato/lot-line-capability-probe-v2-plan.ts";
import { GELATO_GILDAN_5000_WHITE_M_VARIANT_ID } from "./gelato-gildan-5000-print-areas.ts";
import { classifyGelatoAsyncProductReadiness } from "./gelato-async-product-readiness.ts";
import { evaluateNewProductMediaProvenance } from "./lot-line-candidate3-new-product-probe-execute.ts";

export const CANDIDATE3_CANONICAL_SLOT_PROBE_TITLE =
  "[CAPABILITY-PROBE-V4] Club Throttle Lot Line Tee — Canonical Back Slot QC" as const;

export const CANONICAL_BACK_PLACEHOLDER_NAME = "back_art.png" as const;

export const CANDIDATE3_CANONICAL_SLOT_PROBE_RESULT_REL =
  ".infinity/commerce/club-throttle-lot-line-candidate3-canonical-slot-probe-result.json" as const;

export const FROZEN_PROBE_PRODUCT_IDS = [
  "5dee8c0b-f190-4048-86d4-9bd0daa473b5",
  "bb7493c4-32e7-4b9d-8edd-7534031f41e3",
] as const;

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

export type CanonicalSlotProbePreflight = {
  BACK_PLACEHOLDER_NAME_CONFIRMED: "YES" | "NO";
  BACK_PLACEHOLDER_CANONICAL_NAME: string;
  BACK_PRINT_AREA_NAME: string;
  NEW_CANDIDATE3_PUBLIC_ASSET_QC: "PASS" | "FAIL";
  FRONT_PUBLIC_URL_QC: "PASS" | "FAIL";
  TAG_PUBLIC_URL_QC: "PASS" | "FAIL";
  CREATE_BACK_FILE_URL: string;
  NEW_ASSET_SHA256: string;
  FRONT_URL: string;
  TAG_URL: string;
};

export async function executeLotLineCandidate3CanonicalSlotProbe(input: {
  cwd?: string;
  preflight: CanonicalSlotProbePreflight;
}): Promise<Record<string, unknown>> {
  const cwd = input.cwd ?? process.cwd();
  const auth = (process.env.LOT_LINE_CANDIDATE3_CANONICAL_SLOT_PROBE_AUTHORIZED ?? "").trim().toUpperCase();
  if (auth !== "YES" && auth !== "TRUE" && auth !== "1") {
    throw new Error("LOT_LINE_CANDIDATE3_CANONICAL_SLOT_PROBE_NOT_AUTHORIZED");
  }

  const pf = input.preflight;
  if (pf.BACK_PLACEHOLDER_NAME_CONFIRMED !== "YES") throw new Error("BACK_PLACEHOLDER_NOT_CONFIRMED");
  for (const g of [pf.NEW_CANDIDATE3_PUBLIC_ASSET_QC, pf.FRONT_PUBLIC_URL_QC, pf.TAG_PUBLIC_URL_QC]) {
    if (g !== "PASS") throw new Error("PRE_WRITE_GATES_FAILED");
  }

  const config = loadGelatoConfig();
  if (!config.credentials) throw new Error("GELATO_CREDENTIALS_MISSING");

  const storeId = CLUB_THROTTLE_GELATO_STORE_ID;
  const createBody = {
    templateId: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    title: CANDIDATE3_CANONICAL_SLOT_PROBE_TITLE,
    description:
      "Hidden Infinity capability probe — canonical back_art.png slot + Candidate 3 immutable URL. Not for sale.",
    isVisibleInTheOnlineStore: false,
    variants: [
      {
        templateVariantId: GELATO_GILDAN_5000_WHITE_M_VARIANT_ID,
        imagePlaceholders: [
          { name: "front_art.png", fileUrl: pf.FRONT_URL, fitMethod: "meet" },
          { name: CANONICAL_BACK_PLACEHOLDER_NAME, fileUrl: pf.CREATE_BACK_FILE_URL, fitMethod: "meet" },
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

  process.env.LOT_LINE_CANDIDATE3_CANONICAL_SLOT_PROBE_AUTHORIZED = "NO";

  const newProductId = createJson?.id != null ? String(createJson.id) : null;
  if (newProductId && FROZEN_PROBE_PRODUCT_IDS.includes(newProductId as (typeof FROZEN_PROBE_PRODUCT_IDS)[number])) {
    throw new Error("CREATE_REUSED_FROZEN_PRODUCT_ID");
  }

  let afterProduct: Record<string, unknown> | null = createRes.ok ? createJson : null;
  const polls: Array<Record<string, unknown>> = [];
  let lastAsync: ReturnType<typeof classifyGelatoAsyncProductReadiness> | undefined;
  let lastProvenance = evaluateNewProductMediaProvenance({
    newProductId,
    postStartedMs,
    product: afterProduct,
  });

  const pollDelaysMs = [0, 30_000, 60_000, 120_000, 180_000, 300_000, 600_000] as const;

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
      if (
        lastProvenance.NEW_PRODUCT_MEDIA_PROVENANCE_QC === "PASS" &&
        lastAsync.GELATO_ASYNC_PRODUCT_READINESS_QC === "ACTIVE_WITH_MEDIA"
      ) {
        break;
      }
      if (lastAsync.GELATO_ASYNC_PRODUCT_READINESS_QC === "PROVIDER_ERROR") break;
    }
  }

  const productImages = snapshotProductImages(afterProduct);

  const result = {
    generated_at: new Date().toISOString(),
    scope: "LOT_LINE_CANDIDATE3_CANONICAL_SLOT_PROBE",
    DO_NOT_MODIFY_PRODUCT_IDS: [...FROZEN_PROBE_PRODUCT_IDS],
    LOT_LINE_CANDIDATE3_CANONICAL_SLOT_PROBE_AUTHORIZED: "NO",
    FORMAL_GELATO_WRITES_THIS_RUN: createRes.ok ? 1 : 0,
    GELATO_WRITE_CALLS_THIS_RUN: createRes.ok ? 1 : 0,
    POST_CREATE_PRODUCT_CALLS: createRes.ok ? 1 : 0,
    PUT_CALLS: 0,
    ENDPOINT_DISCOVERY_WRITES: 0,
    template_read: {
      template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
      BACK_PLACEHOLDER_CANONICAL_NAME: pf.BACK_PLACEHOLDER_CANONICAL_NAME,
      BACK_PLACEHOLDER_ID: null,
      BACK_PRINT_AREA_NAME: pf.BACK_PRINT_AREA_NAME,
      BACK_PLACEHOLDER_NAME_CONFIRMED: pf.BACK_PLACEHOLDER_NAME_CONFIRMED,
      template_api_evidence: ".infinity/commerce/.tmp-candidate3-canonical-slot-template-read.json",
    },
    POST_HTTP: createRes.status,
    post_error: createError,
    NEW_PRODUCT_ID: newProductId,
    NEW_PRODUCT_CREATED_AT: afterProduct?.createdAt ?? null,
    NEW_PRODUCT_UPDATED_AT: afterProduct?.updatedAt ?? null,
    PRODUCT_IMAGE_IDS: productImages.map((i) => i.id),
    PRODUCT_IMAGE_TIMESTAMPS: productImages.map((i) => ({
      id: i.id,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
    NEW_PRODUCT_MEDIA_PROVENANCE_QC: lastProvenance.NEW_PRODUCT_MEDIA_PROVENANCE_QC,
    media_provenance_reasons: lastProvenance.reasons,
    create: {
      CREATE_BACK_FILE_NAME: CANONICAL_BACK_PLACEHOLDER_NAME,
      CREATE_BACK_FILE_URL: pf.CREATE_BACK_FILE_URL,
      CREATE_BACK_FIT_METHOD: "meet",
      request_body: createBody,
    },
    POST_PROCESSING: {
      STATUS: afterProduct?.status ?? null,
      GELATO_ASYNC_PRODUCT_READINESS_QC: lastAsync?.GELATO_ASYNC_PRODUCT_READINESS_QC ?? "UNKNOWN",
    },
    read_only_polls: polls,
    founder_evidence: {
      FOUNDER_RENDERED_CREATIVE: null,
      GELATO_CREATE_PLACEHOLDER_BINDING_QC: "PENDING_FOUNDER",
      GELATO_PRODUCT_CREATION_ASSET_BINDING_QC: "PENDING_FOUNDER",
    },
    interpretation: {
      if_candidate_3: {
        GELATO_CREATE_PLACEHOLDER_BINDING_QC: "PASS",
        root_cause: "CREATE_FROM_TEMPLATE_REQUIRES_CANONICAL_PLACEHOLDER_NAME",
      },
      if_empty_back: {
        GELATO_CREATE_PLACEHOLDER_BINDING_QC: "FAIL",
        action: "STOP — investigate create-from-template placeholder schema",
      },
      if_old_original: {
        action: "STOP — deeper template/provider binding issue",
      },
    },
    founder_procedure: {
      product_title: CANDIDATE3_CANONICAL_SLOT_PROBE_TITLE,
      step: "Open ONLY V4 product → Edit designs → Back — no resize/save",
    },
    holds: {
      MASS_PRODUCT_CREATION: "HOLD",
      MASS_PRODUCT_PUBLICATION: "HOLD",
      NEXT_GROK_BATCH: "HOLD",
      CT_LOT_LINE_1_FOUNDER_REVIEW: "PENDING",
    },
  };

  writeFileSync(join(cwd, CANDIDATE3_CANONICAL_SLOT_PROBE_RESULT_REL), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
