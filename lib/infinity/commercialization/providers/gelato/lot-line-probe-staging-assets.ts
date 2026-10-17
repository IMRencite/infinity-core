import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { CLUB_THROTTLE_STOREFRONT_PROJECT } from "@/lib/infinity/commerce/club-throttle-storefront-compose";
import {
  LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH,
  LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH,
  LOT_LINE_PROBE_BACK_ART_REL,
  createProbeBlank1x1PngBuffer,
} from "./lot-line-capability-probe";
import {
  validateLocalBackPlacementA,
  validateLocalTransparentPlaceholderPng,
} from "./lot-line-capability-probe-v2-plan";

export const PROBE_STAGING_HOSTING_REL =
  ".infinity/commerce/club-throttle-lot-line-gelato-probe-staging-hosting.json" as const;

export const PROBE_STAGING_REPAIR_REL =
  ".infinity/commerce/club-throttle-lot-line-gelato-probe-staging-repair.json" as const;

export const BACK_ART_STAGING_PATH = LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH;
export const BLANK_STAGING_PATH = LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH;

export const STAGING_BUNDLE_MANIFEST = [
  `public/${LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH}`,
  `public/${LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH}`,
  "vercel.json",
  "package.json",
] as const;

export const STAGING_DEPLOY_SCRIPT = "scripts/repair-lot-line-gelato-probe-staging-assets.mjs" as const;

export function probeStagingHostingPath(cwd = process.cwd()): string {
  return join(cwd, PROBE_STAGING_HOSTING_REL);
}

export function readProbeStagingHostingManifest(cwd = process.cwd()): {
  staging_host: string;
  deployment_id: string;
} | null {
  const path = probeStagingHostingPath(cwd);
  if (!existsSync(path)) return null;
  const row = JSON.parse(readFileSync(path, "utf8")) as {
    NEW_STAGING_HOST?: string;
    staging_host?: string;
    NEW_STAGING_DEPLOY_ID?: string;
    deployment_id?: string;
  };
  const host = (row.NEW_STAGING_HOST ?? row.staging_host ?? "").trim();
  const id = (row.NEW_STAGING_DEPLOY_ID ?? row.deployment_id ?? "").trim();
  if (!host) return null;
  return { staging_host: host.replace(/\/$/, ""), deployment_id: id };
}

export function writeProbeStagingHostingManifest(
  input: Record<string, unknown>,
  cwd = process.cwd(),
): void {
  const path = probeStagingHostingPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(input, null, 2)}\n`);
}

export async function inspectCurrentProbeStagingDeployment(cwd = process.cwd()): Promise<{
  CURRENT_STAGING_DEPLOY_ID: string | null;
  CURRENT_STAGING_HOST: string | null;
  BACK_ART_STAGING_PATH: string;
  back_art_http: number | null;
  blank_png_http: number | null;
  asset_manifest_on_host: { back: boolean; blank: boolean };
  source_bundle: readonly string[];
  build_deploy_script: string;
}> {
  loadServerEnvFromLocalFile(cwd);
  reloadVercelFromLocalFile(cwd);
  const vercel = new VercelDomainBindingAdapter();
  let deployId: string | null = null;
  let host: string | null = null;
  let backHttp: number | null = null;
  let blankHttp: number | null = null;
  let hasBack = false;
  let hasBlank = false;

  if (vercel.tokenPresent()) {
    const listed = await vercel.listDeployments(CLUB_THROTTLE_STOREFRONT_PROJECT, 25);
    for (const row of listed.deployments) {
      if (row.readyState !== "READY" || row.url === "UNKNOWN") continue;
      const base = row.url.startsWith("http") ? row.url.replace(/\/$/, "") : `https://${row.url}`.replace(/\/$/, "");
      const backUrl = `${base}/${BACK_ART_STAGING_PATH}`;
      try {
        const headBack = await fetch(backUrl, { method: "HEAD" });
        if (headBack.ok && /image\/png/i.test(headBack.headers.get("content-type") ?? "")) {
          deployId = row.id;
          host = base;
          backHttp = headBack.status;
          hasBack = true;
          const headBlank = await fetch(`${base}/${BLANK_STAGING_PATH}`, { method: "HEAD" });
          blankHttp = headBlank.status;
          hasBlank = headBlank.ok && /image\/png/i.test(headBlank.headers.get("content-type") ?? "");
          break;
        }
      } catch {
        continue;
      }
    }
  }

  const manifest = readProbeStagingHostingManifest(cwd);
  if (!host && manifest) {
    host = manifest.staging_host;
    deployId = manifest.deployment_id || null;
  }

  return {
    CURRENT_STAGING_DEPLOY_ID: deployId,
    CURRENT_STAGING_HOST: host,
    BACK_ART_STAGING_PATH,
    back_art_http: backHttp,
    blank_png_http: blankHttp,
    asset_manifest_on_host: { back: hasBack, blank: hasBlank },
    source_bundle: STAGING_BUNDLE_MANIFEST,
    build_deploy_script: STAGING_DEPLOY_SCRIPT,
  };
}

