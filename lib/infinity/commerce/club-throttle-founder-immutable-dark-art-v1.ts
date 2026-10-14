import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_V1,
  type FounderVisualApprovalPin,
} from "./founder-visual-approval-artifact-pin-v1.ts";

/** Public storefront paths — bytes are founder-approved; do not regenerate in remediation. */
const IMMUTABLE_DARK_GARMENT_PUBLIC: Record<
  string,
  { rel: string; sha256: string; approved_at: string }
> = {
  LOT_LINE: {
    rel: "public/commerce-dark-garment/lot-line-black.png",
    sha256: "f45bf693fd3aa338e3b24e5598d45354f4347bdfd27351f3f22c243c10b4d8f1",
    approved_at: "2026-09-27T00:00:00.000Z",
  },
  BAGGER_SEND: {
    rel: "public/commerce-dark-garment/bagger-send-black.png",
    sha256: "f7bed0bcefcd9a9d2cc4b2ac8ddc2c86572b664be3bca03391829c84f66f9915",
    approved_at: "2026-09-27T00:00:00.000Z",
  },
  DUALSPORT_DUST: {
    rel: "public/commerce-dark-garment/dualsport-dust-black.png",
    sha256: "87c3d00043bcc50d224701cfd934b2c6075d25d2e0434db8e7df53d23bbd2c03",
    approved_at: "2026-09-27T00:00:00.000Z",
  },
  KNEE_DOWN: {
    rel: "public/commerce-dark-garment/knee-down-black.png",
    sha256: "b6c1aa5a431f48cf9582a1ad6f10ecb6def6d0c918bb386bf345880395c4490d",
    approved_at: "2026-09-27T00:00:00.000Z",
  },
  CLEAN_RPM: {
    rel: "public/commerce-dark-garment/clean-rpm-black.png",
    sha256: "b39e4334517dda5141e87d877ee1c7c7fcd299b31dbb3251fd9d83da4cb59d43",
    approved_at: "2026-09-27T00:00:00.000Z",
  },
  APEX_LINE: {
    rel: "public/commerce-dark-garment/apex-line-black.png",
    sha256: "b3d2e3085c47da9b7f943da7b2c718e500b68d2020fc3990969869c930ae81f8",
    approved_at: "2026-09-27T00:00:00.000Z",
  },
  ZERO_CHILL_GARAGE: {
    rel: "public/commerce-dark-garment/zero-chill-garage-black.png",
    sha256: "92d6d479a826067221ade5ea1303bbad8ee18b9819b9c2906c30ae82bdd873b0",
    approved_at: "2026-09-27T00:00:00.000Z",
  },
};

/** Pre-built production print masters — do not rebuild from stale raster sources. */
export const PINNED_PRODUCTION_PRINT_MASTERS: Record<
  string,
  Record<string, { workspaceRel: string; sha256: string }>
> = {
  LOT_LINE: {
    black: {
      workspaceRel:
        ".infinity/commerce/club-throttle-artwork/v40.2/lot_line-black-production-print-master-3600w.png",
      sha256: "04031af621d20bd20e58dc07ddde29eb48e73da6bf8d358b7435c2011ee6cb07",
    },
  },
};

export function sha256FileAbsSync(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export function resolveImmutableFounderDarkGarment(input: {
  cwd: string;
  sku: string;
  garment_color: string;
}): { publicAbs: string; publicRel: string; sha256: string; approved_at: string } | null {
  if (input.garment_color !== "black" && input.garment_color !== "dark-heather") return null;
  const entry = IMMUTABLE_DARK_GARMENT_PUBLIC[input.sku];
  if (!entry) return null;
  const publicAbs = join(input.cwd, entry.rel.replace(/\//g, "\\"));
  if (!existsSync(publicAbs)) return null;
  const onDisk = sha256FileAbsSync(publicAbs);
  if (onDisk !== entry.sha256) return null;
  return {
    publicAbs,
    publicRel: entry.rel.replace(/^public/, ""),
    sha256: entry.sha256,
    approved_at: entry.approved_at,
  };
}

export function ensureWorkspaceFounderDarkSource(input: {
  cwd: string;
  sku: string;
  garment_color: string;
  adaptedAbs: string;
}): { ok: true; sha256: string; adaptedRel: string } | { ok: false; reason: string } {
  const imm = resolveImmutableFounderDarkGarment(input);
  if (!imm) return { ok: false, reason: "NO_IMMUTABLE_FOUNDER_DARK_ART" };
  if (!existsSync(input.adaptedAbs) || sha256FileAbsSync(input.adaptedAbs) !== imm.sha256) {
    copyFileSync(imm.publicAbs, input.adaptedAbs);
  }
  const adaptedRel = `.infinity/commerce/club-throttle-artwork/dark-garment-adaptations/${input.sku.toLowerCase()}-${input.garment_color}-garment-adapted.png`;
  return { ok: true, sha256: imm.sha256, adaptedRel };
}

export function resolvePinnedProductionPrintMaster(input: {
  cwd: string;
  sku: string;
  garment_color: string;
}): { abs: string; rel: string; sha256: string } | null {
  const pinned = PINNED_PRODUCTION_PRINT_MASTERS[input.sku]?.[input.garment_color];
  if (!pinned) return null;
  const abs = join(input.cwd, pinned.workspaceRel);
  if (!existsSync(abs)) return null;
  const onDisk = sha256FileAbsSync(abs);
  if (onDisk !== pinned.sha256) return null;
  return { abs, rel: pinned.workspaceRel, sha256: pinned.sha256 };
}

export function founderImmutableDarkGarmentPin(input: {
  sku: string;
  garment_color: string;
  adaptedRel: string;
  sha256: string;
  width: number;
  height: number;
  approved_at: string;
}): FounderVisualApprovalPin {
  return {
    version: FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_V1,
    venture: "CLUB_THROTTLE",
    sku: input.sku,
    garment_color: input.garment_color as FounderVisualApprovalPin["garment_color"],
    design_revision: "SELECTIVE_DARK_GARMENT_KEYLINE_V1",
    asset_id: `${input.sku.toLowerCase()}-${input.garment_color}-garment-adapted`,
    local_asset_path: input.adaptedRel,
    sha256: input.sha256,
    width: input.width,
    height: input.height,
    transformation_recipe:
      "SOURCE_PRESERVE + SELECTIVE_DARK_GARMENT_KEYLINE_V1 + silhouette-adjacent clarification",
    approved_at: input.approved_at,
    approval_type: "FOUNDER_VISUAL_DARK_GARMENT",
  };
}
