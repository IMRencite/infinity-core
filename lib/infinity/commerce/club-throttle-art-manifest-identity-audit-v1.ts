import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDarkGarmentColor } from "./club-throttle-apparel-color-v1.ts";
import { CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL } from "./club-throttle-fulfillment-art-asset-v1.ts";
import { resolveClubThrottleFulfillmentPrintAssetUrl } from "./club-throttle-fulfillment-art-asset-v1.ts";
import { resolveFounderApprovalPin } from "./founder-visual-approval-artifact-pin-v1.ts";
import { productionPrintArtworkIdentityQcFromChain } from "./production-print-artwork-identity-qc-v1.ts";
import { buildLotLineProductionIdentityChain } from "./club-throttle-lot-line-production-artwork-lineage-v1.ts";

export const COMMERCE_ART_ASSET_ROLE_SEPARATION_QC = "COMMERCE_ART_ASSET_ROLE_SEPARATION_QC" as const;

export type ArtManifestIdentityRow = {
  sku: string;
  garment_color: string;
  storefront_role: "STOREFRONT_HERO";
  production_master_sha256: string | null;
  fulfillment_url: string | null;
  fulfillment_source: string | null;
  founder_pin_sha256: string | null;
  identity_qc: "PASS" | "FAIL";
  notes: string[];
};

export async function auditClubThrottleArtManifestIdentity(cwd = process.cwd()): Promise<{
  EXPECTED_ART_ROWS: number;
  AUDITED_ART_ROWS: number;
  PASS_ART_ROWS: number;
  FAIL_ART_ROWS: number;
  CLUB_THROTTLE_ART_MANIFEST_IDENTITY_QC: "PASS" | "FAIL";
  LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC: "PASS" | "FAIL" | "PARTIAL";
  DARK_GARMENT_APPROVED_ART_IDENTITY_QC: "PASS" | "FAIL" | "PARTIAL";
  rows: ArtManifestIdentityRow[];
}> {
  const manifestPath = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as {
        color_merch_rows?: Array<{ sku: string; garment_color: string }>;
      })
    : { color_merch_rows: [] };
  const merchRows = manifest.color_merch_rows ?? [];
  const rows: ArtManifestIdentityRow[] = [];
  for (const item of merchRows) {
    const color = item.garment_color;
      const fulfillment = resolveClubThrottleFulfillmentPrintAssetUrl({
        sku: item.sku,
        garment_color: color,
        cwd,
      });
      const pin = resolveFounderApprovalPin({
        sku: item.sku,
        garment_color: color as "black",
        cwd,
      });
      const notes: string[] = [];
      let identity_qc: "PASS" | "FAIL" = "FAIL";
      if (isDarkGarmentColor(color) && pin) {
        const chain = await buildLotLineProductionIdentityChain(cwd, {
          sku: item.sku,
          garment_color: color,
          provider_payload_url: fulfillment.ok ? fulfillment.url : null,
        });
        identity_qc = productionPrintArtworkIdentityQcFromChain(chain);
        if (fulfillment.ok && fulfillment.url.includes("candidate3-final-3600w")) {
          notes.push("STALE_CANDIDATE3_MANIFEST_POINTER");
          identity_qc = "FAIL";
        }
      } else if (!isDarkGarmentColor(color)) {
        identity_qc = fulfillment.ok ? "PASS" : "FAIL";
      } else {
        notes.push("MISSING_FOUNDER_PIN");
      }
    rows.push({
      sku: item.sku,
      garment_color: item.garment_color,
      storefront_role: "STOREFRONT_HERO",
      production_master_sha256: pin?.sha256 ?? null,
      fulfillment_url: fulfillment.ok ? fulfillment.url : null,
      fulfillment_source: fulfillment.ok ? fulfillment.source : null,
      founder_pin_sha256: pin?.sha256 ?? null,
      identity_qc,
      notes,
    });
  }
  const pass = rows.filter((r) => r.identity_qc === "PASS").length;
  const fail = rows.length - pass;
  const darkRows = rows.filter((r) => isDarkGarmentColor(r.garment_color));
  const darkPass = darkRows.filter((r) => r.identity_qc === "PASS").length;
  return {
    EXPECTED_ART_ROWS: rows.length,
    AUDITED_ART_ROWS: rows.length,
    PASS_ART_ROWS: pass,
    FAIL_ART_ROWS: fail,
    CLUB_THROTTLE_ART_MANIFEST_IDENTITY_QC: fail === 0 ? "PASS" : "FAIL",
    LIVE_STOREFRONT_PRODUCTION_ART_IDENTITY_MATRIX_QC:
      fail === 0 ? "PASS" : pass > 0 ? "PARTIAL" : "FAIL",
    DARK_GARMENT_APPROVED_ART_IDENTITY_QC:
      darkPass === darkRows.length ? "PASS" : darkPass > 0 ? "PARTIAL" : "FAIL",
    rows,
  };
}
