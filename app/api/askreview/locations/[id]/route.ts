import { json, requireAskReviewAccount } from "@/lib/infinity/askreview-product/http";
import { repoGetLocation, repoListKits, repoPatchLocation } from "@/lib/infinity/askreview-product/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await requireAskReviewAccount();
  if (!account) return json({ ok: false, reason: "UNAUTHENTICATED" }, 401);
  const { id } = await context.params;
  const location = await repoGetLocation(account.accountId, id);
  if (!location) return json({ ok: false, reason: "NOT_FOUND" }, 404);
  return json({ ok: true, location, kits: await repoListKits(account.accountId, id), qaAccess: account.qaAccess });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await requireAskReviewAccount();
  if (!account) return json({ ok: false, reason: "UNAUTHENTICATED" }, 401);
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { name?: string; status?: "ACTIVE" | "ARCHIVED" };
  const location = await repoPatchLocation({ accountId: account.accountId, locationId: id, ...body });
  if (!location) return json({ ok: false, reason: "NOT_FOUND" }, 404);
  return json({ ok: true, location });
}
