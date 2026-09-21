import { NextResponse } from "next/server";
import { durableSave } from "../../../../../../lib/occupancynpv/durable";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({})) as { scenarios?: never[]; compare?: boolean; compareScenarioIds?: string[] };
  const saved = await durableSave(id, body.scenarios ?? [], { compare: body.compare, compareScenarioIds: body.compareScenarioIds });
  if (!saved.ok) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}
