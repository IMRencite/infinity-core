import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";

type EnvMap = Record<string, string | undefined>;

export function authorizeCloudRuntimeRequest(
  request: Request,
  env: EnvMap = process.env,
): { ok: boolean; reason: string } {
  return authorizeRuntimeTickRequest(request, env as NodeJS.ProcessEnv);
}

export function authorizeCloudRuntimeWake(
  request: Request,
  env: EnvMap = process.env,
): { ok: boolean; reason: string } {
  const cron = authorizeRuntimeTickRequest(request, env as NodeJS.ProcessEnv);
  if (cron.ok) return cron;
  const wakeSecret = env.INFINITY_RUNTIME_WAKE_SECRET;
  if (!wakeSecret) return cron;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${wakeSecret}`) return { ok: true, reason: "AUTHORIZED_WAKE" };
  return { ok: false, reason: "UNAUTHORIZED" };
}

export function verifyCloudRuntimeEventSignature(
  request: Request,
  env: EnvMap = process.env,
): { ok: boolean; reason: string } {
  const expected = env.INFINITY_RUNTIME_WAKE_SECRET || env.CRON_SECRET || env.INFINITY_RUNTIME_TICK_SECRET;
  if (!expected) return { ok: false, reason: "WAKE_SECRET_REQUIRED" };
  const header = request.headers.get("x-infinity-runtime-signature") ?? request.headers.get("authorization");
  if (header === expected || header === `Bearer ${expected}`) {
    return { ok: true, reason: "SIGNED" };
  }
  return { ok: false, reason: "UNSIGNED_OR_INVALID" };
}

export function localProductionSchedulerEnabled(env: EnvMap = process.env): boolean {
  if (env.VERCEL === "1" || env.INFINITY_CLOUD_RUNTIME_AUTHORITY === "1") return false;
  return env.INFINITY_LOCAL_PRODUCTION_SCHEDULER === "1";
}

export function auditRuntimeEnv(env: EnvMap = process.env): Array<{
  name: string;
  status: "required" | "optional";
  present: boolean;
}> {
  return [
    { name: "CRON_SECRET", status: "required", present: Boolean(env.CRON_SECRET || env.INFINITY_RUNTIME_TICK_SECRET) },
    { name: "INFINITY_RUNTIME_TICK_SECRET", status: "optional", present: Boolean(env.INFINITY_RUNTIME_TICK_SECRET) },
    { name: "INFINITY_RUNTIME_WAKE_SECRET", status: "optional", present: Boolean(env.INFINITY_RUNTIME_WAKE_SECRET) },
    { name: "NEXT_PUBLIC_SUPABASE_URL", status: "required", present: Boolean(env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "SUPABASE_SERVICE_ROLE_KEY", status: "required", present: Boolean(env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: "VERCEL", status: "optional", present: env.VERCEL === "1" },
  ];
}
