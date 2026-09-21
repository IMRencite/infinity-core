import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { attachHqCanonicalLiveState } from "@/lib/infinity/operator-console/hq-canonical-live-state";
import { buildFavc1CycleSnapshot } from "@/lib/infinity/operator-console/favc1-cycle/build-cycle-snapshot";
import { resolveLatestFavc1Cycle } from "@/lib/infinity/operator-console/favc1-cycle/resolve-active-cycle";
import { parseFavc1CycleVentureId } from "@/lib/infinity/operator-console/favc1-cycle/types";
import {
  isLocalHqObservabilityProofRequest,
  localHqProofOrganizationId,
} from "@/lib/infinity/operator-console/local-hq-proof";
import { recordFounderTabHttpPoll } from "@/lib/infinity/operator-console/hq-founder-tab-poll-log";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const url = new URL(request.url);
  const cycleKey = url.searchParams.get("cycleKey");
  const ventureId = url.searchParams.get("ventureId");
  const cycleKeyFromVenture = ventureId ? parseFavc1CycleVentureId(ventureId) : null;

  try {
    const admin = createAdminClient();
    const cycle = await resolveLatestFavc1Cycle(
      admin,
      organizationId,
      cycleKey ?? cycleKeyFromVenture,
    );
    if (!cycle) {
      return NextResponse.json({ error: "No FAVC1 cycle found" }, { status: 404 });
    }

    const { snapshot, meta } = await buildFavc1CycleSnapshot(admin, cycle);
    const liveSnapshot = attachHqCanonicalLiveState(snapshot, organizationId);
    recordFounderTabHttpPoll(liveSnapshot);
    return NextResponse.json(
      {
        snapshot: liveSnapshot,
        meta,
        followVentureAssemblyId: meta.ventureAssemblyId,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Failed to load FAVC1 cycle snapshot" }, { status: 500 });
  }
}
