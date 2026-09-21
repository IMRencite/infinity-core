import type { LeaseScenarioInput, LeaseScenarioResult } from "./npv";

export type OccupancynpvCustomer = {
  customer_id: string;
  venture_id: "occupancynpv";
  auth_identity_id: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OccupancynpvAuthSession = {
  auth_identity_id: string;
  customer_id: string;
  email: string;
};

export type DealWorkspace = {
  workspace_id: string;
  venture_id: "occupancynpv";
  customer_id: string;
  entitlement_id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  updated_at: string;
};

export type StoredLeaseScenario = {
  scenario_id: string;
  workspace_id: string;
  input: LeaseScenarioInput;
  result: LeaseScenarioResult | null;
};

export const OCCUPANCYNPV_SUPPORT_EMAIL = "infinitemediaresources@gmail.com" as const;
export const OCCUPANCYNPV_APP_DESTINATION = "/occupancynpv/app" as const;
export const OCCUPANCYNPV_COMPOSED_APP_DESTINATION = "/app" as const;
export const OCCUPANCYNPV_POST_PURCHASE_ROUTE = "/occupancynpv/app/checkout/complete" as const;
