import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { artworkIdentityForSkuColor, type ClubThrottleGarmentColorSlug } from "./club-throttle-apparel-color-v1.ts";

export const CLUB_THROTTLE_ART_IDENTITY_REGISTRY_REL =
  ".infinity/commerce/club-throttle-art-identity-registry.json" as const;

export type ArtIdentityKind =
  | "CANONICAL_ART_AS_IS"
  | "APPROVED_LIGHT_GARMENT_ART"
  | "APPROVED_DARK_GARMENT_ART"
  | "UNSUPPORTED_COLOR";

export type ArtIdentityRow = {
  sku: string;
  garment_color: ClubThrottleGarmentColorSlug;
  art_identity: string;
  kind: ArtIdentityKind;
  asset_url: string;
  contrast_qc: "PASS" | "FAIL" | "PENDING";
};

export function defaultArtIdentityRows(cwd = process.cwd()): ArtIdentityRow[] {
  const rows: ArtIdentityRow[] = [];
  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    rows.push({
      sku: merch.sku,
      garment_color: "white",
      art_identity: artworkIdentityForSkuColor(merch.sku, "white"),
      kind: "APPROVED_LIGHT_GARMENT_ART",
      asset_url: merch.public_asset_url,
      contrast_qc: "PASS",
    });
  }
  return rows;
}

export function loadArtIdentityRegistry(cwd = process.cwd()): ArtIdentityRow[] {
  const path = join(cwd, CLUB_THROTTLE_ART_IDENTITY_REGISTRY_REL);
  if (!existsSync(path)) return defaultArtIdentityRows(cwd);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { rows?: ArtIdentityRow[] };
  return Array.isArray(parsed.rows) && parsed.rows.length ? parsed.rows : defaultArtIdentityRows(cwd);
}

export function resolveArtAssetUrl(input: {
  sku: string;
  garment_color: ClubThrottleGarmentColorSlug;
  cwd?: string;
}): { ok: true; url: string; kind: ArtIdentityKind } | { ok: false; reason: string } {
  const cwd = input.cwd ?? process.cwd();
  const color = input.garment_color.toLowerCase();
  const row = loadArtIdentityRegistry(cwd).find((r) => r.sku === input.sku && r.garment_color === color);
  if (!row || row.kind === "UNSUPPORTED_COLOR" || row.contrast_qc === "FAIL") {
    return { ok: false, reason: "ART_IDENTITY_UNSUPPORTED" };
  }
  if (!row.asset_url?.trim()) return { ok: false, reason: "ART_ASSET_MISSING" };
  let url = row.asset_url.trim();
  if (url.startsWith("/")) {
    const origin = process.env.CLUB_THROTTLE_PUBLIC_ORIGIN?.trim() || "https://clubthrottle.com";
    url = `${origin.replace(/\/$/, "")}${url}`;
  }
  return { ok: true, url, kind: row.kind };
}

export function writeArtIdentityRegistry(cwd: string, rows: ArtIdentityRow[]): void {
  const path = join(cwd, CLUB_THROTTLE_ART_IDENTITY_REGISTRY_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ generated_at: new Date().toISOString(), rows }, null, 2)}\n`);
}
