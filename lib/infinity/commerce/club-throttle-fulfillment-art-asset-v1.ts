import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { clubThrottlePublicOrigin } from "./provider-print-area-binding-v1.ts";
import { resolveArtAssetUrl } from "./club-throttle-art-identity-registry.ts";
import { isDarkGarmentColor, type ClubThrottleGarmentColorSlug } from "./club-throttle-apparel-color-v1.ts";
import {
  loadProductionArtRegistryV41,
  productionPrintMasterPublicRel,
  productionPrintMasterWorkspaceRel,
  resolveRegistryProductionUrl,
} from "./club-throttle-production-print-master-publisher-v1.ts";

export const CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL =
  ".infinity/commerce/club-throttle-storefront-merch-manifest.json" as const;

const STALE_CANDIDATE3_MARKER = "candidate3-final-3600w-de2da007.png";

type ManifestRow = {
  sku: string;
  garment_color: string;
  hero_back_public?: string;
  fulfillment_back_public?: string;
  production_print_master_sha256?: string;
};

function loadManifestFulfillmentPaths(cwd: string): Map<string, string> {
  const path = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  const map = new Map<string, string>();
  if (!existsSync(path)) return map;
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    colorways?: ManifestRow[];
    color_merch_rows?: ManifestRow[];
  };
  for (const row of parsed.color_merch_rows ?? parsed.colorways ?? []) {
    const fulfillment = row.fulfillment_back_public?.trim();
    if (!fulfillment || fulfillment.includes(STALE_CANDIDATE3_MARKER)) continue;
    map.set(`${row.sku}|${row.garment_color}`.toLowerCase(), fulfillment);
  }
  return map;
}

/** Production fulfillment URL — must be reachable by Gelato (clubthrottle.com). */
export function resolveClubThrottleFulfillmentPrintAssetUrl(input: {
  sku: string;
  garment_color: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}):
  | {
      ok: true;
      url: string;
      source: "PRODUCTION_ART_REGISTRY_V41" | "PRODUCTION_PRINT_MASTER" | "STOREFRONT_MERCH_MANIFEST" | "CATALOG_DEFAULT";
    }
  | { ok: false; reason: string } {
  const cwd = input.cwd ?? process.cwd();
  const color = input.garment_color.trim().toLowerCase();
  const colorSlug = color as ClubThrottleGarmentColorSlug;
  const origin = clubThrottlePublicOrigin(input.env);
  const registry = loadProductionArtRegistryV41(cwd);
  const registryUrl = resolveRegistryProductionUrl(registry, input.sku, color, origin);
  if (registryUrl && !registryUrl.includes(STALE_CANDIDATE3_MARKER)) {
    return { ok: true, url: registryUrl, source: "PRODUCTION_ART_REGISTRY_V41" };
  }

  const publicRel = productionPrintMasterPublicRel(input.sku, color);
  const publicAbs = join(cwd, "public", publicRel.replace(/^\//, ""));
  const workspaceAbs = join(cwd, productionPrintMasterWorkspaceRel(input.sku, color));
  if (existsSync(publicAbs) || existsSync(workspaceAbs)) {
    return { ok: true, url: `${origin}${publicRel}`, source: "PRODUCTION_PRINT_MASTER" };
  }

  if (isDarkGarmentColor(colorSlug)) {
    return { ok: false, reason: "PRODUCTION_ARTWORK_IDENTITY_NOT_PROVEN" };
  }

  const manifestPath = loadManifestFulfillmentPaths(cwd).get(`${input.sku}|${color}`.toLowerCase());
  if (manifestPath) {
    const url = manifestPath.startsWith("http")
      ? manifestPath
      : `${origin}${manifestPath.startsWith("/") ? "" : "/"}${manifestPath}`;
    if (url.includes(STALE_CANDIDATE3_MARKER)) {
      return { ok: false, reason: "PRODUCTION_ARTWORK_IDENTITY_NOT_PROVEN" };
    }
    return { ok: true, url, source: "STOREFRONT_MERCH_MANIFEST" };
  }

  const merch = CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((m) => m.sku === input.sku);
  if (merch?.public_asset_url?.startsWith("https://") && !merch.public_asset_url.includes(STALE_CANDIDATE3_MARKER)) {
    return { ok: true, url: merch.public_asset_url, source: "CATALOG_DEFAULT" };
  }
  return { ok: false, reason: "PRODUCTION_ARTWORK_IDENTITY_NOT_PROVEN" };
}

export function futureFulfillmentArtworkIdentityQc(cwd = process.cwd()): "PASS" | "FAIL" {
  const registry = loadProductionArtRegistryV41(cwd);
  if (!registry?.rows.length) return "FAIL";
  if (registry.rows.some((r) => r.identity_qc !== "PASS")) return "FAIL";
  const lotBlack = resolveClubThrottleFulfillmentPrintAssetUrl({
    sku: "LOT_LINE",
    garment_color: "black",
    cwd,
  });
  return lotBlack.ok && !lotBlack.url.includes(STALE_CANDIDATE3_MARKER) ? "PASS" : "FAIL";
}
