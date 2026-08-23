import { DEPLOYMENT_ACTION_TYPES } from "@/lib/infinity/governed-deployment-readiness/constants";

export const GOVERNED_DEPLOYMENT_EXECUTION_SCHEMA = "governed_deployment_execution_v1";

export const GOVERNED_EXECUTION_ACTION_TYPES = [
  ...DEPLOYMENT_ACTION_TYPES,
  "CONFIGURE_ENVIRONMENT",
  "BIND_DOMAIN",
  "VERIFY_HEALTH",
  "ROLLBACK_DEPLOYMENT",
] as const;

export type GovernedExecutionActionType = (typeof GOVERNED_EXECUTION_ACTION_TYPES)[number];

export const GOVERNED_EXECUTION_MODES = ["DRY_RUN", "SIMULATION", "LIVE"] as const;
export type GovernedExecutionMode = (typeof GOVERNED_EXECUTION_MODES)[number];

export const GOVERNED_EXECUTION_STATES = [
  "PENDING",
  "AUTHORIZED",
  "EXECUTING",
  "SUCCEEDED",
  "FAILED",
  "BLOCKED",
  "PARTIALLY_SUCCEEDED",
  "ROLLED_BACK",
] as const;
export type GovernedExecutionState = (typeof GOVERNED_EXECUTION_STATES)[number];

export const GOVERNED_EXECUTION_FAILURE_CODES = [
  "DEPLOYMENT_EXECUTION_NOT_READY",
  "DEPLOYMENT_EXECUTION_AUTHORITY_MISSING",
  "DEPLOYMENT_EXECUTION_TREASURY_DENIED",
  "DEPLOYMENT_EXECUTION_EAG_DENIED",
  "DEPLOYMENT_EXECUTION_PROVIDER_READ_ONLY",
  "DEPLOYMENT_EXECUTION_WRITE_CREDENTIAL_MISSING",
  "DEPLOYMENT_EXECUTION_UNKNOWN_COST",
  "DEPLOYMENT_EXECUTION_PROVIDER_FAILURE",
  "DEPLOYMENT_EXECUTION_PARTIAL_FAILURE",
  "DEPLOYMENT_EXECUTION_MIGRATION_FAILED",
  "DEPLOYMENT_EXECUTION_DNS_FAILED",
  "DEPLOYMENT_EXECUTION_HEALTHCHECK_FAILED",
  "DEPLOYMENT_EXECUTION_ROLLBACK_REQUIRED",
  "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH",
  "DEPLOYMENT_EXECUTION_LIVE_NOT_CONFIGURED",
  "DEPLOYMENT_EXECUTION_MODE_PROMOTION",
  "DEPLOYMENT_EXECUTION_PUBLIC_LAUNCH_SEPARATE",
  "DEPLOYMENT_EXECUTION_SECRET_LEAKAGE",
] as const;
export type GovernedExecutionFailureCode = (typeof GOVERNED_EXECUTION_FAILURE_CODES)[number];

export const DEFAULT_GOVERNED_EXECUTION_MODE: GovernedExecutionMode = "DRY_RUN";

export const EMPTY_SIDE_EFFECTS = {
  treasuryMovements: 0,
  treasuryReservations: 0,
  providerAccountCreation: 0,
  providerWrites: 0,
  purchases: 0,
  eagActions: 0,
  deployments: 0,
  domainPurchases: 0,
  dnsWrites: 0,
  paymentWrites: 0,
  productionMigrations: 0,
  webhookWrites: 0,
  publicLaunches: 0,
} as const;

export type ExecutionSideEffectCounts = {
  treasuryMovements: number;
  treasuryReservations: number;
  providerAccountCreation: number;
  providerWrites: number;
  purchases: number;
  eagActions: number;
  deployments: number;
  domainPurchases: number;
  dnsWrites: number;
  paymentWrites: number;
  productionMigrations: number;
  webhookWrites: number;
  publicLaunches: number;
};
