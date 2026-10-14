import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import sharp from "sharp";

export const CLUB_THROTTLE_PRODUCTION_ART_REGISTRY_V41_REL =
  ".infinity/commerce/club-throttle-production-art-registry-v41.json" as const;

export const PRODUCTION_MASTER_PUBLIC_PREFIX = "/storefront-merch/production-masters" as const;

export type ProductionArtRegistryRowV41 = {
  sku: string;
  garment_color: string;
  customer_visible: boolean;
  garment_class: "light" | "dark" | "neutral";
  founder_approved_source_rel: string | null;
  founder_approved_source_sha256: string | null;
  production_print_master_rel: string;
  production_print_master_sha256: string;
  production_print_master_dimensions: string;
  effective_dpi: number | null;
  transformation_recipe: string;
  storefront_hero_public: string | null;
  provider_payload_public: string;
  provider_payload_url: string;
  identity_qc: "PASS" | "FAIL";
  failure_class: string | null;
};

export type ProductionArtRegistryV41 = {
  version: "CLUB_THROTTLE_PRODUCTION_ART_REGISTRY_V41";
  updated_at: string;
  origin: string;
  rows: ProductionArtRegistryRowV41[];
};

export function productionPrintMasterWorkspaceRel(sku: string, garmentColor: string): string {
  return `.infinity/commerce/club-throttle-artwork/v41/production-masters/${sku.toLowerCase()}-${garmentColor.toLowerCase()}-production-print-master-3600w.png`;
}

export function productionPrintMasterPublicRel(sku: string, garmentColor: string): string {
  return `${PRODUCTION_MASTER_PUBLIC_PREFIX}/${sku.toLowerCase()}-${garmentColor.toLowerCase()}-production-print-master-3600w.png`;
}

export async function sha256FileAbs(abs: string): Promise<string> {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export async function publishProductionMasterToPublic(input: {
  sku: string;
  garment_color: string;
  workspaceAbs: string;
  cwd?: string;
}): Promise<{ publicRel: string; publicAbs: string; sha256: string; dimensions: string }> {
  const cwd = input.cwd ?? process.cwd();
  if (!existsSync(input.workspaceAbs)) throw new Error("PRODUCTION_MASTER_MISSING");
  const publicRel = productionPrintMasterPublicRel(input.sku, input.garment_color);
  const publicAbs = join(cwd, "public", publicRel.replace(/^\//, ""));
  mkdirSync(dirname(publicAbs), { recursive: true });
  copyFileSync(input.workspaceAbs, publicAbs);
  const meta = await sharp(publicAbs).metadata();
  const sha256 = await sha256FileAbs(publicAbs);
  return {
    publicRel,
    publicAbs,
    sha256,
    dimensions: `${meta.width ?? 0}x${meta.height ?? 0}`,
  };
}

export function loadProductionArtRegistryV41(cwd = process.cwd()): ProductionArtRegistryV41 | null {
  const path = join(cwd, CLUB_THROTTLE_PRODUCTION_ART_REGISTRY_V41_REL);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ProductionArtRegistryV41;
}

export function saveProductionArtRegistryV41(cwd: string, registry: ProductionArtRegistryV41): void {
  const path = join(cwd, CLUB_THROTTLE_PRODUCTION_ART_REGISTRY_V41_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
}

export function resolveRegistryProductionUrl(
  registry: ProductionArtRegistryV41 | null,
  sku: string,
  garmentColor: string,
  origin: string,
): string | null {
  const row = registry?.rows.find(
    (r) => r.sku === sku && r.garment_color.toLowerCase() === garmentColor.toLowerCase(),
  );
  if (!row || row.identity_qc !== "PASS") return null;
  return row.provider_payload_url.startsWith("http")
    ? row.provider_payload_url
    : `${origin.replace(/\/+$/, "")}${row.provider_payload_public}`;
}
