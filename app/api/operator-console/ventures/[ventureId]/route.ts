import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";

type RouteContext = { params: Promise<{ ventureId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ventureId } = await context.params;
  if (!ventureId || ventureId.length < 8) {
    return NextResponse.json({ error: "Invalid venture ID" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const snapshot = await loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId);
    if (!snapshot) {
      return NextResponse.json({ error: "Venture not found" }, { status: 404 });
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
