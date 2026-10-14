import { join } from "node:path";
import {
  DEFAULT_DARK_GARMENT_TRANSFORMATION_RECIPE,
  linkFromLocalPath,
  type ProductionArtworkIdentityChain,
  PRODUCTION_ARTWORK_IDENTITY_CHAIN_V1,
  sha256File,
} from "./production-artwork-identity-chain-v1.ts";
import { GELATO_GILDAN5000_CANDIDATE3_FINAL_3600W_REL } from "./gelato-gildan5000-large-back-profile.ts";
import type { ClubThrottleGarmentColorSlug } from "./club-throttle-apparel-color-v1.ts";
import { resolveFounderApprovalPin } from "./founder-visual-approval-artifact-pin-v1.ts";

function darkAdaptedPath(sku: string): string {
  return `.infinity/commerce/club-throttle-artwork/dark-garment-adaptations/${sku.toLowerCase()}-black-garment-adapted.png`;
}

export async function buildLotLineProductionIdentityChain(
  cwd: string,
  input: {
    sku: string;
    garment_color: string;
    provider_payload_url?: string | null;
    production_master_rel?: string;
  },
): Promise<ProductionArtworkIdentityChain | null> {
  const pin = resolveFounderApprovalPin({
    sku: input.sku,
    garment_color: input.garment_color as ClubThrottleGarmentColorSlug,
    cwd,
  });
  const approvedRel = pin?.local_asset_path ?? darkAdaptedPath(input.sku);
  const productionMasterRel =
    input.production_master_rel ??
    `.infinity/commerce/club-throttle-artwork/v40.2/${input.sku.toLowerCase()}-${input.garment_color}-production-print-master-3600w.png`;

  const founder = await linkFromLocalPath({
    role: "PRODUCTION_PRINT_MASTER",
    relOrAbs: approvedRel,
    cwd,
    approved: true,
    revision: pin?.design_revision ?? "SELECTIVE_DARK_GARMENT_KEYLINE_V1",
  });

  const master = await linkFromLocalPath({
    role: "PRODUCTION_PRINT_MASTER",
    relOrAbs: productionMasterRel,
    cwd,
    approved: true,
    revision: pin?.design_revision ?? "PRODUCTION_PRINT_MASTER_V40_2",
  });

  const staleCandidate3 = await linkFromLocalPath({
    role: "PROVIDER_PAYLOAD_ART",
    relOrAbs: GELATO_GILDAN5000_CANDIDATE3_FINAL_3600W_REL,
    cwd,
    approved: false,
    revision: "CANDIDATE3_PRE_KEYLINE_RASTER",
  });

  return {
    version: PRODUCTION_ARTWORK_IDENTITY_CHAIN_V1,
    sku: input.sku,
    garment_color: input.garment_color,
    founder_approved_canonical_art: { ...founder, role: "STOREFRONT_PREVIEW" },
    production_master: master,
    production_raster: master.sha256 ? master : staleCandidate3,
    provider_payload: input.provider_payload_url
      ? {
          role: "PROVIDER_PAYLOAD_ART",
          path_or_url: input.provider_payload_url,
          sha256: null,
          width: staleCandidate3.width,
          height: staleCandidate3.height,
          revision: "GELATO_CACHED_OR_SUBMITTED",
          approved: false,
        }
      : staleCandidate3,
    transformation_recipe: DEFAULT_DARK_GARMENT_TRANSFORMATION_RECIPE,
    design_revision: pin?.design_revision ?? null,
    approval_revision: pin?.approved_at ?? null,
  };
}

export async function compareArtHashes(input: {
  approved_abs: string;
  candidate3_abs: string;
  cwd?: string;
}): Promise<{ match: boolean; approved_sha256: string | null; candidate3_sha256: string | null }> {
  const cwd = input.cwd ?? process.cwd();
  const approved = await sha256File(
    input.approved_abs.startsWith(".") ? join(cwd, input.approved_abs) : input.approved_abs,
  );
  const candidate3 = await sha256File(
    input.candidate3_abs.startsWith(".") ? join(cwd, input.candidate3_abs) : input.candidate3_abs,
  );
  return { match: Boolean(approved && candidate3 && approved === candidate3), approved_sha256: approved, candidate3_sha256: candidate3 };
}
