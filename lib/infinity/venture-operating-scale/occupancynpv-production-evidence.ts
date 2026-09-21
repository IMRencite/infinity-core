import { existsSync, readFileSync } from "node:fs";

export const OCCUPANCYNPV_PRODUCTION_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-paid-product-deployment.json";

export type OccupancynpvProductionEvidence = {
  supabase_project_ref: string;
  identity_verified: boolean;
  migration: "20260907030000_occupancynpv_paid_product_v1.sql";
  migration_prior_state: "NOT_APPLIED" | "ALREADY_APPLIED" | "PARTIAL" | "CONFLICTING";
  migration_applied_this_mission: boolean;
  unrelated_migrations_applied: 0;
  tables_exist: boolean;
  durable_adapter: boolean;
  persistence_live_verified: boolean;
  paid_application_deployed: boolean;
  browser_verified: boolean;
  tenant_isolation_verified: boolean;
  production_auth_backend: "SUPABASE_AUTH" | "UNVERIFIED";
  deployment_id: string | null;
  artifact_id: string | null;
  digest: string | null;
  predecessor_artifact_id: string | null;
  predecessor_digest: string | null;
};

export function readOccupancynpvProductionEvidence(): OccupancynpvProductionEvidence | null {
  if (!existsSync(OCCUPANCYNPV_PRODUCTION_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_PRODUCTION_EVIDENCE_PATH, "utf8")) as OccupancynpvProductionEvidence;
  } catch {
    return null;
  }
}

export function occupancynpvDurablePersistenceProven(): boolean {
  const evidence = readOccupancynpvProductionEvidence();
  return Boolean(
    evidence?.identity_verified
    && evidence.tables_exist
    && evidence.durable_adapter
    && evidence.persistence_live_verified,
  );
}

export function occupancynpvProductProductionProven(): boolean {
  const evidence = readOccupancynpvProductionEvidence();
  return Boolean(evidence?.paid_application_deployed && evidence.browser_verified && evidence.tenant_isolation_verified);
}
