import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV,
  ORGANIZATION_EXTERNAL_AUTONOMY_POLICY_VERSION,
  parseAutonomousCostEnv,
  AUTONOMOUS_EXTERNAL_MAX_ACTION_COST_ENV,
  AUTONOMOUS_EXTERNAL_MAX_DAILY_COST_ENV,
  AUTONOMOUS_EXTERNAL_MAX_VENTURE_COST_ENV,
  AUTONOMOUS_ELIGIBLE_ACTION_TYPES,
} from "./constants";
import { PROVIDER_KEYS } from "../provider-config";

export type OrganizationAutonomyPolicy = {
  organizationId: string;
  externalAutonomyEnabled: boolean;
  maxAutoRisk: "low" | "moderate" | "high" | "critical";
  maxActionCostUsd: number;
  maxDailyCostUsd: number;
  maxVentureCostUsd: number;
  allowedActionTypes: string[];
  allowedProviders: string[];
  prohibitedActionTypes: string[];
  humanApprovalActionTypes: string[];
  policyVersion: string;
  controlledDevelopmentOrg: boolean;
};

const DEFAULT_PROHIBITED = [
  "domain.register",
  "dns.configure",
  "email.send",
  "social.publish",
  "advertising.create_campaign",
  "payment.configure",
  "purchase.create",
  "account.create",
  "affiliate.apply",
];

export async function loadOrganizationAutonomyPolicy(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<OrganizationAutonomyPolicy> {
  const controlledOrgId = process.env[AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV]?.trim() ?? "";
  const controlledDevelopmentOrg =
    controlledOrgId.length > 0 && controlledOrgId === organizationId;

  const { data: row } = await admin
    .from("organization_external_autonomy_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const envMaxAction = parseAutonomousCostEnv(AUTONOMOUS_EXTERNAL_MAX_ACTION_COST_ENV, 0);
  const envMaxDaily = parseAutonomousCostEnv(AUTONOMOUS_EXTERNAL_MAX_DAILY_COST_ENV, 0);
  const envMaxVenture = parseAutonomousCostEnv(AUTONOMOUS_EXTERNAL_MAX_VENTURE_COST_ENV, 0);

  if (!row) {
    return {
      organizationId,
      externalAutonomyEnabled: false,
      maxAutoRisk: "moderate",
      maxActionCostUsd: envMaxAction,
      maxDailyCostUsd: envMaxDaily,
      maxVentureCostUsd: envMaxVenture,
      allowedActionTypes: [...AUTONOMOUS_ELIGIBLE_ACTION_TYPES],
      allowedProviders: [PROVIDER_KEYS.github, PROVIDER_KEYS.vercel, PROVIDER_KEYS.mock],
      prohibitedActionTypes: DEFAULT_PROHIBITED,
      humanApprovalActionTypes: DEFAULT_PROHIBITED,
      policyVersion: ORGANIZATION_EXTERNAL_AUTONOMY_POLICY_VERSION,
      controlledDevelopmentOrg,
    };
  }

  return {
    organizationId,
    externalAutonomyEnabled: Boolean(row.external_autonomy_enabled),
    maxAutoRisk: row.max_auto_risk as OrganizationAutonomyPolicy["maxAutoRisk"],
    maxActionCostUsd: Number(row.max_action_cost_usd ?? envMaxAction),
    maxDailyCostUsd: Number(row.max_daily_cost_usd ?? envMaxDaily),
    maxVentureCostUsd: Number(row.max_venture_cost_usd ?? envMaxVenture),
    allowedActionTypes: Array.isArray(row.allowed_action_types)
      ? (row.allowed_action_types as string[])
      : [...AUTONOMOUS_ELIGIBLE_ACTION_TYPES],
    allowedProviders: Array.isArray(row.allowed_providers)
      ? (row.allowed_providers as string[])
      : [PROVIDER_KEYS.github, PROVIDER_KEYS.vercel, PROVIDER_KEYS.mock],
    prohibitedActionTypes: Array.isArray(row.prohibited_action_types)
      ? (row.prohibited_action_types as string[])
      : DEFAULT_PROHIBITED,
    humanApprovalActionTypes: Array.isArray(row.human_approval_action_types)
      ? (row.human_approval_action_types as string[])
      : DEFAULT_PROHIBITED,
    policyVersion: String(row.policy_version ?? ORGANIZATION_EXTERNAL_AUTONOMY_POLICY_VERSION),
    controlledDevelopmentOrg,
  };
}

export async function upsertOrganizationAutonomyPolicyForDevelopment(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<void> {
  await admin.from("organization_external_autonomy_policies").upsert(
    {
      organization_id: organizationId,
      external_autonomy_enabled: true,
      max_auto_risk: "moderate",
      max_action_cost_usd: 0,
      max_daily_cost_usd: 0,
      max_venture_cost_usd: 0,
      allowed_action_types: [...AUTONOMOUS_ELIGIBLE_ACTION_TYPES],
      allowed_providers: [PROVIDER_KEYS.github, PROVIDER_KEYS.vercel, PROVIDER_KEYS.mock],
      prohibited_action_types: DEFAULT_PROHIBITED,
      human_approval_action_types: DEFAULT_PROHIBITED,
      policy_version: ORGANIZATION_EXTERNAL_AUTONOMY_POLICY_VERSION,
    },
    { onConflict: "organization_id" },
  );
}
