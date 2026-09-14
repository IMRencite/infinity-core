import { NextResponse } from "next/server";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadHqCanonicalLiveState, withFinancialTruthLiveState } from "@/lib/infinity/operator-console/hq-canonical-live-state";
import {
  isLocalHqObservabilityProofRequest,
  localHqProofOrganizationId,
} from "@/lib/infinity/operator-console/local-hq-proof";
import {
  financialTruthNeedsCatchUpRefresh,
  loadCachedFinancialTruthView,
  loadFinancialTruthView,
} from "@/lib/infinity/financial-truth/live";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
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

  const ventureId = new URL(request.url).searchParams.get("ventureId");
  const catchUp = request.headers.get("x-hq-catch-up") === "1";
  const live = loadHqCanonicalLiveState(organizationId, ventureId);
  const financialTruth =
    catchUp && financialTruthNeedsCatchUpRefresh()
      ? await loadFinancialTruthView("catch-up")
      : loadCachedFinancialTruthView();
  return NextResponse.json(withFinancialTruthLiveState(live, financialTruth), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
