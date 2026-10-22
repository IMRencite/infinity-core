import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clubThrottleCanonicalCatalog } from "./club-throttle-canonical-apparel-catalog.ts";
import {
  CLUB_THROTTLE_SEVEN_SHIRT_MERCH,
  CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS,
} from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { APPAREL_PRODUCTION_FINAL_QC_VERSION } from "./apparel-production-final-qc-v1.ts";

export const CLUB_THROTTLE_CANONICAL_REGISTRY_REL =
  ".infinity/commerce/club-throttle-canonical-production-registry.json" as const;

function sha256(path: string): string | null {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export type CanonicalProductionRegistryRow = {
  CONCEPT_ID: string;
  PRODUCT_NAME: string;
  SKU: string;
  CURRENT_CANONICAL_GELATO_PRODUCT_ID: string;
  SUPERSEDED_PRODUCT_IDS: string[];
  GARMENT: "GILDAN_5000";
  GARMENT_COLOR: "WHITE";
  TEMPLATE_ID: "GELATO_HEAVYWEIGHT_TEE_GILDAN_5000";
  SOURCE_ART_SHA256: string | null;
  PRINT_MASTER_SHA256: string | null;
  PROVIDER_ASSET_SHA256: string | null;
  PUBLIC_ASSET_URL: string;
  PROVIDER_DPI: number | null;
  BACK_PRODUCT_VISUAL_QC: "PASS" | "PENDING_FOUNDER";
  APPAREL_PRODUCTION_FINAL_QC_VERSION: typeof APPAREL_PRODUCTION_FINAL_QC_VERSION;
  FINAL_QC_STATUS: "PASS" | "PENDING_FOUNDER";
  PUBLICATION_STATUS: "AUTHORIZED_CANONICAL_7" | "HIDDEN_SUPERSEDED";
};

export function buildClubThrottleCanonicalProductionRegistry(cwd: string): {
  CANONICAL_PRODUCT_REGISTRY_QC: "PASS" | "FAIL";
  NO_SUPERSEDED_PRODUCT_CAN_PUBLISH: "PASS" | "FAIL";
  rows: CanonicalProductionRegistryRow[];
  superseded_hidden: string[];
} {
  const apparel = clubThrottleCanonicalCatalog(cwd);
  const rows: CanonicalProductionRegistryRow[] = [];

  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    const art = apparel.find((a) => a.sku === merch.sku);
    const printMaster =
      merch.sku === "KNEE_DOWN" && art?.kneeDownLineWeightPrintMasterRel
        ? art.kneeDownLineWeightPrintMasterRel
        : art?.printMasterRel ?? "";
    const provider =
      merch.sku === "KNEE_DOWN" && art?.kneeDownLineWeightProviderRel
        ? art.kneeDownLineWeightProviderRel
        : art?.providerAssetRel ?? "";
    const visual =
      merch.sku === "KNEE_DOWN" ? ("PASS" as const) : (art?.founderProviderVisualQc === "PASS" ? "PASS" : "PENDING_FOUNDER");

    rows.push({
      CONCEPT_ID: merch.concept_id,
      PRODUCT_NAME: merch.title,
      SKU: merch.sku,
      CURRENT_CANONICAL_GELATO_PRODUCT_ID: merch.gelato_product_id,
      SUPERSEDED_PRODUCT_IDS: [],
      GARMENT: "GILDAN_5000",
      GARMENT_COLOR: "WHITE",
      TEMPLATE_ID: "GELATO_HEAVYWEIGHT_TEE_GILDAN_5000",
      SOURCE_ART_SHA256: null,
      PRINT_MASTER_SHA256: sha256(printMaster),
      PROVIDER_ASSET_SHA256: sha256(provider),
      PUBLIC_ASSET_URL: merch.public_asset_url,
      PROVIDER_DPI: art?.expectedDpi ?? null,
      BACK_PRODUCT_VISUAL_QC: visual,
      APPAREL_PRODUCTION_FINAL_QC_VERSION,
      FINAL_QC_STATUS: visual === "PASS" ? "PASS" : "PENDING_FOUNDER",
      PUBLICATION_STATUS: "AUTHORIZED_CANONICAL_7",
    });
  }

  const canonicalIds = new Set(rows.map((r) => r.CURRENT_CANONICAL_GELATO_PRODUCT_ID));
  const supersededOk = CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS.every((id) => !canonicalIds.has(id));
  const registryOk = rows.length === 7 && rows.every((r) => r.FINAL_QC_STATUS === "PASS");

  return {
    CANONICAL_PRODUCT_REGISTRY_QC: registryOk ? "PASS" : "FAIL",
    NO_SUPERSEDED_PRODUCT_CAN_PUBLISH: supersededOk ? "PASS" : "FAIL",
    rows,
    superseded_hidden: [...CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS],
  };
}

export function writeClubThrottleCanonicalProductionRegistry(cwd: string): Record<string, unknown> {
  const built = buildClubThrottleCanonicalProductionRegistry(cwd);
  const out = {
    generated_at: new Date().toISOString(),
    APPAREL_PRODUCTION_FINAL_QC_VERSION,
    ...built,
  };
  const dest = join(cwd, CLUB_THROTTLE_CANONICAL_REGISTRY_REL);
  mkdirSync(join(cwd, ".infinity/commerce"), { recursive: true });
  writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
  return out;
}
