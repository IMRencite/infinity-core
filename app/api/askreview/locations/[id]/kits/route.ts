import { json, requireAskReviewAccount } from "@/lib/infinity/askreview-product/http";
import { limitAskReviewGenerate } from "@/lib/infinity/askreview-product/rate-limit";
import { repoFulfillKit } from "@/lib/infinity/askreview-product/repository";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await requireAskReviewAccount();
  if (!account) return json({ ok: false, reason: "UNAUTHENTICATED" }, 401);
  const limited = limitAskReviewGenerate(account.accountId);
  if (!limited.ok) return json({ ok: false, reason: limited.reason }, 429);
  const { id } = await context.params;
  const result = await repoFulfillKit({ accountId: account.accountId, locationId: id });
  if (!result.ok) return json({ ok: false, reason: result.reason, recovery: result.recovery }, 400);
  return json({ ok: true, kit: result.kit });
}
