import { json, requireAskReviewAccount } from "@/lib/infinity/askreview-product/http";
import { limitAskReviewLocationCreate } from "@/lib/infinity/askreview-product/rate-limit";
import { repoCreateLocation, repoListLocations } from "@/lib/infinity/askreview-product/repository";

export async function GET(request: Request) {
  const account = await requireAskReviewAccount();
  if (!account) return json({ ok: false, reason: "UNAUTHENTICATED" }, 401);
  const url = new URL(request.url);
  const listed = await repoListLocations({
    accountId: account.accountId,
    status: url.searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    page: Number(url.searchParams.get("page") ?? "1"),
    q: url.searchParams.get("q") ?? "",
  });
  return json({ ok: true, qaAccess: account.qaAccess, ...listed });
}

export async function POST(request: Request) {
  const account = await requireAskReviewAccount();
  if (!account) return json({ ok: false, reason: "UNAUTHENTICATED" }, 401);
  const limited = limitAskReviewLocationCreate(account.accountId);
  if (!limited.ok) return json({ ok: false, reason: limited.reason }, 429);
  const body = await request.json().catch(() => ({})) as { name?: string; placeId?: string; mapsUrl?: string };
  const created = await repoCreateLocation({
    accountId: account.accountId,
    name: body.name ?? "",
    placeId: body.placeId,
    mapsUrl: body.mapsUrl,
  });
  if (!created.ok) return json({ ok: false, reason: created.reason }, 400);
  return json({ ok: true, location: created.location });
}
