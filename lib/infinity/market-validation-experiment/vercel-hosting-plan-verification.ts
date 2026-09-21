import { reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { evaluateProviderPlanEligibility, normalizeProviderPlanName } from "./plan-eligibility";
import {
  configuredVercelTeamId,
  normalizeAccountId,
  normalizeAccountPlan,
  teamPathFor,
  vercelEconomicGet,
  VERCEL_USER_PATH,
} from "./vercel-economic-read";

export const CRE_VERCEL_DEPLOYMENT_ID = "dpl_4gmigcyVLKS1X6HxZDCupdd3Ti7H" as const;
export const CRE_VERCEL_VALIDATION_HOST = "infinity-validation-cre-lease-npv-e72beb7b-br9xupk59.vercel.app" as const;

export type VercelCurrentPlan = "HOBBY" | "PRO" | "ENTERPRISE" | "UNKNOWN";
export type VercelHostingGovernanceState =
  | "VERCEL_PRO_ALREADY_ACTIVE"
  | "VERCEL_ENTERPRISE_ALREADY_ACTIVE"
  | "VERCEL_PAID_HOSTING_REQUIRED"
  | "VERCEL_PLAN_VERIFICATION_REQUIRED";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function classifyPlan(plan: string | null | undefined): VercelCurrentPlan {
  const normalized = normalizeProviderPlanName(plan);
  if (normalized === "hobby") return "HOBBY";
  if (normalized === "pro") return "PRO";
  if (normalized === "enterprise") return "ENTERPRISE";
  return "UNKNOWN";
}

function billingStatus(payload: unknown): string | null {
  const root = asRecord(payload);
  const team = asRecord(root?.team) ?? root;
  const billing = asRecord(team?.billing);
  return asString(billing?.status) ?? asString(billing?.subscriptionStatus);
}

function deploymentTeamId(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) return null;
  const team = asRecord(root.team);
  return asString(root.teamId) ?? asString(team?.id) ?? asString(root.ownerId);
}

function deploymentUrl(payload: unknown): string | null {
  const root = asRecord(payload);
  const url = asString(root?.url);
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}

export function classifyVercelHostingGovernance(plan: VercelCurrentPlan): {
  state: VercelHostingGovernanceState;
  hostingPurchaseRequired: "YES" | "NO";
} {
  if (plan === "PRO") return { state: "VERCEL_PRO_ALREADY_ACTIVE", hostingPurchaseRequired: "NO" };
  if (plan === "ENTERPRISE") return { state: "VERCEL_ENTERPRISE_ALREADY_ACTIVE", hostingPurchaseRequired: "NO" };
  if (plan === "HOBBY") return { state: "VERCEL_PAID_HOSTING_REQUIRED", hostingPurchaseRequired: "YES" };
  return { state: "VERCEL_PLAN_VERIFICATION_REQUIRED", hostingPurchaseRequired: "YES" };
}

