import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadCachedFinancialTruthView } from "@/lib/infinity/financial-truth/live";
import { overlayCanonicalTreasuryOnHqReadModel } from "@/lib/infinity/financial-truth/treasury-overlay";
import {
  isSupportedBudgetCategory,
  mutatePortfolioBudgetPolicy,
  mutateVentureBudgetPolicy,
  mutateVentureCapitalAllocation,
  recordManualAccountingEvent,
} from "@/lib/infinity/financial-truth/treasury-mutations";
import { isGovernedSpendCategory } from "@/lib/infinity/financial-truth/spend-authority";
import { mutateVentureSpendAuthority } from "@/lib/infinity/financial-truth/spend-authority-mutations";
import { projectOccupancyNpvSpendAuthority } from "@/lib/infinity/financial-truth/spend-authority";
import { publishHqRuntimeEvent } from "@/lib/infinity/operator-console/hq-live-events";
import { loadTreasuryHqForOrg } from "@/lib/infinity/treasury";
import { assertNoCredentialFields } from "@/lib/infinity/treasury/security";
import {
  evaluateTreasuryAllocationPayloadSecurityGate,
  evaluateTreasuryBudgetPayloadSecurityGate,
  evaluateTreasurySpendAuthorityPayloadSecurityGate,
} from "@/lib/infinity/financial-truth/treasury-payload-contracts";
import { allocatedCapitalTotal, loadCapitalLedger } from "@/lib/infinity/financial-truth/capital-ledger";
import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "@/lib/infinity/financial-truth/founder-capital-policy";
import type { SupportedBudgetCategory } from "@/lib/infinity/financial-truth/types";

type TreasuryAction =
  | "fund"
  | "allocate"
  | "update_budget"
  | "update_portfolio_budget"
  | "update_venture_budget"
  | "update_spend_authority"
  | "record_accounting";

function organizationIdFromAuth(result: unknown): { organizationId: string; userId: string } | null {
  if (!result || typeof result !== "object") return null;
  if ("status" in result) {
    const typed = result as { status?: string; context?: { organizationId?: string; userId?: string } };
    if (typed.status !== "ok") return null;
    if (!typed.context?.organizationId || !typed.context.userId) return null;
    return { organizationId: typed.context.organizationId, userId: typed.context.userId };
  }
  return null;
}

function payload() {
  const financialTruth = loadCachedFinancialTruthView();
  return financialTruth;
}

