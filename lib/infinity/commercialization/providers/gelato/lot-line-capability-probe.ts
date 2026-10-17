import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { loadGelatoConfig } from "./config";
import { GELATO_ECOMMERCE_API } from "./ecommerce-preflight";
import { GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID } from "./founder-templates";
import { resolveGelatoStoreForVenture } from "./venture-store-resolve";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { CLUB_THROTTLE_STOREFRONT_PROJECT } from "@/lib/infinity/commerce/club-throttle-storefront-compose";

/** White / M — single QC variant for Gildan 5000 template (Club Throttle). */
export const LOT_LINE_PROBE_TEE_TEMPLATE_VARIANT_ID = "1217f0b5-30d9-416f-83c2-bb83e19ae66a" as const;

export const LOT_LINE_PROBE_BACK_ART_REL =
  ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/placement-candidates/back-placement-a-3600x4800.png" as const;

/** Staging-only public path on club-throttle Vercel project (not production alias). */
export const LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH = "commerce-probe-gelato/lot-line-back-placement-a.png" as const;

export const LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH = "commerce-probe-gelato/blank-1x1-transparent.png" as const;

/** Canonical 1×1 fully transparent PNG for front/tag placeholders (no PDF, no third-party samples). */
export async function createProbeBlank1x1PngBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
}

export type LotLineCapabilityProbeAuthorization = {
  authorized: boolean;
  source: "env" | "founder_review" | "none";
};

export function readLotLineCapabilityProbeAuthorization(cwd = process.cwd()): LotLineCapabilityProbeAuthorization {
  const env = (process.env.LOT_LINE_CAPABILITY_PROBE_AUTHORIZED ?? "").trim().toUpperCase();
  if (env === "YES" || env === "TRUE" || env === "1") {
    return { authorized: true, source: "env" };
  }
  const reviewPath = join(cwd, ".infinity/commerce/club-throttle-founder-review/ct-lot-line-1/founder-review.json");
  if (existsSync(reviewPath)) {
    const fr = JSON.parse(readFileSync(reviewPath, "utf8")) as { LOT_LINE_CAPABILITY_PROBE_AUTHORIZED?: boolean };
    if (fr.LOT_LINE_CAPABILITY_PROBE_AUTHORIZED === true) {
      return { authorized: true, source: "founder_review" };
    }
  }
  return { authorized: false, source: "none" };
}

export function buildLotLineCapabilityProbeCreateBody(input: {
  backFileUrl: string;
  frontFileUrl?: string;
  tagFileUrl?: string;
}): Record<string, unknown> {
  const imagePlaceholders: Array<{ name: string; fileUrl: string; fitMethod?: string }> = [
    {
      name: "back_art.png",
      fileUrl: input.backFileUrl,
      fitMethod: "meet",
    },
  ];
  if (input.frontFileUrl) {
    imagePlaceholders.unshift({
      name: "front_art.png",
      fileUrl: input.frontFileUrl,
      fitMethod: "meet",
    });
  }
  if (input.tagFileUrl) {
    imagePlaceholders.push({
      name: "tag-art.png",
      fileUrl: input.tagFileUrl,
      fitMethod: "meet",
    });
  }
  return {
    templateId: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    title: "[CAPABILITY-PROBE] Club Throttle Lot Line Tee — back render QC",
    description:
      "Hidden Infinity capability probe — back provider render only. Not for sale. Do not publish.",
    isVisibleInTheOnlineStore: false,
    variants: [
      {
        templateVariantId: LOT_LINE_PROBE_TEE_TEMPLATE_VARIANT_ID,
        imagePlaceholders,
      },
    ],
  };
}