export function evaluatePublicUrlStability(url: string): {
  PUBLIC_URL_REQUIRES_AUTH: "NO" | "YES" | "UNKNOWN";
  PUBLIC_URL_HAS_EXPIRING_QUERY_TOKEN: "NO" | "YES" | "UNKNOWN";
  PUBLIC_URL_STABLE_FOR_ASYNC_PROVIDER_FETCH: "YES" | "NO";
} {
  let requiresAuth: "NO" | "YES" | "UNKNOWN" = "NO";
  let expiring: "NO" | "YES" | "UNKNOWN" = "NO";
  try {
    const u = new URL(url);
    const q = u.search.toLowerCase();
    if (
      /x-amz-expires|x-amz-signature|x-amz-credential|sig=|token=|expires=/i.test(q) ||
      u.search.length > 8
    ) {
      expiring = "YES";
    }
    if (/auth|login|sso/i.test(u.pathname)) requiresAuth = "YES";
  } catch {
    return {
      PUBLIC_URL_REQUIRES_AUTH: "UNKNOWN",
      PUBLIC_URL_HAS_EXPIRING_QUERY_TOKEN: "UNKNOWN",
      PUBLIC_URL_STABLE_FOR_ASYNC_PROVIDER_FETCH: "NO",
    };
  }
  const stable = requiresAuth === "NO" && expiring === "NO";
  return {
    PUBLIC_URL_REQUIRES_AUTH: requiresAuth,
    PUBLIC_URL_HAS_EXPIRING_QUERY_TOKEN: expiring,
    PUBLIC_URL_STABLE_FOR_ASYNC_PROVIDER_FETCH: stable ? "YES" : "NO",
  };
}

export async function validateBackArtPublicUrl(url: string): Promise<{
  BACK_ART_PUBLIC_URL: string;
  BACK_ART_HTTP: number;
  BACK_ART_CONTENT_TYPE: string | null;
  BACK_ART_DIMENSIONS: string;
  BACK_ART_ALPHA: "YES" | "NO";
  BACK_ART_URL_QC: "PASS" | "FAIL";
  final_url: string;
  body_is_png: boolean;
}> {
  const res = await fetch(url, { redirect: "follow" });
  const final_url = res.url;
  const content_type = res.headers.get("content-type");
  const fail = (): {
    BACK_ART_PUBLIC_URL: string;
    BACK_ART_HTTP: number;
    BACK_ART_CONTENT_TYPE: string | null;
    BACK_ART_DIMENSIONS: string;
    BACK_ART_ALPHA: "YES" | "NO";
    BACK_ART_URL_QC: "FAIL";
    final_url: string;
    body_is_png: boolean;
  } => ({
    BACK_ART_PUBLIC_URL: url,
    BACK_ART_HTTP: res.status,
    BACK_ART_CONTENT_TYPE: content_type,
    BACK_ART_DIMENSIONS: "unknown",
    BACK_ART_ALPHA: "NO",
    BACK_ART_URL_QC: "FAIL",
    final_url,
    body_is_png: false,
  });
  if (!res.ok) return fail();
  if (!content_type || !/image\/png/i.test(content_type)) return fail();
  if (/text\/html/i.test(content_type)) return fail();
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  if (meta.format !== "png") return fail();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w !== 3600 || h !== 4800) return fail();
  const stats = await sharp(buf).ensureAlpha().stats();
  const hasAlpha = meta.hasAlpha === true || (stats.channels[3]?.max ?? 255) <= 255;
  return {
    BACK_ART_PUBLIC_URL: url,
    BACK_ART_HTTP: res.status,
    BACK_ART_CONTENT_TYPE: content_type,
    BACK_ART_DIMENSIONS: `${w}x${h}`,
    BACK_ART_ALPHA: hasAlpha ? "YES" : "NO",
    BACK_ART_URL_QC: "PASS",
    final_url,
    body_is_png: true,
  };
}

export async function validateTransparentPlaceholderPublicUrl(url: string): Promise<{
  TRANSPARENT_PLACEHOLDER_PUBLIC_URL: string;
  TRANSPARENT_PLACEHOLDER_HTTP: number;
  TRANSPARENT_PLACEHOLDER_CONTENT_TYPE: string | null;
  TRANSPARENT_PLACEHOLDER_DIMENSIONS: string;
  TRANSPARENT_PIXEL_ALPHA: number;
  TRANSPARENT_PLACEHOLDER_QC: "PASS" | "FAIL";
  final_url: string;
}> {
  const res = await fetch(url, { redirect: "follow" });
  const final_url = res.url;
  const content_type = res.headers.get("content-type");
  const fail = (alpha = 255) => ({
    TRANSPARENT_PLACEHOLDER_PUBLIC_URL: url,
    TRANSPARENT_PLACEHOLDER_HTTP: res.status,
    TRANSPARENT_PLACEHOLDER_CONTENT_TYPE: content_type,
    TRANSPARENT_PLACEHOLDER_DIMENSIONS: "unknown",
    TRANSPARENT_PIXEL_ALPHA: alpha,
    TRANSPARENT_PLACEHOLDER_QC: "FAIL" as const,
    final_url,
  });
  if (!res.ok) return fail();
  if (!content_type || !/image\/png/i.test(content_type)) return fail();
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  if (meta.format !== "png" || meta.width !== 1 || meta.height !== 1) return fail();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = data[info.channels - 1] ?? 255;
  if (alpha > 0) return fail(alpha);
  return {
    TRANSPARENT_PLACEHOLDER_PUBLIC_URL: url,
    TRANSPARENT_PLACEHOLDER_HTTP: res.status,
    TRANSPARENT_PLACEHOLDER_CONTENT_TYPE: content_type,
    TRANSPARENT_PLACEHOLDER_DIMENSIONS: "1x1",
    TRANSPARENT_PIXEL_ALPHA: alpha,
    TRANSPARENT_PLACEHOLDER_QC: "PASS",
    final_url,
  };
}

