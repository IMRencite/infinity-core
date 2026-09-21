import { NextResponse } from "next/server";
import { durableSaveScenarios, occupancynpvProductionPersistenceEnabled } from "@/lib/infinity/occupancynpv-product/durable";
import type { LeaseScenarioInput } from "@/lib/infinity/occupancynpv-product/npv";
import { getOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { readOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";
import { saveWorkspaceScenarios, workspaceResults } from "@/lib/infinity/occupancynpv-product/workspaces";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readOccupancynpvSession();
  const { id } = await context.params;
  const body = await req.json().catch(() => ({})) as {
    scenarios?: LeaseScenarioInput[];
    compare?: boolean;
    compareScenarioIds?: string[];
  };
  if (occupancynpvProductionPersistenceEnabled()) {
    const saved = await durableSaveScenarios({
      session,
      workspaceId: id,
      scenarios: body.scenarios ?? [],
      compare: body.compare,
      compareScenarioIds: body.compareScenarioIds,
    });
    if (!saved.ok) return NextResponse.json({ ok: false, reason: saved.reason, errors: "errors" in saved ? saved.errors : undefined }, { status: 400 });
    return NextResponse.json(saved);
  }
  const saved = saveWorkspaceScenarios({
    store: getOccupancynpvProductStore(),
    session,
    workspaceId: id,
    scenarios: body.scenarios ?? [],
    compare: body.compare,
    compareScenarioIds: body.compareScenarioIds,
  });
  if (!saved.ok) return NextResponse.json({ ok: false, reason: saved.reason, errors: saved.errors }, { status: 400 });
  return NextResponse.json(workspaceResults({
    store: getOccupancynpvProductStore(),
    session,
    workspaceId: id,
    compareScenarioIds: body.compareScenarioIds,
  }));
}
