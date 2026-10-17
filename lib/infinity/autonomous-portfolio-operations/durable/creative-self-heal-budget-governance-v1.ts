export const CREATIVE_SELF_HEAL_MAX_ATTEMPTS_CONFIG_KEY = "INFINITY_PORTFOLIO_CREATIVE_SELF_HEAL_MAX_ATTEMPTS" as const;
export const DEFAULT_CREATIVE_SELF_HEAL_MAX_ATTEMPTS = 3;

export type CreativeBudgetGovernance = {
  CREATIVE_PROVIDER_ALREADY_AUTHORIZED: boolean;
  CREATIVE_PROVIDER_BUDGET_POLICY_PRESENT: boolean;
  CREATIVE_PROVIDER_BUDGET_AVAILABLE: boolean;
  LIVE_CREATIVE_ENABLED: boolean;
  max_self_heal_attempts: number;
  founder_blocker: string | null;
};

export function resolveCreativeBudgetGovernance(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): CreativeBudgetGovernance {
  const hasXai = Boolean(env.XAI_API_KEY?.trim() || env.XAI_MANAGEMENT_API_KEY?.trim());
  const policyPresent = Boolean(env.INFINITY_CREATIVE_BUDGET_USD?.trim() || env.INFINITY_PORTFOLIO_CREATIVE_BUDGET_USD?.trim());
  const budgetUsd = Number(env.INFINITY_PORTFOLIO_CREATIVE_BUDGET_USD ?? env.INFINITY_CREATIVE_BUDGET_USD ?? "0");
  const spentUsd = Number(env.INFINITY_PORTFOLIO_CREATIVE_SPENT_USD ?? "0");
  const budgetAvailable = policyPresent ? budgetUsd > spentUsd : false;
  const envLive = (env.INFINITY_PORTFOLIO_LIVE_CREATIVE ?? "").trim() === "1";
  const maxAttempts = Number(env[CREATIVE_SELF_HEAL_MAX_ATTEMPTS_CONFIG_KEY] ?? DEFAULT_CREATIVE_SELF_HEAL_MAX_ATTEMPTS);
  const authorized = hasXai && policyPresent && budgetAvailable;
  let founder_blocker: string | null = null;
  if (!hasXai) founder_blocker = "XAI_CREDENTIALS_MISSING";
  else if (!policyPresent) founder_blocker = "CREATIVE_BUDGET_POLICY_MISSING";
  else if (!budgetAvailable) founder_blocker = "CREATIVE_BUDGET_EXHAUSTED";
  const liveEnabled = authorized && envLive;
  return {
    CREATIVE_PROVIDER_ALREADY_AUTHORIZED: hasXai && policyPresent,
    CREATIVE_PROVIDER_BUDGET_POLICY_PRESENT: policyPresent,
    CREATIVE_PROVIDER_BUDGET_AVAILABLE: budgetAvailable,
    LIVE_CREATIVE_ENABLED: liveEnabled,
    max_self_heal_attempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : DEFAULT_CREATIVE_SELF_HEAL_MAX_ATTEMPTS,
    founder_blocker: liveEnabled ? null : founder_blocker ?? (envLive ? null : "INFINITY_PORTFOLIO_LIVE_CREATIVE_DISABLED"),
  };
}

export function creativeSelfHealBudgetGovernanceQc(): "PASS" | "FAIL" {
  const g = resolveCreativeBudgetGovernance({ INFINITY_PORTFOLIO_CREATIVE_BUDGET_USD: "25", INFINITY_PORTFOLIO_CREATIVE_SPENT_USD: "0" });
  return g.max_self_heal_attempts >= 1 && g.CREATIVE_PROVIDER_BUDGET_POLICY_PRESENT ? "PASS" : "FAIL";
}