export async function republishLotLineProbeStagingAssetBundle(cwd = process.cwd()): Promise<{
  NEW_STAGING_DEPLOY_ID: string;
  NEW_STAGING_HOST: string;
  backFileUrl: string;
  blankPngFileUrl: string;
  LOCAL_BACK_ART_QC: "PASS" | "FAIL";
  LOCAL_BLANK_PNG_QC: "PASS" | "FAIL";
  asset_manifest: readonly string[];
}> {
  const backLocal = await validateLocalBackPlacementA(cwd);
  const blankLocal = await validateLocalTransparentPlaceholderPng();
  const LOCAL_BACK_ART_QC: "PASS" | "FAIL" =
    backLocal.dimensions_qc === "PASS" && backLocal.alpha_qc === "PASS" && backLocal.reasons.length === 0
      ? "PASS"
      : "FAIL";
  const LOCAL_BLANK_PNG_QC = blankLocal.qc;
  if (LOCAL_BACK_ART_QC !== "PASS" || LOCAL_BLANK_PNG_QC !== "PASS") {
    throw new Error("LOCAL_PROBE_ASSET_QC_FAILED");
  }

  loadServerEnvFromLocalFile(cwd);
  reloadVercelFromLocalFile(cwd);
  const abs = join(cwd, LOT_LINE_PROBE_BACK_ART_REL);
  const pngBase64 = readFileSync(abs).toString("base64");
  const blankB64 = (await createProbeBlank1x1PngBuffer()).toString("base64");
  const vercelJson = JSON.stringify({ version: 2, public: true }, null, 2);
  const files = [
    { path: `public/${LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH}`, content: pngBase64, encoding: "base64" as const },
    { path: `public/${LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH}`, content: blankB64, encoding: "base64" as const },
    { path: "vercel.json", content: vercelJson, encoding: "utf8" as const },
    { path: "package.json", content: '{"private":true,"name":"gelato-probe-asset-staging"}\n', encoding: "utf8" as const },
  ];

  const vercel = new VercelDomainBindingAdapter();
  if (!vercel.tokenPresent()) throw new Error("VERCEL_TOKEN_MISSING");
  for (const file of files) {
    const uploaded = await vercel.uploadSourceFile(file);
    if (!uploaded.ok) throw new Error(uploaded.safeError ?? "VERCEL_UPLOAD_FAILED");
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
  if (!created.ok || created.id === "UNKNOWN") throw new Error(created.safeError ?? "VERCEL_DEPLOY_FAILED");

  let deploymentUrl = created.url.startsWith("http") ? created.url : `https://${created.url}`;
  for (let attempt = 0; attempt < 45; attempt++) {
    const status = await vercel.getDeployment(created.id);
    if (status.url && status.url !== "UNKNOWN") {
      deploymentUrl = status.url.startsWith("http") ? status.url : `https://${status.url}`;
    }
    if (status.readyState === "READY") break;
    if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
      throw new Error(status.safeError ?? "VERCEL_DEPLOY_NOT_READY");
    }
    await new Promise((r) => setTimeout(r, 4000));
  }

  const base = deploymentUrl.replace(/\/$/, "");
  const backFileUrl = `${base}/${LOT_LINE_PROBE_BACK_ART_PUBLIC_PATH}`;
  const blankPngFileUrl = `${base}/${LOT_LINE_PROBE_BLANK_PNG_PUBLIC_PATH}`;
  const [headBack, headBlank] = await Promise.all([
    fetch(backFileUrl, { method: "HEAD" }),
    fetch(blankPngFileUrl, { method: "HEAD" }),
  ]);
  if (!headBack.ok || !headBlank.ok) throw new Error("STAGING_PUBLIC_HEAD_FAILED");

  return {
    NEW_STAGING_DEPLOY_ID: created.id,
    NEW_STAGING_HOST: base,
    backFileUrl,
    blankPngFileUrl,
    LOCAL_BACK_ART_QC,
    LOCAL_BLANK_PNG_QC,
    asset_manifest: STAGING_BUNDLE_MANIFEST,
  };
}
