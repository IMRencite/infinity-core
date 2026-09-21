import { cookies } from "next/headers";
import { json } from "@/lib/infinity/askreview-product/http";
import { repoSignout } from "@/lib/infinity/askreview-product/repository";
import { ASKREVIEW_SESSION_COOKIE, clearAskReviewCookieHeader } from "@/lib/infinity/askreview-product/session";

export async function POST() {
  const jar = await cookies();
  await repoSignout(jar.get(ASKREVIEW_SESSION_COOKIE)?.value ?? null);
  return json({ ok: true }, 200, { "Set-Cookie": clearAskReviewCookieHeader() });
}
