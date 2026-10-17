import { existsSync } from "node:fs";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { CLUB_THROTTLE_STOREFRONT_PROJECT } from "@/lib/infinity/commerce/club-throttle-storefront-compose";
import { join } from "node:path";
import sharp from "sharp";
import { GELATO_ECOMMERCE_API } from "./ecommerce-preflight";
import { GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID } from "./founder-templates";
import {
  LOT_LINE_PROBE_BACK_ART_REL,
  LOT_LINE_PROBE_TEE_TEMPLATE_VARIANT_ID,
  createProbeBlank1x1PngBuffer,
  LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH,
  LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH,
} from "./lot-line-capability-probe";
import {
  readProbeStagingHostingManifest,
  evaluatePublicUrlStability,
} from "./lot-line-probe-staging-assets";

export const CLUB_THROTTLE_GELATO_STORE_ID = "6b128d75-4444-4c9a-888c-28ab69497aac" as const;

export const PROBE_V2_PLAN_REL = ".infinity/commerce/club-throttle-lot-line-capability-probe-v2-plan.json" as const;

export const PROBE_V1_PRODUCT_ID = "aa6a074c-bec9-46d8-bd95-5645d70e4511" as const;

export type QcTri = "PASS" | "FAIL" | "UNKNOWN";

export type FounderTemplateMockupDashboardEvidence = {
  TEMPLATE_MOCKUP_READY: "YES";
  FRONT_MOCKUP_CONFIGURED: "YES";
  BACK_MOCKUP_CONFIGURED: "YES";
  PRIMARY_MOCKUP_VIEW: "FRONT";
  TEMPLATE_MOCKUP_CONFIGURATION_DASHBOARD_VERIFIED: "YES";
  detail_mockup_configured: "YES";
  evidence: "founder_gelato_select_mockups_screen_gildan_5000";
  notes: string[];
};

export function founderTemplateMockupDashboardEvidence(): FounderTemplateMockupDashboardEvidence {
  return {
    TEMPLATE_MOCKUP_READY: "YES",
    FRONT_MOCKUP_CONFIGURED: "YES",
    BACK_MOCKUP_CONFIGURED: "YES",
    PRIMARY_MOCKUP_VIEW: "FRONT",
    TEMPLATE_MOCKUP_CONFIGURATION_DASHBOARD_VERIFIED: "YES",
    detail_mockup_configured: "YES",
    evidence: "founder_gelato_select_mockups_screen_gildan_5000",
    notes: [
      "Front flat-lay selected and primary",
      "Back flat-lay selected",
      "Collar/detail mockup selected",
      "Closes prior TEMPLATE_MOCKUP_READY=UNKNOWN blocker — not a substitute for product-level mockup generation QC",
    ],
  };
}

export type Probe1Reclassification = {
  product_id: typeof PROBE_V1_PRODUCT_ID;
  PRODUCT_EXISTS: "YES";
  DASHBOARD_VARIANT_EXISTS: "YES";
  TEMPLATE_MOCKUPS_CONFIGURED: "YES";
  PRODUCT_THUMBNAIL: "BLANK_OR_BROKEN";
  VARIANT_THUMBNAIL: "BLANK_OR_BROKEN";
  API_previewUrl: "null";
  PRODUCT_RECORD_QC: "PASS";
  VARIANT_CREATION_QC: "PASS";
  MOCKUP_GENERATION_QC: "FAIL";
  BACK_RENDER_CAPABILITY: "STILL_UNPROVEN";
  FIRST_PROBE_PLACEHOLDER_HYGIENE_QC: "FAIL";
  suspected_defect_priority: ["INVALID_PLACEHOLDER_CONTENT"];
  suspected_defect_proven: false;
  suspected_defect_note: string;
  API_VISIBLE_VARIANTS: 0;
  DASHBOARD_VISIBLE_VARIANTS: "YES";
  API_VISIBLE_MOCKUPS: "NO";
  DASHBOARD_VISIBLE_MOCKUPS: "CONFIGURED_AT_TEMPLATE_NOT_ON_PRODUCT";
  dashboard_api_parity: string;
};

