import { NextResponse } from "next/server";
import { durableUpdateWorkspace, durableWorkspace } from "../../../../../lib/occupancynpv/durable";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const raw = new URL(req.url).searchParams.get("compare");
  const compareScenarioIds = raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : undefined;
  const result = await durableWorkspace(id, compareScenarioIds);
  if (!result.ok) return NextResponse.json(result, { status: result.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json(result);
}
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({})) as { name?: string; status?: "ACTIVE" | "ARCHIVED" };
  const updated = await durableUpdateWorkspace(id, body);
  if (!updated.ok) return NextResponse.json(updated, { status: updated.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json(updated);
}
