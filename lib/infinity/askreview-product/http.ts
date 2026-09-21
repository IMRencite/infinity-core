import { cookies } from "next/headers";
import { repoResolveAccount } from "./repository";
import { ASKREVIEW_SESSION_COOKIE } from "./session";

export async function requireAskReviewAccount() {
  const jar = await cookies();
  return repoResolveAccount(jar.get(ASKREVIEW_SESSION_COOKIE)?.value ?? null);
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers });
}
