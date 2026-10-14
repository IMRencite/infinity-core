import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { clubThrottlePublicOrigin } from "./provider-print-area-binding-v1.ts";
import { resolveArtAssetUrl } from "./club-throttle-art-identity-registry.ts";
import { resolveFounderApprovalPin } from "./founder-visual-approval-artifact-pin-v1.ts";
import { isDarkGarmentColor, type ClubThrottleGarmentColorSlug } from "./club-throttle-apparel-color-v1.ts";

export const CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL =
  ".infinity/commerce/club-throttle-storefront-merch-manifest.json" as const;

const STALE_CANDIDATE3_MARKER = "candidate3-final-3600w-de2da007.png";

type ManifestRow = {
  sku: string;
  garment_color: string;
  hero_back_public?: string;
  fulfillment_back_public?: string;
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
    const hero = row.hero_back_public?.trim();
    const chosen = fulfillment || hero;
    if (!chosen) continue;
    map.set(`${row.sku}|${row.garment_color}`.toLowerCase(), chosen);
  }
  return map;
}

function productionPrintMasterRel(sku: string, garmentColor: string): string {
  return `.infinity/commerce/club-throttle-artwork/v40.2/${sku.toLowerCase()}-${garmentColor.toLowerCase()}-production-print-master-3600w.png`;
}

/** Production fulfillment URL — must be reachable by Gelato (clubthrottle.com storefront-merch). */
export function resolveClubThrottleFulfillmentPrintAssetUrl(input: {
  sku: string;
  garment_color: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}):
  | {
      ok: true;
      url: string;
      source:
        | "PRODUCTION_PRINT_MASTER"
        | "STOREFRONT_MERCH_MANIFEST"
        | "ART_IDENTITY_REGISTRY"
        | "CATALOG_DEFAULT";
    }
  | { ok: false; reason: string } {
  const cwd = input.cwd ?? process.cwd();
  const color = input.garment_color.trim().toLowerCase();
  const colorSlug = color as ClubThrottleGarmentColorSlug;
  const origin = clubThrottlePublicOrigin(input.env);
  const manifestPath = loadManifestFulfillmentPaths(cwd).get(`${input.sku}|${color}`.toLowerCase());

  const masterRel = productionPrintMasterRel(input.sku, color);
  const masterAbs = join(cwd, masterRel);
  if (existsSync(masterAbs)) {
    const publicPath = `/storefront-merch/production-masters/${input.sku.toLowerCase()}-${color}-production-print-master-3600w.png`;
    return { ok: true, url: `${origin}${publicPath}`, source: "PRODUCTION_PRINT_MASTER" };
  }

  if (isDarkGarmentColor(colorSlug)) {
    const pin = resolveFounderApprovalPin({ sku: input.sku, garment_color: colorSlug, cwd });
    const manifestStale = manifestPath?.includes(STALE_CANDIDATE3_MARKER);
    if (manifestStale || !manifestPath) {
      const art = resolveArtAssetUrl({ sku: input.sku, garment_color: colorSlug, cwd });
      if (art.ok && art.url.startsWith("https://")) {
        return { ok: true, url: art.url, source: "ART_IDENTITY_REGISTRY" };
      }
      if (pin && !existsSync(join(cwd, pin.local_asset_path))) {
        return { ok: false, reason: "FOUNDER_PINNED_ART_MISSING" };
      }
      return { ok: false, reason: manifestStale ? "STALE_MANIFEST_BLOCKED_AWAITING_PRINT_MASTER" : "FULFILLMENT_ART_URL_MISSING" };
    }
  }

  if (manifestPath) {
    const url = manifestPath.startsWith("http")
      ? manifestPath
      : `${origin}${manifestPath.startsWith("/") ? "" : "/"}${manifestPath}`;
    return { ok: true, url, source: "STOREFRONT_MERCH_MANIFEST" };
  }
  const art = resolveArtAssetUrl({ sku: input.sku, garment_color: colorSlug, cwd });
  if (art.ok && art.url.startsWith("https://")) {
    return { ok: true, url: art.url, source: "ART_IDENTITY_REGISTRY" };
  }
  const merch = CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((m) => m.sku === input.sku);
  if (merch?.public_asset_url?.startsWith("https://")) {
    return { ok: true, url: merch.public_asset_url, source: "CATALOG_DEFAULT" };
  }
  return { ok: false, reason: "FULFILLMENT_ART_URL_MISSING" };
}

export function futureFulfillmentArtworkIdentityQc(cwd = process.cwd()): "PASS" | "FAIL" {
  const sample = resolveClubThrottleFulfillmentPrintAssetUrl({
    sku: "LOT_LINE",
    garment_color: "black",
    cwd,
  });
  if (!sample.ok) return sample.reason === "STALE_MANIFEST_BLOCKED_AWAITING_PRINT_MASTER" ? "PASS" : "FAIL";
  return sample.url.includes(STALE_CANDIDATE3_MARKER) ? "FAIL" : "PASS";
}
