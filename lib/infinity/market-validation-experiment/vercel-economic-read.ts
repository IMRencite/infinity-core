import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";
import type { NormalizedAccountPlan, NormalizedBilling, NormalizedBillingCharge } from "./economic-read-types";

export const VERCEL_USER_PATH = "/v2/user";
export const VERCEL_TEAM_PATH_PREFIX = "/v2/teams/";
export const VERCEL_BILLING_CHARGES_PATH = "/v1/billing/charges";

export type VercelEconomicGetResult = {
  path: string;
  status: number;
  ok: boolean;
  text: string;
};

export function configuredVercelTeamId(): string | null {
  const value = process.env[VERCEL_TEAM_ID_ENV];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function vercelEconomicReadCredentialPresent(): boolean {
  const token = process.env[VERCEL_TOKEN_ENV];
  return typeof token === "string" && token.trim().length >= 11;
}

export async function vercelEconomicGet(path: string): Promise<VercelEconomicGetResult> {
  const token = process.env[VERCEL_TOKEN_ENV];
  if (!token) throw new Error("VERCEL_TOKEN not configured");
  const teamId = configuredVercelTeamId();
  const url = teamId
    ? `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(teamId)}`
    : `https://api.vercel.com${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  return { path, status: res.status, ok: res.ok, text };
}

export function teamPathFor(teamId: string): string {
  return `${VERCEL_TEAM_PATH_PREFIX}${encodeURIComponent(teamId)}`;
}

export function billingChargesPath(from: string, to: string): string {
  return `${VERCEL_BILLING_CHARGES_PATH}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export function billingWindow(now = new Date()): { from: string; to: string } {
  const to = now.toISOString();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: fromDate.toISOString(), to };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeAccountId(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) return null;
  const user = asRecord(root.user);
  return asString(user?.uid) ?? asString(user?.id) ?? asString(root.uid) ?? asString(root.id);
}

export function normalizeAccountPlan(payload: unknown, expectedTeamId: string): NormalizedAccountPlan | null {
  const root = asRecord(payload);
  if (!root) return null;
  const team = asRecord(root.team) ?? root;
  const teamId = asString(team.id);
  if (!teamId || teamId !== expectedTeamId) return null;
  const billing = asRecord(team.billing);
  return {
    teamId,
    teamSlug: asString(team.slug),
    plan: asString(billing?.plan),
    billingPeriod: asString(billing?.period) ?? asString(billing?.billingPeriod),
    source: "GET /v2/teams/{teamId}",
  };
}

function normalizeCharge(row: Record<string, unknown>): NormalizedBillingCharge {
  return {
    serviceName: asString(row.ServiceName) ?? asString(row.serviceName),
    billedCost: asNumber(row.BilledCost) ?? asNumber(row.billedCost),
    effectiveCost: asNumber(row.EffectiveCost) ?? asNumber(row.effectiveCost),
    listUnitPrice: asNumber(row.ListUnitPrice) ?? asNumber(row.listUnitPrice),
    chargePeriodStart: asString(row.ChargePeriodStart) ?? asString(row.chargePeriodStart),
    chargePeriodEnd: asString(row.ChargePeriodEnd) ?? asString(row.chargePeriodEnd),
  };
}

export function normalizeBillingCharges(text: string, periodFrom: string, periodTo: string): NormalizedBilling {
  const charges: NormalizedBillingCharge[] = [];
  const trimmed = text.trim();
  if (trimmed) {
    const asJson = (() => {
      try {
        return JSON.parse(trimmed) as unknown;
      } catch {
        return null;
      }
    })();
    if (Array.isArray(asJson)) {
      for (const item of asJson) {
        const row = asRecord(item);
        if (row) charges.push(normalizeCharge(row));
      }
    } else if (asJson && asRecord(asJson)?.charges && Array.isArray(asRecord(asJson)?.charges)) {
      for (const item of asRecord(asJson)!.charges as unknown[]) {
        const row = asRecord(item);
        if (row) charges.push(normalizeCharge(row));
      }
    } else {
      for (const line of trimmed.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const row = asRecord(JSON.parse(line));
          if (row && (row.ServiceName != null || row.BilledCost != null || row.EffectiveCost != null || row.serviceName != null)) {
            charges.push(normalizeCharge(row));
          }
        } catch {
          /* skip non-FOCUS lines */
        }
      }
    }
  }
  const billed = charges.map((item) => item.billedCost).filter((item): item is number => item != null);
  const effective = charges.map((item) => item.effectiveCost).filter((item): item is number => item != null);
  const prices = charges.map((item) => item.listUnitPrice).filter((item): item is number => item != null);
  return {
    periodFrom,
    periodTo,
    chargeCount: charges.length,
    charges,
    billedCostSum: billed.length ? billed.reduce((sum, item) => sum + item, 0) : null,
    effectiveCostSum: effective.length ? effective.reduce((sum, item) => sum + item, 0) : null,
    unitPricesObserved: prices,
    source: "GET /v1/billing/charges",
  };
}

export function relevantDeploymentCharges(billing: NormalizedBilling): NormalizedBillingCharge[] {
  return billing.charges.filter((item) => {
    const name = (item.serviceName ?? "").toLowerCase();
    return /deploy|build|bandwidth|function|serverless|hosting|edge/.test(name);
  });
}
