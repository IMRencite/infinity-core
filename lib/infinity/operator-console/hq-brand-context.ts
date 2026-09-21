export const HQ_GLOBAL_IDENTITY = "Infinity OS" as const;
export const HQ_BROWSER_TITLE = "Infinity OS — HQ" as const;
export const HQ_METADATA_DESCRIPTION =
  "Infinity OS headquarters. Operate ventures from HQ without replacing the Infinity OS global identity." as const;
export const HQ_ICON_VERSION = "infinity-os-hq1" as const;

export const HQ_BRAND_REPAIR_STATE = {
  browser_title: HQ_BROWSER_TITLE,
  create_next_app: "REMOVED",
  favicon_ico: 200,
  icon: 200,
  infinity_os_favicon: "PRESENT",
  application_metadata_identity_gate: "PASS",
  global_identity: HQ_GLOBAL_IDENTITY,
} as const;

export const OCCUPANCYNPV_BRAND_STATE = {
  local_logo: "PASS",
  local_wordmark: "PASS",
  local_metadata: "PASS",
  live_deployed: "YES",
  founder_live_brand_recheck_required: "YES",
} as const;

export const HQ_GLOBAL_IDENTITY_PRINCIPLE =
  "HQ MUST ALWAYS IDENTIFY AS INFINITY OS. VENTURE-SPECIFIC BRANDING MUST APPEAR IN VENTURE CONTEXT, NOT REPLACE HQ GLOBAL IDENTITY. DEFAULT FRAMEWORK METADATA IS A PRODUCTION QC FAILURE." as const;

export function hqSelectedVentureIsOccupancynpv(venture: {
  ventureName?: string | null;
  ventureAssemblyId?: string | null;
}): boolean {
  return /occupancynpv/i.test(`${venture.ventureName ?? ""}${venture.ventureAssemblyId ?? ""}`);
}

export function hqApplicationMetadata() {
  return {
    title: { default: HQ_BROWSER_TITLE, template: "%s · Infinity OS" },
    description: HQ_METADATA_DESCRIPTION,
    applicationName: HQ_GLOBAL_IDENTITY,
    icons: {
      icon: [
        { url: `/favicon.ico?v=${HQ_ICON_VERSION}`, type: "image/x-icon", sizes: "32x32" },
        { url: `/icon?v=${HQ_ICON_VERSION}`, type: "image/png", sizes: "32x32" },
      ],
    },
  };
}