export async function GET(): Promise<NextResponse> {
  const result = await getOperatorOrgContext();
  const auth = organizationIdFromAuth(result);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const model = overlayCanonicalTreasuryOnHqReadModel(
    await loadTreasuryHqForOrg(admin, auth.organizationId),
    payload().treasury_control,
  );
  const secrets = assertNoCredentialFields(model);
  if (secrets.length) {
    return NextResponse.json({ error: "Treasury model refused credential fields" }, { status: 500 });
  }
  return NextResponse.json(
    { model, financialTruth: payload() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const result = await getOperatorOrgContext();
  const auth = organizationIdFromAuth(result);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as TreasuryAction;
  const amountUsd = Number(body.amountUsd);
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim() ? body.idempotencyKey.trim() : null;

  const allowed: TreasuryAction[] = [
    "fund",
    "allocate",
    "update_budget",
    "update_portfolio_budget",
    "update_venture_budget",
    "update_spend_authority",
    "record_accounting",
  ];
  if (!allowed.includes(action)) {
    return NextResponse.json({ error: "Unknown treasury action" }, { status: 400 });
  }

  try {
    if (action === "fund" || action === "record_accounting") {
      if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });
      const recorded = recordManualAccountingEvent({
        actor: auth.userId,
        authorizedActor: true,
        amountUsd,
        source: typeof body.source === "string" ? body.source : "founder_contribution",
        memo: typeof body.memo === "string" ? body.memo : null,
        idempotencyKey,
      });
      if (!recorded.ok) {
        return NextResponse.json({ error: recorded.error, reason: recorded.reason }, { status: 400 });
      }
    } else if (action === "allocate") {
      const payloadSecurity = evaluateTreasuryAllocationPayloadSecurityGate(body);
      if (payloadSecurity.result !== "PASS") {
        return NextResponse.json(
          { error: "Treasury payload refused actual credential fields", reason: "CREDENTIAL_FIELD", fields: payloadSecurity.reasons },
          { status: 400 },
        );
      }
      if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });
      const allocated = mutateVentureCapitalAllocation({
        actor: auth.userId,
        authorizedActor: true,
        ventureId: typeof body.ventureId === "string" ? body.ventureId : "",
        amountUsd,
        purpose: typeof body.note === "string" ? body.note : typeof body.purpose === "string" ? body.purpose : null,
        reviewCondition: typeof body.reviewCondition === "string" ? body.reviewCondition : null,
        source: body.source === "AUTONOMOUS_ALLOCATION_DECISION" ? "AUTONOMOUS_ALLOCATION_DECISION" : "FOUNDER_DIRECT_ALLOCATION",
        idempotencyKey,
        increaseAllocation: body.increaseAllocation === true,
      });
      if (!allocated.ok) {
        return NextResponse.json({ error: allocated.error, reason: allocated.reason }, { status: 400 });
      }
    } else if (action === "update_spend_authority") {
      const payloadSecurity = evaluateTreasurySpendAuthorityPayloadSecurityGate(body);
      if (payloadSecurity.result !== "PASS") {
        return NextResponse.json(
          { error: "Treasury payload refused actual credential fields", reason: "CREDENTIAL_FIELD", fields: payloadSecurity.reasons },
          { status: 400 },
        );
      }
      if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });
      const updated = mutateVentureSpendAuthority({
        actor: auth.userId,
        authorizedActor: true,
        ventureId: typeof body.ventureId === "string" ? body.ventureId : "",
        amountUsd,
        currency: body.currency === "USD" ? "USD" : undefined,
        purpose: typeof body.purpose === "string" ? body.purpose : null,
        category: isGovernedSpendCategory(body.category) ? body.category : "OPERATIONS",
        effectiveAt: typeof body.effective_at === "string" ? body.effective_at : typeof body.effectiveAt === "string" ? body.effectiveAt : null,
        reviewAt: typeof body.review_at === "string" ? body.review_at : typeof body.reviewAt === "string" ? body.reviewAt : null,
        reason: typeof body.reason === "string" ? body.reason : null,
        idempotencyKey,
      });
      if (!updated.ok) {
        return NextResponse.json({ error: updated.error, reason: updated.reason }, { status: 400 });
      }
    } else {
      const payloadSecurity = evaluateTreasuryBudgetPayloadSecurityGate(body);
      if (payloadSecurity.result !== "PASS") {
        return NextResponse.json(
          { error: "Treasury payload refused actual credential fields", reason: "CREDENTIAL_FIELD", fields: payloadSecurity.reasons },
          { status: 400 },
        );
      }
      const scope = body.scope === "VENTURE" || body.ventureId ? "VENTURE" : "PORTFOLIO";
      const categoryLimits =
        isSupportedBudgetCategory(body.category) && Number.isFinite(amountUsd)
          ? { [body.category as SupportedBudgetCategory]: amountUsd }
          : undefined;
      const updated =
        scope === "VENTURE"
          ? mutateVentureBudgetPolicy({
              actor: auth.userId,
              authorizedActor: true,
              ventureId: typeof body.ventureId === "string" ? body.ventureId : "",
              idempotencyKey,
              ceiling: body.period === "LIFETIME" || body.field === "venture_budget_ceiling" ? amountUsd : undefined,
              monthlySpendLimit: body.period === "MONTHLY" || body.field === "monthly_spend_limit" ? amountUsd : undefined,
              maximumSinglePurchase: body.field === "maximum_single_purchase" ? amountUsd : undefined,
              categoryLimits,
            })
          : mutatePortfolioBudgetPolicy({
              actor: auth.userId,
              authorizedActor: true,
              idempotencyKey,
              ceiling: body.field === "portfolio_capital_ceiling" ? amountUsd : undefined,
              monthlyBurnCap:
                body.field === "monthly_burn_cap" ? (body.amountUsd === "NOT_SET" ? "NOT_SET" : amountUsd) : undefined,
              maximumSinglePurchase: body.field === "maximum_single_autonomous_purchase" ? amountUsd : undefined,
              dailySpendingCeiling: body.field === "daily_spending_ceiling" ? amountUsd : undefined,
              reserveRequirement: body.field === "reserve_requirement" ? amountUsd : undefined,
              paidAcquisitionBudget: body.field === "paid_acquisition_budget" ? amountUsd : undefined,
              categoryLimits,
            });
      if (!updated.ok) {
        return NextResponse.json({ error: updated.error, reason: updated.reason }, { status: 400 });
      }
    }

    const admin = createAdminClient();
    const financialTruth = payload();
    const model = overlayCanonicalTreasuryOnHqReadModel(
      await loadTreasuryHqForOrg(admin, auth.organizationId),
      financialTruth.treasury_control,
    );
    const secrets = assertNoCredentialFields(model);
    if (secrets.length) {
      return NextResponse.json(
        { error: "Treasury model refused credential fields", fields: secrets },
        { status: 500 },
      );
    }
    const ledger = loadCapitalLedger();
    const allocated = allocatedCapitalTotal(ledger);
    const authorized = CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital;
    const ventureId = typeof body.ventureId === "string" ? body.ventureId : "";
    const allocation = ledger.allocations.find((row) => row.venture_id === ventureId);
    const budget = ledger.venture_budgets.find((row) => row.venture_id === ventureId);
    const allocatedToVenture = (allocation?.allocated_amount ?? 0) + (allocation?.reserved_amount ?? 0);
    const ceiling = typeof budget?.venture_budget_ceiling === "number" ? budget.venture_budget_ceiling : 0;
    const spendAuthority =
      (ventureId
        ? financialTruth.treasury_control.spend_authorities.find((row) => row.venture_id === ventureId)
        : null) ?? projectOccupancyNpvSpendAuthority(ledger, allocation?.spent_amount ?? 0);
    publishHqRuntimeEvent({
      type: "FINANCIAL_BALANCE_UPDATED",
      at: new Date().toISOString(),
      ventureId: ventureId || null,
      reason: action,
    });
    const result =
      action === "allocate"
        ? {
            ok: true,
            action,
            money_moved: false,
            message: `$${allocatedToVenture} allocated to ${allocation?.display_name ?? "venture"}. $${authorized - allocated} remains unallocated. No bank funds moved.`,
          }
        : action === "update_spend_authority"
          ? {
              ok: true,
              action,
              money_moved: false,
              message: `Spend authority set to $${spendAuthority.effective_spend_authority}. Allocation $${spendAuthority.allocation_amount} unchanged. Paid acquisition $0. No bank funds moved.`,
            }
        : action === "update_budget" || action === "update_venture_budget" || action === "update_portfolio_budget"
          ? {
              ok: true,
              action,
              money_moved: false,
              message:
                body.scope === "VENTURE" || body.ventureId
                  ? `Venture budget ceiling updated to $${ceiling}. Budget is not allocation and not spend. No bank funds moved.`
                  : "Canonical portfolio budget policy updated. No bank funds moved.",
            }
          : { ok: true, action, money_moved: false, message: "Treasury mutation recorded. No bank funds moved." };
    return NextResponse.json(
      { model, financialTruth, result },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ error: "Treasury mutation failed" }, { status: 500 });
  }
}
