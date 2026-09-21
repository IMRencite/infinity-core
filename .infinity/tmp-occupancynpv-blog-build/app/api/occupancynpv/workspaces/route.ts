import { NextResponse } from "next/server";
import { durableCreateWorkspace, durableListWorkspacesPage } from "../../../../lib/occupancynpv/durable";
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") ?? "ACTIVE").toUpperCase();
    const listed = await durableListWorkspacesPage({
      status: status === "ARCHIVED" || status === "ALL" ? status : "ACTIVE",
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 10),
      q: url.searchParams.get("q") ?? "",
    });
    if (!listed.ok) return NextResponse.json(listed, { status: 401 });
    return NextResponse.json(listed);
  } catch {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { name?: string };
  const created = await durableCreateWorkspace(body.name ?? "Deal workspace");
  if (!created.ok) return NextResponse.json(created, { status: created.reason === "UNAUTHENTICATED" ? 401 : 403 });
  return NextResponse.json(created);
}