function isPublicHttpsUrl(url: string): boolean {
  if (!/^https:\/\//i.test(url)) return false;
  if (/localhost|127\.0\.0\.1/i.test(url)) return false;
  return true;
}

async function publishLotLineProbeBackArtToVercelStaging(
  cwd: string,
): Promise<{ backFileUrl: string; blankPngFileUrl: string; deployment_url: string }> {
  loadServerEnvFromLocalFile(cwd);
  reloadVercelFromLocalFile(cwd);
  const abs = join(cwd, LOT_LINE_PROBE_BACK_ART_REL);
  if (!existsSync(abs)) throw new Error("BACK_ART_FILE_MISSING");
  const pngBase64 = readFileSync(abs).toString("base64");
  const publicFile = `public/${LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH}`;
  const vercelJson = JSON.stringify(
    {
      version: 2,
      public: true,
    },
    null,
    2,
  );
  const blankPublic = `public/${LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH}`;
  const files = [
    { path: publicFile, content: pngBase64, encoding: "base64" as const },
    { path: blankPublic, content: (await createProbeBlank1x1PngBuffer()).toString("base64"), encoding: "base64" as const },
    { path: "vercel.json", content: vercelJson, encoding: "utf8" as const },
    { path: "package.json", content: '{"private":true,"name":"gelato-probe-asset-staging"}\n', encoding: "utf8" as const },
  ];
  const vercel = new VercelDomainBindingAdapter();
  if (!vercel.tokenPresent()) throw new Error("VERCEL_TOKEN_MISSING_FOR_PROBE_ART_HOST");
  for (const file of files) {
    const uploaded = await vercel.uploadSourceFile(file);
    if (!uploaded.ok) throw new Error(uploaded.safeError ?? "VERCEL_PROBE_ART_UPLOAD_FAILED");
  }
  const created = await vercel.createSourceBundleDeployment({
    projectName: CLUB_THROTTLE_STOREFRONT_PROJECT,
    files,
    target: "staging",
    projectSettings: {
      framework: null,
      buildCommand: "",
      installCommand: "",
      outputDirectory: "public",
    },
  });
  if (!created.ok || created.id === "UNKNOWN") {
    throw new Error(created.safeError ?? "VERCEL_PROBE_STAGING_DEPLOY_FAILED");
  }
  let deploymentUrl = created.url.startsWith("http") ? created.url : `https://${created.url}`;
  for (let attempt = 0; attempt < 45; attempt++) {
    const status = await vercel.getDeployment(created.id);
    if (status.url && status.url !== "UNKNOWN") {
      deploymentUrl = status.url.startsWith("http") ? status.url : `https://${status.url}`;
    }
    if (status.readyState === "READY") break;
    if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
      throw new Error(status.safeError ?? "VERCEL_PROBE_STAGING_NOT_READY");
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  const base = deploymentUrl.replace(/\/$/, "");
  const backFileUrl = `${base}/${LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH}`;
  const blankPngFileUrl = `${base}/${LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH}`;
  const head = await fetch(backFileUrl, { method: "HEAD" });
  if (!head.ok) throw new Error(`PROBE_ART_PUBLIC_HEAD_${head.status}`);
  return { backFileUrl, blankPngFileUrl, deployment_url: deploymentUrl };
}

export async function resolveLotLineProbeBackArtPublicUrl(cwd = process.cwd()): Promise<{
  backFileUrl: string;
  blankPngFileUrl: string;
  source: string;
  hosting?: { deployment_url: string };
}> {
  const fromEnv = (process.env.GELATO_LOT_LINE_BACK_ART_PUBLIC_URL ?? process.env.GELATO_PROBE_BACK_ART_PUBLIC_URL ?? "").trim();
  const blankFromEnv = (process.env.GELATO_PROBE_BLANK_PNG_PUBLIC_URL ?? "").trim();
  if (isPublicHttpsUrl(fromEnv)) {
    return {
      backFileUrl: fromEnv,
      blankPngFileUrl: isPublicHttpsUrl(blankFromEnv) ? blankFromEnv : fromEnv,
      source: "env",
    };
  }
  const hosted = await publishLotLineProbeBackArtToVercelStaging(cwd);
  return {
    backFileUrl: hosted.backFileUrl,
    blankPngFileUrl: hosted.blankPngFileUrl,
    source: "vercel_staging_static",
    hosting: { deployment_url: hosted.deployment_url },
  };
}

export type GelatoProductMediaScan = {
  product_id: string | null;
  status: string | null;
  isVisibleInTheOnlineStore: boolean | null;
  previewUrl: string | null;
  externalPreviewUrl: string | null;
  externalThumbnailUrl: string | null;
  media_related_keys: string[];
  url_fields: Array<{ path: string; url: string }>;
  back_labeled_fields: string[];
  BACK_VIEW_EVIDENCE: "YES" | "NO" | "UNKNOWN";
  MULTIPLE_VIEW_EVIDENCE: "YES" | "NO";
  TEE_BACK_PROVIDER_RENDER_AVAILABLE: "YES" | "NO" | "UNKNOWN";
  notes: string[];
};

function walkUrls(value: unknown, path: string, out: Array<{ path: string; url: string }>): void {
  if (typeof value === "string" && /^https:\/\//i.test(value)) {
    out.push({ path, url: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkUrls(v, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkUrls(v, path ? `${path}.${k}` : k, out);
    }
  }
}

export function scanGelatoStoreProductForBackMedia(product: Record<string, unknown> | null): GelatoProductMediaScan {
  const notes: string[] = [];
  if (!product) {
    return {
      product_id: null,
      status: null,
      isVisibleInTheOnlineStore: null,
      previewUrl: null,
      externalPreviewUrl: null,
      externalThumbnailUrl: null,
      media_related_keys: [],
      url_fields: [],
      back_labeled_fields: [],
      BACK_VIEW_EVIDENCE: "UNKNOWN",
      MULTIPLE_VIEW_EVIDENCE: "NO",
      TEE_BACK_PROVIDER_RENDER_AVAILABLE: "UNKNOWN",
      notes: ["product_null"],
    };
  }
  const url_fields: Array<{ path: string; url: string }> = [];
  walkUrls(product, "", url_fields);
  const media_related_keys = Object.keys(product).filter((k) =>
    /preview|image|media|mockup|url|view|front|back|thumbnail/i.test(k),
  );
  const back_labeled_fields = url_fields
    .filter(({ path }) => /back/i.test(path))
    .map(({ path }) => path);
  const previewScene =
    product.productVariantPreviewScene != null ? String(product.productVariantPreviewScene) : null;
  if (previewScene && /back/i.test(previewScene)) {
    notes.push("productVariantPreviewScene_indicates_back");
  } else if (previewScene && /front/i.test(previewScene)) {
    notes.push("productVariantPreviewScene_default_front_only");
  }
  const productImages = Array.isArray(product.productImages) ? product.productImages.length : 0;
  if (productImages > 0) notes.push(`productImages_count_${productImages}`);

  const previewUrl = product.previewUrl != null ? String(product.previewUrl) : null;
  const externalPreviewUrl = product.externalPreviewUrl != null ? String(product.externalPreviewUrl) : null;
  const externalThumbnailUrl = product.externalThumbnailUrl != null ? String(product.externalThumbnailUrl) : null;

  const distinctUrls = new Set(url_fields.map((u) => u.url));
  const MULTIPLE_VIEW_EVIDENCE = distinctUrls.size > 1 ? "YES" : "NO";

  let BACK_VIEW_EVIDENCE: "YES" | "NO" | "UNKNOWN" = "UNKNOWN";
  if (back_labeled_fields.length > 0) BACK_VIEW_EVIDENCE = "YES";
  else if (distinctUrls.size > 1) BACK_VIEW_EVIDENCE = "UNKNOWN";
  else if (previewUrl && distinctUrls.size === 1) {
    BACK_VIEW_EVIDENCE = "NO";
    notes.push("single_previewUrl_only_no_back_labeled_fields");
  }

  let TEE_BACK_PROVIDER_RENDER_AVAILABLE: "YES" | "NO" | "UNKNOWN" = "UNKNOWN";
  if (BACK_VIEW_EVIDENCE === "YES") TEE_BACK_PROVIDER_RENDER_AVAILABLE = "YES";
  else if (BACK_VIEW_EVIDENCE === "NO") TEE_BACK_PROVIDER_RENDER_AVAILABLE = "NO";

  return {
    product_id: product.id != null ? String(product.id) : null,
    status: product.status != null ? String(product.status) : null,
    isVisibleInTheOnlineStore:
      typeof product.isVisibleInTheOnlineStore === "boolean" ? product.isVisibleInTheOnlineStore : null,
    previewUrl,
    externalPreviewUrl,
    externalThumbnailUrl,
    media_related_keys,
    url_fields: url_fields.slice(0, 48),
    back_labeled_fields,
    BACK_VIEW_EVIDENCE,
    MULTIPLE_VIEW_EVIDENCE,
    TEE_BACK_PROVIDER_RENDER_AVAILABLE,
    notes,
  };
}

export async function pollGelatoStoreProduct(
  storeId: string,
  productId: string,
  options: { maxAttempts?: number; delayMs?: number; env?: NodeJS.Dict<string> } = {},
): Promise<{ http_status: number; product: Record<string, unknown> | null; attempts: number }> {
  const config = loadGelatoConfig(options.env ?? process.env);
  if (!config.credentials) return { http_status: 0, product: null, attempts: 0 };
  const maxAttempts = options.maxAttempts ?? 36;
  const delayMs = options.delayMs ?? 5000;
  let lastStatus = 0;
  let product: Record<string, unknown> | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(
      `${GELATO_ECOMMERCE_API}/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`,
      { headers: { "X-API-KEY": config.credentials.headerValue() } },
    );
    lastStatus = res.status;
    product = res.ok ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : null;
    const status = product?.status != null ? String(product.status).toLowerCase() : "";
    // Media may arrive after status=active — keep polling within async window (see gelato-async-product-readiness.ts).
    if (res.ok && (status === "active" || status === "published")) {
      const images = Array.isArray(product?.productImages) ? product.productImages.length : 0;
      if (product?.previewUrl || images > 0) {
        return { http_status: lastStatus, product, attempts: attempt };
      }
    }
    if (res.ok && status === "failed") {
      return { http_status: lastStatus, product, attempts: attempt };
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { http_status: lastStatus, product, attempts: maxAttempts };
}

export type LotLineCapabilityProbeResult = {
  generated_at: string;
  probe: "LOT_LINE_GELATO_BACK_RENDER_CAPABILITY";
  LOT_LINE_CAPABILITY_PROBE_AUTHORIZED: true;
  LOT_LINE_FINAL_DRAFT_PRODUCT_AUTHORIZED: false;
  GELATO_WRITE_CALLS: number;
  order_api_called: false;
  store_id: string;
  template_id: string;
  template_variant_id: string;
  back_art_source: string;
  back_art_hosting: { deployment_url: string } | null;
  create: { http_status: number; product_id: string | null; error: string | null };
  poll: { attempts: number; http_status: number; product_status: string | null };
  media: GelatoProductMediaScan;
  holds: {
    MASS_PRODUCT_CREATION: "HOLD";
    MASS_PRODUCT_PUBLICATION: "HOLD";
    NEXT_GROK_BATCH: "HOLD";
  };
  saved_assets: { preview_download_path: string | null };
};

export async function runLotLineGelatoCapabilityProbe(cwd = process.cwd()): Promise<LotLineCapabilityProbeResult> {
  const auth = readLotLineCapabilityProbeAuthorization(cwd);
  if (!auth.authorized) {
    throw new Error("LOT_LINE_CAPABILITY_PROBE_NOT_AUTHORIZED");
  }
  const resolved = await resolveGelatoStoreForVenture("club-throttle");
  if (resolved.status !== "READY") {
    throw new Error(`GELATO_STORE_NOT_READY:${resolved.status}`);
  }
  const storeId = resolved.binding.gelatoStoreId;
  const config = loadGelatoConfig();
  if (!config.credentials) throw new Error("GELATO_CREDENTIALS_MISSING");

  const backArt = await resolveLotLineProbeBackArtPublicUrl(cwd);
  const { backFileUrl, source: back_art_source } = backArt;
  const body = buildLotLineCapabilityProbeCreateBody({
    backFileUrl,
    frontFileUrl: backArt.blankPngFileUrl,
    tagFileUrl: backArt.blankPngFileUrl,
  });

  let writeCalls = 0;
  const createRes = await fetch(
    `${GELATO_ECOMMERCE_API}/v1/stores/${encodeURIComponent(storeId)}/products:create-from-template`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": config.credentials.headerValue(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  writeCalls += 1;
  const createJson = (await createRes.json().catch(() => null)) as Record<string, unknown> | null;
  const productId = createJson?.id != null ? String(createJson.id) : null;
  const createError = createRes.ok
    ? null
    : typeof createJson?.message === "string"
      ? createJson.message
      : JSON.stringify(createJson ?? { status: createRes.status }).slice(0, 500);

  let pollProduct = createJson;
  let pollMeta = { attempts: 0, http_status: createRes.status };
  if (productId) {
    const polled = await pollGelatoStoreProduct(storeId, productId);
    pollProduct = polled.product ?? pollProduct;
    pollMeta = { attempts: polled.attempts, http_status: polled.http_status };
  }

  const media = scanGelatoStoreProductForBackMedia(pollProduct);

  const outDir = join(cwd, ".infinity/commerce/club-throttle-founder-review/ct-lot-line-1/gelato-capability-probe");
  mkdirSync(outDir, { recursive: true });
  let preview_download_path: string | null = null;
  if (media.previewUrl) {
    try {
      const img = await fetch(media.previewUrl);
      if (img.ok) {
        const buf = Buffer.from(await img.arrayBuffer());
        preview_download_path = join(outDir, "probe-product-preview.png");
        writeFileSync(preview_download_path, buf);
        preview_download_path = preview_download_path.replace(/\\/g, "/");
      }
    } catch {
      preview_download_path = null;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    probe: "LOT_LINE_GELATO_BACK_RENDER_CAPABILITY",
    LOT_LINE_CAPABILITY_PROBE_AUTHORIZED: true,
    LOT_LINE_FINAL_DRAFT_PRODUCT_AUTHORIZED: false,
    GELATO_WRITE_CALLS: writeCalls,
    order_api_called: false,
    store_id: storeId,
    template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    template_variant_id: LOT_LINE_PROBE_TEE_TEMPLATE_VARIANT_ID,
    back_art_source,
    back_art_hosting: backArt.hosting ?? null,
    create: { http_status: createRes.status, product_id: productId, error: createError },
    poll: {
      attempts: pollMeta.attempts,
      http_status: pollMeta.http_status,
      product_status: media.status,
    },
    media,
    holds: {
      MASS_PRODUCT_CREATION: "HOLD",
      MASS_PRODUCT_PUBLICATION: "HOLD",
      NEXT_GROK_BATCH: "HOLD",
    },
    saved_assets: { preview_download_path },
  };
}