export function probe1Reclassification(): Probe1Reclassification {
  return {
    product_id: PROBE_V1_PRODUCT_ID,
    PRODUCT_EXISTS: "YES",
    DASHBOARD_VARIANT_EXISTS: "YES",
    TEMPLATE_MOCKUPS_CONFIGURED: "YES",
    PRODUCT_THUMBNAIL: "BLANK_OR_BROKEN",
    VARIANT_THUMBNAIL: "BLANK_OR_BROKEN",
    API_previewUrl: "null",
    PRODUCT_RECORD_QC: "PASS",
    VARIANT_CREATION_QC: "PASS",
    MOCKUP_GENERATION_QC: "FAIL",
    BACK_RENDER_CAPABILITY: "STILL_UNPROVEN",
    FIRST_PROBE_PLACEHOLDER_HYGIENE_QC: "FAIL",
    suspected_defect_priority: ["INVALID_PLACEHOLDER_CONTENT"],
    suspected_defect_proven: false,
    suspected_defect_note:
      "Probe #1 supplied Gelato sample PDF URLs for front_art.png and tag-art.png image placeholders — not proven root cause without explicit Gelato error.",
    API_VISIBLE_VARIANTS: 0,
    DASHBOARD_VISIBLE_VARIANTS: "YES",
    API_VISIBLE_MOCKUPS: "NO",
    DASHBOARD_VISIBLE_MOCKUPS: "CONFIGURED_AT_TEMPLATE_NOT_ON_PRODUCT",
    dashboard_api_parity:
      "Dashboard product/variant state may lead or diverge from GET /v1/stores/{storeId}/products/{productId}; do not let API-only QC override direct dashboard evidence.",
  };
}

export async function validateLocalBackPlacementA(cwd: string): Promise<{
  path: string;
  width: number;
  height: number;
  has_alpha: boolean;
  alpha_qc: QcTri;
  dimensions_qc: QcTri;
  reasons: string[];
}> {
  const path = join(cwd, LOT_LINE_PROBE_BACK_ART_REL);
  const reasons: string[] = [];
  if (!existsSync(path)) {
    return {
      path: LOT_LINE_PROBE_BACK_ART_REL,
      width: 0,
      height: 0,
      has_alpha: false,
      alpha_qc: "FAIL",
      dimensions_qc: "FAIL",
      reasons: ["file_missing"],
    };
  }
  const meta = await sharp(path).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width !== 3600 || height !== 4800) reasons.push(`expected_3600x4800_got_${width}x${height}`);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let samples = 0;
  for (let y = 0; y < info.height; y += 8) {
    for (let x = 0; x < info.width; x += 8) {
      samples += 1;
      const o = (y * info.width + x) * info.channels;
      if (data[o + 3]! < 16) transparent += 1;
    }
  }
  const has_alpha = meta.hasAlpha === true;
  const ratio = transparent / Math.max(samples, 1);
  if (!has_alpha) reasons.push("missing_alpha");
  if (ratio < 0.05) reasons.push("insufficient_transparent_pixels_for_back_art");
  return {
    path: LOT_LINE_PROBE_BACK_ART_REL,
    width,
    height,
    has_alpha,
    alpha_qc: reasons.some((r) => r.startsWith("missing_alpha") || r.includes("transparent")) ? "FAIL" : "PASS",
    dimensions_qc: width === 3600 && height === 4800 ? "PASS" : "FAIL",
    reasons,
  };
}

