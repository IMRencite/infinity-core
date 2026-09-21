import { json } from "@/lib/infinity/askreview-product/http";
import { limitAskReviewAuth } from "@/lib/infinity/askreview-product/rate-limit";
import { repoSignin, askReviewUsesProductionPersistence } from "@/lib/infinity/askreview-product/repository";
import { askReviewCookieHeader } from "@/lib/infinity/askreview-product/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const identity = `${request.headers.get("x-forwarded-for") ?? "local"}:${body.email ?? ""}`;
  const limited = limitAskReviewAuth(identity);
  if (!limited.ok) return json({ ok: false, reason: limited.reason }, 429);
  const result = await repoSignin({ email: body.email ?? "", password: body.password ?? "" });
  if (!result.ok) return json({ ok: false, reason: result.reason }, 401);
  if (askReviewUsesProductionPersistence()) return json({ ok: true });
  if ("session" in result && "sessionId" in result.session) {
    return json({ ok: true }, 200, { "Set-Cookie": askReviewCookieHeader(result.session.sessionId) });
  }
  return json({ ok: true });
}