export async function executeVercelHostingPlanVerification(input: {
  reloadEnv?: boolean;
  fetchImpl?: typeof fetch;
  deploymentId?: string;
} = {}) {
  const envReload = input.reloadEnv === false
    ? {
        tokenPresent: (process.env.VERCEL_TOKEN?.trim() ? "YES" : "NO") as "YES" | "NO",
        teamIdPresent: (process.env.VERCEL_TEAM_ID?.trim() ? "YES" : "NO") as "YES" | "NO",
        confirmed: Boolean(process.env.VERCEL_TOKEN?.trim()),
      }
    : reloadVercelFromLocalFile();
  const teamId = configuredVercelTeamId();
  const deploymentId = input.deploymentId ?? CRE_VERCEL_DEPLOYMENT_ID;
  const empty = {
    env: envReload,
    account: {
      team: teamId ?? "UNKNOWN",
      teamSlug: "UNKNOWN" as string,
      ownershipVerified: "NO" as const,
    },
    plan: {
      current: "UNKNOWN" as VercelCurrentPlan,
      paid: "UNKNOWN" as const,
      subscriptionActive: "UNKNOWN" as const,
      commercialProductionSupport: "UNKNOWN" as const,
      billingConfigured: "UNKNOWN" as const,
      currentBaseSubscription: "UNKNOWN" as const,
    },
    deployment: {
      id: deploymentId,
      covered: "UNKNOWN" as const,
      customDomainSupported: "UNKNOWN" as const,
      sslSupported: "UNKNOWN" as const,
    },
    governance: classifyVercelHostingGovernance("UNKNOWN"),
    purchases: 0 as const,
    planChanges: 0 as const,
    deployments: 0 as const,
    domainBindings: 0 as const,
    dnsWrites: 0 as const,
    publiclyLaunched: "NO" as const,
  };

  if (!envReload.confirmed || envReload.tokenPresent !== "YES" || !teamId) {
    return empty;
  }

  const get = input.fetchImpl
    ? async (path: string) => {
        const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(teamId)}`;
        const res = await input.fetchImpl!(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN ?? ""}` },
        });
        return { path, status: res.status, ok: res.ok, text: await res.text() };
      }
    : vercelEconomicGet;

  const userRes = await get(VERCEL_USER_PATH);
  const teamRes = await get(teamPathFor(teamId));
  const deployRes = await get(`/v13/deployments/${encodeURIComponent(deploymentId)}`);

  let accountId: string | null = null;
  if (userRes.ok) {
    try {
      accountId = normalizeAccountId(JSON.parse(userRes.text));
    } catch {
      accountId = null;
    }
  }
  void accountId;

  let teamPayload: unknown = null;
  let plan = null;
  if (teamRes.ok) {
    try {
      teamPayload = JSON.parse(teamRes.text);
      plan = normalizeAccountPlan(teamPayload, teamId);
    } catch {
      plan = null;
    }
  }

  let deployPayload: unknown = null;
  if (deployRes.ok) {
    try {
      deployPayload = JSON.parse(deployRes.text);
    } catch {
      deployPayload = null;
    }
  }

  const current = classifyPlan(plan?.plan);
  const eligibility = evaluateProviderPlanEligibility(plan?.plan);
  const status = billingStatus(teamPayload);
  const ownerTeam = deploymentTeamId(deployPayload);
  const url = deploymentUrl(deployPayload);
  const ownershipVerified =
    deployRes.ok && ownerTeam === teamId && (!url || url.includes(CRE_VERCEL_VALIDATION_HOST) || url.includes(deploymentId))
      ? "YES"
      : deployRes.ok && ownerTeam === teamId
        ? "YES"
        : "NO";
  const covered = ownershipVerified === "YES" && current !== "UNKNOWN" ? "YES" : ownershipVerified === "YES" ? "UNKNOWN" : "NO";
  const knownPlan = current !== "UNKNOWN";
  const paid = current === "PRO" || current === "ENTERPRISE" ? "YES" : current === "HOBBY" ? "NO" : "UNKNOWN";
  const subscriptionActive =
    status === "active" || status === "trialing"
      ? "YES"
      : status === "canceled" || status === "cancelled" || status === "inactive"
        ? "NO"
        : knownPlan
          ? "UNKNOWN"
          : "UNKNOWN";

  return {
    env: envReload,
    account: {
      team: plan?.teamSlug ? `${plan.teamSlug} (${teamId})` : teamId,
      teamSlug: plan?.teamSlug ?? "UNKNOWN",
      ownershipVerified,
    },
    plan: {
      current,
      paid,
      subscriptionActive,
      commercialProductionSupport: eligibility.commercialUse,
      billingConfigured: teamRes.ok && plan ? "YES" : teamRes.ok ? "UNKNOWN" : "UNKNOWN",
      currentBaseSubscription: plan?.plan ?? "UNKNOWN",
    },
    deployment: {
      id: deploymentId,
      covered,
      customDomainSupported: knownPlan ? "YES" : "UNKNOWN",
      sslSupported: knownPlan ? "YES" : "UNKNOWN",
    },
    governance: classifyVercelHostingGovernance(current),
    purchases: 0 as const,
    planChanges: 0 as const,
    deployments: 0 as const,
    domainBindings: 0 as const,
    dnsWrites: 0 as const,
    publiclyLaunched: "NO" as const,
    provider: {
      userStatus: userRes.status,
      teamStatus: teamRes.status,
      deploymentStatus: deployRes.status,
    },
  };
}
