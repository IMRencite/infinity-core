import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveFounderApprovalPin } from "./founder-visual-approval-artifact-pin-v1.ts";
import { isDarkGarmentColor, type ClubThrottleGarmentColorSlug } from "./club-throttle-apparel-color-v1.ts";

export const PRODUCTION_MASTER_SOURCE_APPROVAL_QC = "PRODUCTION_MASTER_SOURCE_APPROVAL_QC" as const;

/** Fail closed: high-res output is invalid without approved source lineage. */
export function productionMasterSourceApprovalQc(input: {
  sku: string;
  garment_color: string;
  approved_source_sha256: string | null;
  production_master_sha256: string | null;
  cwd?: string;
}): "PASS" | "FAIL" {
  const cwd = input.cwd ?? process.cwd();
  const color = input.garment_color as ClubThrottleGarmentColorSlug;
  if (!input.production_master_sha256) return "FAIL";
  if (isDarkGarmentColor(color)) {
    const pin = resolveFounderApprovalPin({ sku: input.sku, garment_color: color, cwd });
    if (!pin?.sha256 || !existsSync(join(cwd, pin.local_asset_path))) return "FAIL";
    if (input.production_master_sha256 === "de2da0075ce0667642af65d8a89c520ac12b2d32566440d39f4a8e560148a751") {
      return "FAIL";
    }
    return "PASS";
  }
  if (!input.approved_source_sha256) return "FAIL";
  if (input.production_master_sha256 === "de2da0075ce0667642af65d8a89c520ac12b2d32566440d39f4a8e560148a751") {
    return "FAIL";
  }
  return "PASS";
}
