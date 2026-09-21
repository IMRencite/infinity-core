import { NextResponse } from "next/server";
import { durableUpdateWorkspace, durableWorkspaceResults, occupancynpvProductionPersistenceEnabled } from "@/lib/infinity/occupancynpv-product/durable";
import { getOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { readOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";
import { archiveWorkspace, renameWorkspace, restoreWorkspace, workspaceResults, type WorkspaceLifecycleStatus } from "@/lib/infinity/occupancynpv-product/workspaces";

function compareIdsFrom(req: Request): string[] | undefined {
  const raw = new URL(req.url).searchParams.get("compare");
  if (!raw) return undefined;
  const ids = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return ids.length ? ids : undefined;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readOccupancynpvSession();
  const { id } = await context.params;
  const compareScenarioIds = compareIdsFrom(req);
  const result = occupancynpvProductionPersistenceEnabled()
    ? await durableWorkspaceResults({ session, workspaceId: id, compareScenarioIds })
    : workspaceResults({ store: getOccupancynpvProductStore(), session, workspaceId: id, compareScenarioIds });
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: result.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json(result);
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readOccupancynpvSession();
  const { id } = await context.params;
  const body = await req.json().catch(() => ({})) as { name?: string; status?: WorkspaceLifecycleStatus };
  if (occupancynpvProductionPersistenceEnabled()) {
    const updated = await durableUpdateWorkspace({ session, workspaceId: id, name: body.name, status: body.status });
    if (!updated.ok) return NextResponse.json(updated, { status: updated.reason === "UNAUTHENTICATED" ? 401 : 403 });
    return NextResponse.json(updated);
  }
  const store = getOccupancynpvProductStore();
  if (body.name) {
    const renamed = renameWorkspace({ store, session, workspaceId: id, name: body.name });
    if (!renamed.ok) return NextResponse.json(renamed, { status: 403 });
  }
  if (body.status === "ARCHIVED") {
    const archived = archiveWorkspace({ store, session, workspaceId: id });
    if (!archived.ok) return NextResponse.json(archived, { status: 403 });
    return NextResponse.json(archived);
  }
  if (body.status === "ACTIVE") {
    const restored = restoreWorkspace({ store, session, workspaceId: id });
    if (!restored.ok) return NextResponse.json(restored, { status: 403 });
    return NextResponse.json(restored);
  }
  const renamed = renameWorkspace({ store, session, workspaceId: id, name: body.name ?? "" });
  if (!renamed.ok) return NextResponse.json(renamed, { status: 403 });
  return NextResponse.json(renamed);
}
