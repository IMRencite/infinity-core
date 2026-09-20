export function authorizeRuntimeTickRequest(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): { ok: boolean; reason: string } {
  const expected = env.CRON_SECRET || env.INFINITY_RUNTIME_TICK_SECRET;
  if (!expected) {
    return { ok: false, reason: "RUNTIME_TICK_SECRET_REQUIRED" };
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${expected}`) {
    return { ok: true, reason: "AUTHORIZED" };
  }
  return { ok: false, reason: "UNAUTHORIZED" };
}