export async function validateLocalTransparentPlaceholderPng(): Promise<{
  width: number;
  height: number;
  alpha_transparent: boolean;
  qc: QcTri;
  reasons: string[];
}> {
  const buf = await createProbeBlank1x1PngBuffer();
  const meta = await sharp(buf).metadata();
  const stats = await sharp(buf).ensureAlpha().stats();
  const alphaMax = stats.channels[3]?.max ?? 255;
  const reasons: string[] = [];
  if (meta.width !== 1 || meta.height !== 1) reasons.push("not_1x1");
  if (alphaMax > 16) reasons.push("not_transparent");
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    alpha_transparent: alphaMax <= 16,
    qc: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export async function validatePublicPngUrl(url: string): Promise<{
  url: string;
  http_status: number;
  content_type: string | null;
  qc: QcTri;
  width?: number;
  height?: number;
  alpha_note?: string;
}> {
  const res = await fetch(url, { method: "GET" });
  const content_type = res.headers.get("content-type");
  if (!res.ok) {
    return { url, http_status: res.status, content_type, qc: "FAIL" };
  }
  if (!content_type || !/image\/png/i.test(content_type)) {
    return { url, http_status: res.status, content_type, qc: "FAIL" };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  return {
    url,
    http_status: res.status,
    content_type,
    qc: "PASS",
    width: meta.width,
    height: meta.height,
  };
}

export function buildProbeV2CreateBody(input: {
  backFileUrl: string;
  blankPngFileUrl: string;
}): Record<string, unknown> {
  return {
    templateId: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    title: "[CAPABILITY-PROBE-V2] Club Throttle Lot Line Tee — mockup QC",
    description:
      "Hidden Infinity capability probe. Provider mockup generation test only. Not for sale. Do not publish.",
    isVisibleInTheOnlineStore: false,
    variants: [
      {
        templateVariantId: LOT_LINE_PROBE_TEE_TEMPLATE_VARIANT_ID,
        imagePlaceholders: [
          { name: "front_art.png", fileUrl: input.blankPngFileUrl, fitMethod: "meet" },
          { name: "back_art.png", fileUrl: input.backFileUrl, fitMethod: "meet" },
          { name: "tag-art.png", fileUrl: input.blankPngFileUrl, fitMethod: "meet" },
        ],
      },
    ],
  };
}

export type ProbeV2PlanArtifact = {
  generated_at: string;
  execution_status: "PLAN_ONLY_NO_GELATO_WRITE";
  GELATO_WRITE_CALLS: 0;
  LOT_LINE_CAPABILITY_PROBE_AUTHORIZED: false;
  LOT_LINE_FINAL_DRAFT_PRODUCT_AUTHORIZED: false;
  template: FounderTemplateMockupDashboardEvidence;
  probe_1: Probe1Reclassification;
  probe_2: {
    store_id: string;
    template_id: string;
    template_variant_id: string;
    variant_label: "White / M";
    WRITE_ENDPOINT: string;
    WRITE_METHOD: "POST";
    request_body: Record<string, unknown>;
    placeholder_urls: {
      VALIDATED_BACK_PLACEMENT_A_URL: string | null;
      VALIDATED_TRANSPARENT_PNG_URL: string | null;
    };
    validation: {
      BACK_ART_LOCAL_QC: QcTri;
      BACK_ART_URL_QC: QcTri;
      TRANSPARENT_PLACEHOLDER_LOCAL_QC: QcTri;
      TRANSPARENT_PLACEHOLDER_URL_QC: QcTri;
      REQUEST_SCHEMA_QC: QcTri;
      details: Record<string, unknown>;
    };
    expected_provider_result: {
      evaluate: string[];
      success_minimum: "PRODUCT_MOCKUP_GENERATED = YES";
      success_preferred: "BACK_PROVIDER_RENDER_OBSERVED = YES";
      back_capability_rule: string;
      failure_rule: string;
    };
    SECOND_PROBE_AUTHORIZATION_READY: "YES" | "NO";
  };
  authorization: {
    STORE_SAFETY_QC: "PASS";
    LOT_LINE_CAPABILITY_PROBE_AUTHORIZED: false;
  };
  holds: {
    MASS_PRODUCT_CREATION: "HOLD";
    MASS_PRODUCT_PUBLICATION: "HOLD";
    NEXT_GROK_BATCH: "HOLD";
  };
  product_qc_preserved: {
    BACK_PRODUCT_VISUAL_QC: "BLOCKED";
    PRODUCT_VISUAL_QC: "BLOCKED";
    PROVIDER_FINAL_MOCKUP_QC: "NOT_RUN";
    CT_LOT_LINE_1_FOUNDER_REVIEW: "PENDING";
  };
};

export async function discoverExistingProbeArtifactHostingBase(cwd: string): Promise<string | null> {
  loadServerEnvFromLocalFile(cwd);
  reloadVercelFromLocalFile(cwd);
  const vercel = new VercelDomainBindingAdapter();
  if (!vercel.tokenPresent()) return null;
  const listed = await vercel.listDeployments(CLUB_THROTTLE_STOREFRONT_PROJECT, 20);
  for (const row of listed.deployments) {
    if (row.readyState !== "READY" || row.url === "UNKNOWN") continue;
    const base = row.url.startsWith("http") ? row.url.replace(/\/$/, "") : `https://${row.url}`.replace(/\/$/, "");
    const probeBack = `${base}/${LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH}`;
    try {
      const headBack = await fetch(probeBack, { method: "HEAD" });
      const backOk = headBack.ok && /image\/png/i.test(headBack.headers.get("content-type") ?? "");
      if (backOk) return base;
    } catch {
      continue;
    }
  }
  return null;
}

export async function buildLotLineCapabilityProbeV2Plan(cwd = process.cwd()): Promise<ProbeV2PlanArtifact> {
  const backLocal = await validateLocalBackPlacementA(cwd);
  const blankLocal = await validateLocalTransparentPlaceholderPng();

  const backUrlEnv = (process.env.GELATO_LOT_LINE_BACK_ART_PUBLIC_URL ?? "").trim();
  const blankUrlEnv = (process.env.GELATO_PROBE_BLANK_PNG_PUBLIC_URL ?? "").trim();
  let hostingBase = (process.env.GELATO_PROBE_ARTIFACT_HOSTING_BASE_URL ?? "").trim().replace(/\/$/, "");
  const hostingManifest = readProbeStagingHostingManifest(cwd);
  if (!hostingBase && hostingManifest?.staging_host) hostingBase = hostingManifest.staging_host;
  if (!hostingBase && !backUrlEnv) {
    hostingBase = (await discoverExistingProbeArtifactHostingBase(cwd)) ?? "";
  }

  let backUrl = backUrlEnv || (hostingBase ? `${hostingBase}/${LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH}` : "");
  let blankUrl = blankUrlEnv || (hostingBase ? `${hostingBase}/${LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH}` : "");

  let backUrlCheck: Awaited<ReturnType<typeof validatePublicPngUrl>> | null = null;
  let blankUrlCheck: Awaited<ReturnType<typeof validatePublicPngUrl>> | null = null;

  if (backUrl) {
    backUrlCheck = await validatePublicPngUrl(backUrl);
    if (backUrlCheck.qc === "PASS" && (backUrlCheck.width !== 3600 || backUrlCheck.height !== 4800)) {
      backUrlCheck = { ...backUrlCheck, qc: "FAIL" };
    }
  }
  if (blankUrl) {
    blankUrlCheck = await validatePublicPngUrl(blankUrl);
    if (blankUrlCheck.qc === "PASS" && (blankUrlCheck.width !== 1 || blankUrlCheck.height !== 1)) {
      blankUrlCheck = { ...blankUrlCheck, qc: "FAIL" };
    }
    if (blankUrlCheck.qc === "PASS") {
      const buf = Buffer.from(await (await fetch(blankUrl)).arrayBuffer());
      const stats = await sharp(buf).ensureAlpha().stats();
      if ((stats.channels[3]?.max ?? 255) > 16) blankUrlCheck = { ...blankUrlCheck, qc: "FAIL", alpha_note: "not_transparent" };
    }
  }

  const backLocalPass =
    backLocal.dimensions_qc === "PASS" && backLocal.alpha_qc === "PASS" && backLocal.reasons.length === 0;
  const BACK_ART_LOCAL_QC: QcTri = backLocalPass ? "PASS" : "FAIL";
  const BACK_ART_URL_QC: QcTri = backUrlCheck?.qc === "PASS" ? "PASS" : backUrl ? "FAIL" : "UNKNOWN";

  const TRANSPARENT_PLACEHOLDER_LOCAL_QC = blankLocal.qc;
  const TRANSPARENT_PLACEHOLDER_URL_QC: QcTri = blankUrlCheck?.qc === "PASS" ? "PASS" : blankUrl ? "FAIL" : "UNKNOWN";

  const urlsReady = BACK_ART_URL_QC === "PASS" && TRANSPARENT_PLACEHOLDER_URL_QC === "PASS";
  const backStable = backUrl && urlsReady ? evaluatePublicUrlStability(backUrl) : null;
  const blankStable = blankUrl && urlsReady ? evaluatePublicUrlStability(blankUrl) : null;
  const urlStabilityOk =
    backStable?.PUBLIC_URL_STABLE_FOR_ASYNC_PROVIDER_FETCH === "YES" &&
    blankStable?.PUBLIC_URL_STABLE_FOR_ASYNC_PROVIDER_FETCH === "YES";
  const schemaChecks = {
    store_id_valid: CLUB_THROTTLE_GELATO_STORE_ID.length >= 8,
    template_id_valid: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID.length >= 8,
    variant_id_valid: LOT_LINE_PROBE_TEE_TEMPLATE_VARIANT_ID.length >= 8,
    placeholder_names: ["front_art.png", "back_art.png", "tag-art.png"],
    visibility_false: true,
    single_variant: true,
    no_sales_channels: true,
    no_order_api: true,
    all_urls_https_png: urlsReady,
    url_stability: urlStabilityOk,
  };
  const REQUEST_SCHEMA_QC: QcTri =
    urlsReady &&
    BACK_ART_LOCAL_QC === "PASS" &&
    TRANSPARENT_PLACEHOLDER_LOCAL_QC === "PASS" &&
    urlStabilityOk &&
    schemaChecks.store_id_valid &&
    schemaChecks.template_id_valid &&
    schemaChecks.variant_id_valid
      ? "PASS"
      : "FAIL";

  const request_body =
    urlsReady && backUrl && blankUrl
      ? buildProbeV2CreateBody({ backFileUrl: backUrl, blankPngFileUrl: blankUrl })
      : buildProbeV2CreateBody({
          backFileUrl:
            backUrlCheck?.qc === "PASS" && backUrl ? backUrl : "https://REPLACE_WITH_VALIDATED_BACK_PLACEMENT_A_URL",
          blankPngFileUrl: "https://REPLACE_WITH_VALIDATED_TRANSPARENT_PNG_URL",
        });

  const SECOND_PROBE_AUTHORIZATION_READY: "YES" | "NO" =
    REQUEST_SCHEMA_QC === "PASS" &&
    founderTemplateMockupDashboardEvidence().TEMPLATE_MOCKUP_READY === "YES" &&
    founderTemplateMockupDashboardEvidence().BACK_MOCKUP_CONFIGURED === "YES" &&
    urlStabilityOk
      ? "YES"
      : "NO";

  return {
    generated_at: new Date().toISOString(),
    execution_status: "PLAN_ONLY_NO_GELATO_WRITE",
    GELATO_WRITE_CALLS: 0,
    LOT_LINE_CAPABILITY_PROBE_AUTHORIZED: false,
    LOT_LINE_FINAL_DRAFT_PRODUCT_AUTHORIZED: false,
    template: founderTemplateMockupDashboardEvidence(),
    probe_1: probe1Reclassification(),
    probe_2: {
      store_id: CLUB_THROTTLE_GELATO_STORE_ID,
      template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
      template_variant_id: LOT_LINE_PROBE_TEE_TEMPLATE_VARIANT_ID,
      variant_label: "White / M",
      WRITE_ENDPOINT: `${GELATO_ECOMMERCE_API}/v1/stores/${CLUB_THROTTLE_GELATO_STORE_ID}/products:create-from-template`,
      WRITE_METHOD: "POST",
      request_body,
      placeholder_urls: {
        VALIDATED_BACK_PLACEMENT_A_URL: urlsReady ? backUrl : null,
        VALIDATED_TRANSPARENT_PNG_URL: urlsReady ? blankUrl : null,
      },
      validation: {
        BACK_ART_LOCAL_QC,
        BACK_ART_URL_QC,
        TRANSPARENT_PLACEHOLDER_LOCAL_QC,
        TRANSPARENT_PLACEHOLDER_URL_QC,
        REQUEST_SCHEMA_QC,
        details: {
          back_local: backLocal,
          blank_local: blankLocal,
          back_url: backUrlCheck,
          blank_url: blankUrlCheck,
          url_resolution: {
            backUrlEnv: backUrlEnv ? "SET" : "ABSENT",
            blankUrlEnv: blankUrlEnv ? "SET" : "ABSENT",
            hostingBase: hostingBase ? "SET" : "ABSENT",
            hosting_manifest: hostingManifest,
            note: "Prefer .infinity/commerce/club-throttle-lot-line-gelato-probe-staging-hosting.json after repair script.",
            hosting_base_resolved: hostingBase || null,
          },
          url_stability: { back: backStable, blank: blankStable },
          request_schema_checks: schemaChecks,
        },
      },
      expected_provider_result: {
        evaluate: [
          "dashboard product thumbnail",
          "dashboard variant thumbnail",
          "dashboard product media/mockups",
          "API previewUrl",
          "API productImages if exposed",
          "downloadable mockup assets if exposed",
        ],
        success_minimum: "PRODUCT_MOCKUP_GENERATED = YES",
        success_preferred: "BACK_PROVIDER_RENDER_OBSERVED = YES",
        back_capability_rule:
          "BACK_RENDER_CAPABILITY = YES if dashboard shows rendered back mockup even when GET product exposes only previewUrl",
        failure_rule:
          "If image-only placeholders still yield blank thumbnails and null previewUrl after reasonable processing, MOCKUP_GENERATION_QC = FAIL — stop additional product writes; investigate provider/support",
      },
      SECOND_PROBE_AUTHORIZATION_READY,
    },
    authorization: {
      STORE_SAFETY_QC: "PASS",
      LOT_LINE_CAPABILITY_PROBE_AUTHORIZED: false,
    },
    holds: {
      MASS_PRODUCT_CREATION: "HOLD",
      MASS_PRODUCT_PUBLICATION: "HOLD",
      NEXT_GROK_BATCH: "HOLD",
    },
    product_qc_preserved: {
      BACK_PRODUCT_VISUAL_QC: "BLOCKED",
      PRODUCT_VISUAL_QC: "BLOCKED",
      PROVIDER_FINAL_MOCKUP_QC: "NOT_RUN",
      CT_LOT_LINE_1_FOUNDER_REVIEW: "PENDING",
    },
  };
}
