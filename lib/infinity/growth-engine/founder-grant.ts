import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "./occupancynpv-experiment";

export const OCCUPANCYNPV_GROWTH_BOUNDED_SOURCE_GRANT =
  "FOUNDER_BOUNDED_OCCUPANCYNPV_GROWTH_PROSPECT_SOURCE_V1" as const;
export const OCCUPANCYNPV_GROWTH_BOUNDED_SEND_GRANT =
  "FOUNDER_BOUNDED_OCCUPANCYNPV_GROWTH_PER_PROSPECT_SEND_V1" as const;

export const OCCUPANCYNPV_BOUNDED_GROWTH_GRANT_PATH =
  ".infinity/growth-engine/occupancynpv-bounded-authorization-v1.json" as const;
export const OCCUPANCYNPV_GROWTH_BOUNDED_DEPLOY_GRANT =
  "FOUNDER_BOUNDED_OCCUPANCYNPV_GROWTH_ISOLATED_DEPLOY_V1" as const;

export type OccupancynpvBoundedGrowthGrant = {
  grant_id: "FOUNDER_BOUNDED_OCCUPANCYNPV_GROWTH_AUTHORIZATION_V1";
  campaign_id: typeof OCCUPANCYNPV_GROWTH_CAMPAIGN_ID;
  prospect_source: typeof OCCUPANCYNPV_GROWTH_BOUNDED_SOURCE_GRANT;
  per_prospect_send: typeof OCCUPANCYNPV_GROWTH_BOUNDED_SEND_GRANT;
  isolated_deploy: typeof OCCUPANCYNPV_GROWTH_BOUNDED_DEPLOY_GRANT;
  blanket_outreach: false;
  blanket_deployment: false;
  dirty_tree_deployment: false;
  askreview: false;
  daily_new_qualified_cap: 5;
  potential_healthy_cap: 10;
  recorded_at: string;
};

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_GROWTH_EXPERIMENT_PERSIST !== "1") return false;
  return true;
}

export function defaultOccupancynpvBoundedGrowthGrant(now = new Date().toISOString()): OccupancynpvBoundedGrowthGrant {
  return {
    grant_id: "FOUNDER_BOUNDED_OCCUPANCYNPV_GROWTH_AUTHORIZATION_V1",
    campaign_id: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
    prospect_source: OCCUPANCYNPV_GROWTH_BOUNDED_SOURCE_GRANT,
    per_prospect_send: OCCUPANCYNPV_GROWTH_BOUNDED_SEND_GRANT,
    isolated_deploy: OCCUPANCYNPV_GROWTH_BOUNDED_DEPLOY_GRANT,
    blanket_outreach: false,
    blanket_deployment: false,
    dirty_tree_deployment: false,
    askreview: false,
    daily_new_qualified_cap: 5,
    potential_healthy_cap: 10,
    recorded_at: now,
  };
}

export function readOccupancynpvBoundedGrowthGrant(): OccupancynpvBoundedGrowthGrant | null {
  if (process.env.VITEST && process.env.INFINITY_GROWTH_EXPERIMENT_PERSIST !== "1") {
    return defaultOccupancynpvBoundedGrowthGrant("vitest");
  }
  if (!existsSync(OCCUPANCYNPV_BOUNDED_GROWTH_GRANT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_BOUNDED_GROWTH_GRANT_PATH, "utf8")) as OccupancynpvBoundedGrowthGrant;
  } catch {
    return null;
  }
}

export function persistOccupancynpvBoundedGrowthGrant(
  grant = defaultOccupancynpvBoundedGrowthGrant(),
): OccupancynpvBoundedGrowthGrant {
  if (persistEnabled()) {
    mkdirSync(dirname(OCCUPANCYNPV_BOUNDED_GROWTH_GRANT_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_BOUNDED_GROWTH_GRANT_PATH, `${JSON.stringify(grant, null, 2)}\n`);
  }
  return grant;
}

export function occupancynpvBoundedGrowthGrantRecorded(): boolean {
  const grant = readOccupancynpvBoundedGrowthGrant();
  return Boolean(
    grant
    && grant.prospect_source === OCCUPANCYNPV_GROWTH_BOUNDED_SOURCE_GRANT
    && grant.per_prospect_send === OCCUPANCYNPV_GROWTH_BOUNDED_SEND_GRANT
    && grant.isolated_deploy === OCCUPANCYNPV_GROWTH_BOUNDED_DEPLOY_GRANT
    && grant.dirty_tree_deployment === false
    && grant.askreview === false,
  );
}
