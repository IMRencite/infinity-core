import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { attachGlobalHqFloorRooms } from "@/lib/infinity/operator-console/attach-global-hq-floor";
import { loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";
import {
  isLocalHqObservabilityProofRequest,
  localHqProofOrganizationId,
} from "@/lib/infinity/operator-console/local-hq-proof";
import { snapshotMatchesRequestedVenture, snapshotVentureIdentityTokens } from "@/lib/infinity/hq-venture-selection/identity";
import { evaluateHQVenturePollIdentityGate } from "@/lib/infinity/hq-venture-selection/gates";
import { hqVentureIdentitiesMatch } from "@/lib/infinity/hq-inspection-identity/aliases";
import { withHqFinancialTruth } from "@/lib/infinity/financial-truth/attach-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ ventureId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const result = await getOperatorOrgContext();
  if (result.status === "error") {
    return NextResponse.json({ error: "Workspace unavailable" }, { status: 503 });
  }
  const organizationId =
    result.status === "ok"
      ? result.context.organizationId
      : isLocalHqObservabilityProofRequest(request)
        ? localHqProofOrganizationId()
        : null;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ventureId: rawVentureId } = await context.params;
  let ventureId = rawVentureId;
  try {
    ventureId = decodeURIComponent(rawVentureId);
  } catch {
    ventureId = rawVentureId;
  }
  if (!ventureId || ventureId.length < 8) {
    return NextResponse.json({ error: "Invalid venture ID" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const loaded = await loadOperatorVentureSnapshot(admin, organizationId, ventureId);
    if (!loaded || !snapshotMatchesRequestedVenture(loaded, ventureId)) {
      return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    }
    const matchingToken =
      snapshotVentureIdentityTokens(loaded).find((token) => hqVentureIdentitiesMatch(token, ventureId)) ?? null;
    const pollIdentity = evaluateHQVenturePollIdentityGate({
      requestedVentureId: ventureId,
      responseVentureId: matchingToken,
    });
    if (pollIdentity.result !== "PASS") {
      return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    }
    const snapshot = await withHqFinancialTruth(
      await attachGlobalHqFloorRooms(loaded, admin, organizationId),
      "poll",
    );
    if (!snapshot) {
      return NextResponse.json({ error: "Failed to load operator snapshot" }, { status: 500 });
    }

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load operator snapshot" }, { status: 500 });
  }
}
