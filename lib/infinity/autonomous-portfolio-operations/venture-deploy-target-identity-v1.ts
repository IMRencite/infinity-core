import { CLUB_THROTTLE_VERCEL_PROJECT_ID } from "@/lib/infinity/commerce/club-throttle-vercel-production-env-audit";
import { CLUB_THROTTLE_STOREFRONT_PROJECT } from "@/lib/infinity/commerce/club-throttle-storefront-compose";
import {
  CRE_VENTURE_ID,
  CRE_VERCEL_PROJECT_ID,
  CRE_VERCEL_PROJECT_LIVE_NAME,
  OCCUPANCYNPV_DOMAIN,
} from "@/lib/infinity/venture-operating-scale/constants";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";

export const VENTURE_DEPLOY_TARGET_IDENTITY_QC_V1 = "VENTURE_DEPLOY_TARGET_IDENTITY_QC_V1" as const;

export type VentureDeployTarget = {
  venture_id: string;
  vercel_project_id: string;
  vercel_project_name: string;
  production_alias: string;
  deploy_adapter: "occupancynpv_organic_bundle" | "club_throttle_storefront";
};

export const VENTURE_DEPLOY_TARGETS: Record<string, VentureDeployTarget> = {
  [CRE_VENTURE_ID]: {
    venture_id: CRE_VENTURE_ID,
    vercel_project_id: CRE_VERCEL_PROJECT_ID,
    vercel_project_name: CRE_VERCEL_PROJECT_LIVE_NAME,
    production_alias: OCCUPANCYNPV_DOMAIN,
    deploy_adapter: "occupancynpv_organic_bundle",
  },
  occupancynpv: {
    venture_id: "occupancynpv",
    vercel_project_id: CRE_VERCEL_PROJECT_ID,
    vercel_project_name: CRE_VERCEL_PROJECT_LIVE_NAME,
    production_alias: OCCUPANCYNPV_DOMAIN,
    deploy_adapter: "occupancynpv_organic_bundle",
  },
  [CLUB_THROTTLE_VENTURE_ID]: {
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    vercel_project_id: CLUB_THROTTLE_VERCEL_PROJECT_ID,
    vercel_project_name: CLUB_THROTTLE_STOREFRONT_PROJECT,
    production_alias: "clubthrottle.com",
    deploy_adapter: "club_throttle_storefront",
  },
};

export function resolveVentureDeployTarget(venture_id: string): VentureDeployTarget | null {
  return VENTURE_DEPLOY_TARGETS[venture_id] ?? null;
}

export function ventureDeployTargetIdentityQc(input: {
  venture_id: string;
  expected_project_id: string;
}): "PASS" | "FAIL" {
  const target = resolveVentureDeployTarget(input.venture_id);
  if (!target) return "FAIL";
  return target.vercel_project_id === input.expected_project_id ? "PASS" : "FAIL";
}
