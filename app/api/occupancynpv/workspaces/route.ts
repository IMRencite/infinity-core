import { NextResponse } from "next/server";
import { durableCreateWorkspace, durableListWorkspacesPage, occupancynpvProductionPersistenceEnabled } from "@/lib/infinity/occupancynpv-product/durable";
import { getOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { readOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";
import {
  createDealWorkspace,
  listCustomerWorkspacesPage,
  workspaceCollectionCounts,
  WORKSPACE_COLLECTION_PAGE_SIZE,
  type WorkspaceLifecycleStatus,
} from "@/lib/infinity/occupancynpv-product/workspaces";

function listQuery(req: Request) {
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "ACTIVE").toUpperCase();
  return {
    status: (status === "ARCHIVED" || status === "ALL" ? status : "ACTIVE") as WorkspaceLifecycleStatus | "ALL",
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? WORKSPACE_COLLECTION_PAGE_SIZE),
    q: url.searchParams.get("q") ?? "",
  };
}

export async function GET(req: Request) {
  const session = await readOccupancynpvSession();
  if (!session) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  const query = listQuery(req);
  if (occupancynpvProductionPersistenceEnabled()) {
    const listed = await durableListWorkspacesPage(session, query);
    if (!listed.ok) return NextResponse.json(listed, { status: 401 });
    return NextResponse.json(listed);
  }
  const store = getOccupancynpvProductStore();
  const page = listCustomerWorkspacesPage(store, session, query);
  return NextResponse.json({
    ok: true,
    ...page,
    items: page.items.map((row) => ({
      id: row.workspace_id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      scenarioCount: [...store.scenarios.values()].filter((item) => item.workspace_id === row.workspace_id).length,
      analysisStatus: "Ready to compare",
    })),
    counts: workspaceCollectionCounts(store, session),
  });
}

export async function POST(req: Request) {
  const session = await readOccupancynpvSession();
  const body = await req.json().catch(() => ({})) as { name?: string };
  if (occupancynpvProductionPersistenceEnabled()) {
    const created = await durableCreateWorkspace({ session, name: body.name ?? "Deal workspace" });
    if (!created.ok) return NextResponse.json({ ok: false, reason: created.reason }, { status: created.reason === "UNAUTHENTICATED" ? 401 : 403 });
    return NextResponse.json({ ok: true, workspace: created.workspace, usagePolicy: created.professionalUsagePolicy.code });
  }
  const created = createDealWorkspace({
    store: getOccupancynpvProductStore(),
    session,
    name: body.name ?? "Deal workspace",
    now: new Date().toISOString(),
  });
  if (!created.ok) return NextResponse.json({ ok: false, reason: created.reason }, { status: created.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json({ ok: true, workspace: created.workspace, usagePolicy: created.professionalUsagePolicy.code });
}
