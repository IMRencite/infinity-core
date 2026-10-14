import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { CURRENT_DARK_ART_TRANSFORM } from "./club-throttle-dark-garment-art-adaptation.ts";
import { SELECTIVE_DARK_GARMENT_KEYLINE_V1 } from "./club-throttle-selective-dark-garment-keyline-v1.ts";

export const PRODUCTION_ARTWORK_IDENTITY_CHAIN_V1 = "PRODUCTION_ARTWORK_IDENTITY_CHAIN_V1" as const;

export type CommerceArtAssetRole =
  | "STOREFRONT_PREVIEW"
  | "STOREFRONT_HERO"
  | "PRODUCTION_PRINT_MASTER"
  | "PROVIDER_PAYLOAD_ART";

export type ArtworkIdentityLink = {
  role: CommerceArtAssetRole;
  path_or_url: string;
  sha256: string | null;
  width: number | null;
  height: number | null;
  revision: string | null;
  approved: boolean;
};

export type ProductionArtworkIdentityChain = {
  version: typeof PRODUCTION_ARTWORK_IDENTITY_CHAIN_V1;
  sku: string;
  garment_color: string;
  founder_approved_canonical_art: ArtworkIdentityLink;
  production_master: ArtworkIdentityLink;
  production_raster: ArtworkIdentityLink;
  provider_payload: ArtworkIdentityLink | null;
  transformation_recipe: string;
  design_revision: string | null;
  approval_revision: string | null;
};

export async function sha256File(absPath: string): Promise<string | null> {
  if (!existsSync(absPath)) return null;
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

export async function pngDimensions(absPath: string): Promise<{ width: number; height: number } | null> {
  if (!existsSync(absPath)) return null;
  const meta = await sharp(absPath).metadata();
  if (!meta.width || !meta.height) return null;
  return { width: meta.width, height: meta.height };
}

export async function linkFromLocalPath(input: {
  role: CommerceArtAssetRole;
  relOrAbs: string;
  cwd?: string;
  approved?: boolean;
  revision?: string | null;
}): Promise<ArtworkIdentityLink> {
  const cwd = input.cwd ?? process.cwd();
  const abs = input.relOrAbs.startsWith("/") || /^[a-zA-Z]:/.test(input.relOrAbs)
    ? input.relOrAbs
    : join(cwd, input.relOrAbs);
  const dims = await pngDimensions(abs);
  return {
    role: input.role,
    path_or_url: input.relOrAbs,
    sha256: await sha256File(abs),
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    revision: input.revision ?? null,
    approved: input.approved ?? false,
  };
}

export function evaluateProductionPrintArtworkIdentityQc(input: {
  founder_approved_hash: string | null;
  production_master_hash: string | null;
  provider_payload_hash: string | null;
  lineage_proven: boolean;
}): "PASS" | "FAIL" {
  if (!input.lineage_proven) return "FAIL";
  if (!input.founder_approved_hash || !input.production_master_hash) return "FAIL";
  if (input.provider_payload_hash && input.provider_payload_hash !== input.production_master_hash) {
    return "FAIL";
  }
  return "PASS";
}

export const DEFAULT_DARK_GARMENT_TRANSFORMATION_RECIPE =
  `${CURRENT_DARK_ART_TRANSFORM} (${SELECTIVE_DARK_GARMENT_KEYLINE_V1})` as const;
