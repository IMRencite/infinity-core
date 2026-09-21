import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  VENTURE_BRAND_IDENTITY_CONTRACT,
  type VentureBrandIdentityContract,
} from "./contract";
import {
  OCCUPANCYNPV_BRAND_INK,
  OCCUPANCYNPV_BRAND_NAVY,
  OCCUPANCYNPV_BRAND_NAVY_DEEP,
  OCCUPANCYNPV_COMPACT_MARK_DARK,
  OCCUPANCYNPV_COMPACT_MARK_LIGHT,
  occupancynpvPrimaryLogoSvg,
} from "./logo";

export const OCCUPANCYNPV_BRAND_NAME = "OccupancyNPV" as const;

export function occupancynpvBrandIdentityContract(): VentureBrandIdentityContract {
  return {
    contract: VENTURE_BRAND_IDENTITY_CONTRACT,
    venture_id: CRE_VENTURE_ID,
    venture_name: OCCUPANCYNPV_BRAND_NAME,
    brand_name: OCCUPANCYNPV_BRAND_NAME,
    logo_type: "MARK_PLUS_WORDMARK",
    logo_asset: occupancynpvPrimaryLogoSvg({ variant: "light" }),
    logo_mark_asset: OCCUPANCYNPV_COMPACT_MARK_LIGHT,
    wordmark_asset: OCCUPANCYNPV_BRAND_NAME,
    favicon_asset: "favicon.ico?v=onpv2",
    primary_color: OCCUPANCYNPV_BRAND_NAVY,
    secondary_color: OCCUPANCYNPV_BRAND_NAVY_DEEP,
    accent_color: OCCUPANCYNPV_BRAND_NAVY,
    light_variant: occupancynpvPrimaryLogoSvg({ variant: "light" }),
    dark_variant: occupancynpvPrimaryLogoSvg({ variant: "dark" }),
    metadata_title: "OccupancyNPV — Lease NPV comparison",
    metadata_description:
      "OccupancyNPV compares commercial lease cash flows and NPV so brokers and occupiers can choose the lower-cost deal.",
    brand_status: "COMPLETE",
    verification_status: "SOURCE_PASS",
    archetype: "saas",
  };
}

export function occupancynpvPublicHeaderBrandMarkup(): string {
  return `<Link className="pv-nav-brand" href="/" aria-label="OccupancyNPV home" data-venture-brand="occupancynpv">
          <span className="pv-nav-logo" aria-hidden="true" data-venture-logo="compact">${OCCUPANCYNPV_COMPACT_MARK_LIGHT}</span>
          <span className="pv-nav-wordmark" data-venture-wordmark="true">OccupancyNPV</span>
        </Link>`;
}

export function occupancynpvAppHeaderBrandMarkup(): string {
  return `<a className="onpv-appbar-brand onpv-brand" href="/occupancynpv/app" aria-label="OccupancyNPV home" data-venture-brand="occupancynpv">
          <span className="onpv-brand-mark" aria-hidden="true" data-venture-logo="compact">${OCCUPANCYNPV_COMPACT_MARK_LIGHT}</span>
          <span className="onpv-brand-wordmark" data-venture-wordmark="true">OccupancyNPV</span>
        </a>`;
}

export { OCCUPANCYNPV_BRAND_INK, OCCUPANCYNPV_COMPACT_MARK_DARK };
