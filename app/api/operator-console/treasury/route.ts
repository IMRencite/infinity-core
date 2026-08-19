import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import {
  MANUAL_FUNDING_SOURCES,
  TREASURY_BUDGET_CATEGORIES,
  type ManualFundingSource,
  type TreasuryBudgetCategory,
} from "@/lib/infinity/treasury/constants";
import {
  allocateVentureCapital,
  loadTreasuryHqForOrg,
  loadTreasuryStore,
  manualControlFailureMessage,
  persistTreasuryMutation,
  recordManualFunding,
  updateVentureBudget,
} from "@/lib/infinity/treasury";
import { assertNoCredentialFields } from "@/lib/infinity/treasury/security";

type TreasuryAction = "fund" | "allocate" | "update_budget";

function organizationIdFromAuth(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  if ("status" in result) {
    const typed = result as { status?: string; context?: { organizationId?: string } };
    if (typed.status !== "ok") return null;
    return typed.context?.organizationId ?? null;
  }
  const typed = result as { organizationId?: string };
  return typed.organizationId ?? null;
}

function isFundingSource(value: unknown): value is ManualFundingSource {
  return typeof value === "string" && (MANUAL_FUNDING_SOURCES as readonly string[]).includes(value);
}

function isBudgetCategory(value: unknown): value is TreasuryBudgetCategory {
  return typeof value === "string" && (TREASURY_BUDGET_CATEGORIES as readonly string[]).includes(value);
}

export async function GET(): Promise<NextResponse> {
  const result = await getOperatorOrgContext();
  const organizationId = organizationIdFromAuth(result);
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const model = await loadTreasuryHqForOrg(admin, organizationId);
  const secrets = assertNoCredentialFields(model);
  if (secrets.length) {
    return NextResponse.json({ error: "Treasury model refused credential fields" }, { status: 500 });
  }
  return NextResponse.json(
    { model },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const result = await getOperatorOrgContext();
  const organizationId = organizationIdFromAuth(result);
  if (!organizationId) {
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
  const idempotencyKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.trim() ? body.idempotencyKey.trim() : null;

  if (action !== "fund" && action !== "allocate" && action !== "update_budget") {
    return NextResponse.json({ error: "Unknown treasury action" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const store = await loadTreasuryStore(admin, organizationId);

    if (action === "fund") {
      if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });
      if (!isFundingSource(body.source)) {
        return NextResponse.json({ error: "Invalid funding source" }, { status: 400 });
      }
      const funded = recordManualFunding(store, {
        organizationId,
        amountUsd,
        source: body.source,
        memo: typeof body.memo === "string" ? body.memo : null,
        idempotencyKey,
      });
      if (!funded.ok) {
        return NextResponse.json({ error: manualControlFailureMessage(funded.reason), reason: funded.reason }, { status: 400 });
      }
    } else if (action === "allocate") {
      if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });
      const allocated = allocateVentureCapital(store, {
        organizationId,
        ventureId: typeof body.ventureId === "string" ? body.ventureId : "",
        amountUsd,
        note: typeof body.note === "string" ? body.note : null,
        idempotencyKey,
      });
      if (!allocated.ok) {
        return NextResponse.json({ error: manualControlFailureMessage(allocated.reason), reason: allocated.reason }, { status: 400 });
      }
    } else {
      const updated = updateVentureBudget(store, {
        organizationId,
        ventureId: typeof body.ventureId === "string" ? body.ventureId : "",
        amountUsd,
        period: body.period === "MONTHLY" ? "MONTHLY" : "LIFETIME",
        category: isBudgetCategory(body.category) ? body.category : undefined,
      });
      if (!updated.ok) {
        return NextResponse.json({ error: manualControlFailureMessage(updated.reason), reason: updated.reason }, { status: 400 });
      }
    }

    const persisted = await persistTreasuryMutation(admin, store, organizationId);
    if (!persisted.ok) {
      return NextResponse.json({ error: persisted.error ?? "Failed to persist treasury mutation" }, { status: 500 });
    }

    const model = await loadTreasuryHqForOrg(admin, organizationId);
    const secrets = assertNoCredentialFields(model);
    if (secrets.length) {
      return NextResponse.json({ error: "Treasury model refused credential fields" }, { status: 500 });
    }
    return NextResponse.json(
      { model },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ error: "Treasury mutation failed" }, { status: 500 });
  }
}
