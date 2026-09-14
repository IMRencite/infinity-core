import { OCCUPANCYNPV_BRAND_NAME } from "@/lib/infinity/venture-brand-identity/occupancynpv";
import { ASKREVIEW_VENTURE_ID, ASKREVIEW_WORKING_NAME } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import type { CanonicalTreasuryVenture } from "./types";

export const TREASURY_OCCUPANCYNPV_NAME = OCCUPANCYNPV_BRAND_NAME;
export const TREASURY_ASKREVIEW_NAME = ASKREVIEW_WORKING_NAME;

export function occupancyNpvLifecycleState(): string {
  return occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" : "SELECTED";
}

export function canonicalTreasuryVentures(): CanonicalTreasuryVenture[] {
  return [
    {
      venture_id: CRE_VENTURE_ID,
      display_name: TREASURY_OCCUPANCYNPV_NAME,
      lifecycle_state: occupancyNpvLifecycleState(),
      production_state: occupancyNpvLifecycleState() === "PUBLICLY_LAUNCHED" ? "LIVE" : null,
      allocatable: true,
      reserve_only: false,
    },
    {
      venture_id: ASKREVIEW_VENTURE_ID,
      display_name: TREASURY_ASKREVIEW_NAME,
      lifecycle_state: "SELECTION_UNDER_REVIEW",
      production_state: "PRODUCTION PAUSED",
      allocatable: true,
      reserve_only: true,
    },
  ];
}

export function resolveCanonicalTreasuryVenture(ventureId: string): CanonicalTreasuryVenture | null {
  return canonicalTreasuryVentures().find((row) => row.venture_id === ventureId) ?? null;
}

export function isCanonicalTreasuryVentureId(ventureId: string): boolean {
  return resolveCanonicalTreasuryVenture(ventureId) != null;
}
