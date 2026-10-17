/** Gelato catalog order productUid (not Club Throttle store UUID). */

import {
  parseGelatoApparelGprPlacement,
  providerPrintConfigurationLabelFromProductUid,
  requiredGelatoOrderFileTypesForProductUid,
} from "./gelato-apparel-uid-semantics-v1.ts";

export const GELATO_CATALOG_BACK_ONLY_PRINT_PROFILE = "gpr_0-4_gildan_5000" as const;
export const GELATO_CATALOG_FRONT_ONLY_PRINT_PROFILE = "gpr_4-0_gildan_5000" as const;
export const GELATO_CATALOG_FRONT_AND_BACK_PRINT_PROFILE = "gpr_4-4_gildan_5000" as const;
export const GELATO_CATALOG_INLBL_PRINT_PROFILE = "gpr_4-4_inlbl_gildan_5000" as const;

export type GelatoCatalogPrintProfile = "BACK_ONLY" | "FRONT_ONLY" | "FRONT_AND_BACK" | "INLBL";

export function gelatoCatalogColorToken(colorSlug: string): string {
  return colorSlug.trim().toLowerCase();
}

export function gelatoCatalogSizeToken(size: string): string {
  return size.trim().toLowerCase();
}

export function buildGelatoCatalogOrderProductUid(input: {
  size: string;
  colorSlug: string;
  profile?: GelatoCatalogPrintProfile;
}): string {
  const profile = input.profile ?? "BACK_ONLY";
  const size = gelatoCatalogSizeToken(input.size);
  const color = gelatoCatalogColorToken(input.colorSlug);
  const gpr =
    profile === "INLBL"
      ? GELATO_CATALOG_INLBL_PRINT_PROFILE
      : profile === "FRONT_ONLY"
        ? GELATO_CATALOG_FRONT_ONLY_PRINT_PROFILE
        : profile === "FRONT_AND_BACK"
          ? GELATO_CATALOG_FRONT_AND_BACK_PRINT_PROFILE
          : GELATO_CATALOG_BACK_ONLY_PRINT_PROFILE;
  return `apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_${size}_gco_${color}_${gpr}`;
}

export function parseGelatoCatalogPrintProfileFromOrderProductUid(
  orderProductUid: string,
): GelatoCatalogPrintProfile | "UNKNOWN" {
  const placement = parseGelatoApparelGprPlacement(orderProductUid);
  if (placement === "FRONT_BACK_INNER_LABEL") return "INLBL";
  if (placement === "BACK_ONLY") return "BACK_ONLY";
  if (placement === "FRONT_ONLY") return "FRONT_ONLY";
  if (placement === "FRONT_AND_BACK") return "FRONT_AND_BACK";
  return "UNKNOWN";
}

export function providerPrintConfigurationFromOrderProductUid(orderProductUid: string): string {
  return providerPrintConfigurationLabelFromProductUid(orderProductUid);
}

/** Required Gelato order file types implied by catalog order productUid (official gpr semantics). */
export function requiredOrderFileTypesForCatalogProductUid(orderProductUid: string): string[] {
  return requiredGelatoOrderFileTypesForProductUid(orderProductUid);
}
