import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "../launch-gateway/provider-config.ts";

export const CLUB_THROTTLE_VERCEL_PROJECT_ID = "prj_LBveyJDSI2LKuNdDlwCJ8Zkx4kcD";
export const INFINITY_RUNTIME_VERCEL_PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
export const INFINITY_RUNTIME_VERCEL_PROJECT = "infinity-runtime";
export const CLUB_THROTTLE_COMMERCE_BRIDGE_URL =
  "https://infinity-runtime.vercel.app/api/infinity/commerce/club-throttle/stripe-paid";

export type EnvKeyPresence = "PRESENT" | "MISSING" | "INVALID";

function keyPresenceFromTargets(
  envs: Array<{ key?: string; target?: string[] }>,
  key: string,
): EnvKeyPresence {
  const row = envs.find((e) => e.key === key);
  if (!row) return "MISSING";
  const targets = Array.isArray(row.target) ? row.target : [];
  if (!targets.includes("production")) return "MISSING";
  return "PRESENT";
}

/** Decrypted production-scoped values; never log return values. */
export async function fetchVercelProductionEnvValues(
  projectId: string,
  keys: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<Record<string, string | null>> {
  const token = (env[VERCEL_TOKEN_ENV] ?? "").trim();
  const teamId = (env[VERCEL_TEAM_ID_ENV] ?? "").trim();
  const out: Record<string, string | null> = Object.fromEntries(keys.map((k) => [k, null]));
  if (!token || token.length < 8) return out;
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!res.ok) return out;
  const json = (await res.json()) as {
    envs?: Array<{ id?: string; key?: string; target?: string[] }>;
  };
  const envs = Array.isArray(json.envs) ? json.envs : [];
  for (const key of keys) {
    const row =
      envs.find((e) => e.key === key && Array.isArray(e.target) && e.target.includes("production")) ??
      envs.find((e) => e.key === key);
    if (!row?.id) {
      out[key] = null;
      continue;
    }
    const decUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(row.id)}?decrypt=true${teamId ? `&teamId=${encodeURIComponent(teamId)}` : ""}`;
    const dec = await fetch(decUrl, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!dec.ok) {
      out[key] = null;
      continue;
    }
    const body = (await dec.json()) as { value?: string };
    out[key] = typeof body.value === "string" && body.value.trim() ? body.value.trim() : null;
  }
  return out;
}

export async function fetchVercelProjectEnvKeyPresence(
  projectId: string,
  keys: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<Record<string, EnvKeyPresence>> {
  const token = (env[VERCEL_TOKEN_ENV] ?? "").trim();
  const teamId = (env[VERCEL_TEAM_ID_ENV] ?? "").trim();
  const out: Record<string, EnvKeyPresence> = Object.fromEntries(keys.map((k) => [k, "MISSING" as const]));
  if (!token || token.length < 8) {
    for (const k of keys) out[k] = "MISSING";
    return out;
  }
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    for (const k of keys) out[k] = "MISSING";
    return out;
  }
  const json = (await res.json()) as { envs?: Array<{ key?: string; target?: string[] }> };
  const envs = Array.isArray(json.envs) ? json.envs : [];
  for (const key of keys) {
    out[key] = keyPresenceFromTargets(envs, key);
  }
  return out;
}

export async function auditClubThrottleBridgeEnvParity(env: NodeJS.ProcessEnv = process.env): Promise<{
  BRIDGE_ENV_PARITY_QC: "PASS" | "FAIL";
  club_throttle: Record<string, EnvKeyPresence>;
  infinity_runtime: Record<string, EnvKeyPresence>;
}> {
  const ctKeys = ["INFINITY_COMMERCE_BRIDGE_URL", "INFINITY_COMMERCE_BRIDGE_TOKEN"];
  const rtKeys = ["INFINITY_COMMERCE_BRIDGE_TOKEN"];
  const [club_throttle, infinity_runtime] = await Promise.all([
    fetchVercelProjectEnvKeyPresence(CLUB_THROTTLE_VERCEL_PROJECT_ID, ctKeys, env),
    fetchVercelProjectEnvKeyPresence(INFINITY_RUNTIME_VERCEL_PROJECT_ID, rtKeys, env),
  ]);
  const pass =
    club_throttle.INFINITY_COMMERCE_BRIDGE_URL === "PRESENT" &&
    club_throttle.INFINITY_COMMERCE_BRIDGE_TOKEN === "PRESENT" &&
    infinity_runtime.INFINITY_COMMERCE_BRIDGE_TOKEN === "PRESENT";
  return { BRIDGE_ENV_PARITY_QC: pass ? "PASS" : "FAIL", club_throttle, infinity_runtime };
}

export async function auditFulfillmentRuntimeGelatoEnv(env: NodeJS.ProcessEnv = process.env): Promise<{
  GELATO_FULFILLMENT_RUNTIME: "infinity-runtime";
  GELATO_LIVE_CREDENTIAL_REQUIRED_ON: "infinity-runtime-vercel-production";
  GELATO_MODE: EnvKeyPresence | "DISABLED";
  GELATO_LIVE_API_KEY: EnvKeyPresence;
  CLUB_THROTTLE_GELATO_LIVE_SUBMIT: "DISABLED" | "ENABLED" | "MISSING";
}> {
  const keys = ["GELATO_MODE", "GELATO_LIVE_API_KEY", "CLUB_THROTTLE_GELATO_LIVE_SUBMIT"];
  const [presence, values] = await Promise.all([
    fetchVercelProjectEnvKeyPresence(INFINITY_RUNTIME_VERCEL_PROJECT_ID, keys, env),
    fetchVercelProductionEnvValues(INFINITY_RUNTIME_VERCEL_PROJECT_ID, keys, env),
  ]);
  const gelatoMode =
    presence.GELATO_MODE === "PRESENT"
      ? "PRESENT"
      : env.GELATO_MODE === "live"
        ? "PRESENT"
        : ("MISSING" as const);
  const gelatoKey =
    presence.GELATO_LIVE_API_KEY === "PRESENT"
      ? "PRESENT"
      : env.GELATO_LIVE_API_KEY?.trim()
        ? "PRESENT"
        : ("MISSING" as const);
  const submitRaw =
    values.CLUB_THROTTLE_GELATO_LIVE_SUBMIT ??
    (presence.CLUB_THROTTLE_GELATO_LIVE_SUBMIT === "PRESENT" ? env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT : undefined);
  let submit: "DISABLED" | "ENABLED" | "MISSING" = "MISSING";
  if (submitRaw === "ENABLED") submit = "ENABLED";
  else if (submitRaw === "DISABLED" || presence.CLUB_THROTTLE_GELATO_LIVE_SUBMIT === "PRESENT") submit = "DISABLED";
  else if (env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT === "ENABLED") submit = "ENABLED";
  else submit = "DISABLED";
  return {
    GELATO_FULFILLMENT_RUNTIME: "infinity-runtime",
    GELATO_LIVE_CREDENTIAL_REQUIRED_ON: "infinity-runtime-vercel-production",
    GELATO_MODE: gelatoMode === "PRESENT" ? "PRESENT" : "MISSING",
    GELATO_LIVE_API_KEY: gelatoKey,
    CLUB_THROTTLE_GELATO_LIVE_SUBMIT: submit === "ENABLED" ? "ENABLED" : "DISABLED",
  };
}

const CLUB_THROTTLE_PRODUCTION_ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PUBLISHABLE_KEY",
  "CLUB_THROTTLE_STRIPE_AUTOMATIC_TAX",
  "CLUB_THROTTLE_STRIPE_TAX_OHIO_COLLECTING",
  "CLUB_THROTTLE_LIVE_CHECKOUT",
  "CLUB_THROTTLE_GELATO_LIVE_SUBMIT",
  "CLUB_THROTTLE_COMMERCE_LIVE",
  "INFINITY_COMMERCE_BRIDGE_URL",
  "INFINITY_COMMERCE_BRIDGE_TOKEN",
  "CLUB_THROTTLE_PUBLIC_ORIGIN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export async function auditClubThrottleCustomerAuthEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  CUSTOMER_AUTH_ENV_QC: "PASS" | "FAIL";
  NEXT_PUBLIC_SUPABASE_URL: EnvKeyPresence;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: EnvKeyPresence;
  SUPABASE_SERVICE_ROLE_KEY: EnvKeyPresence;
}> {
  const presence = await fetchVercelProjectEnvKeyPresence(
    CLUB_THROTTLE_VERCEL_PROJECT_ID,
    ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    env,
  );
  const urlOk =
    presence.NEXT_PUBLIC_SUPABASE_URL === "PRESENT" ||
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim());
  const anonOk =
    presence.NEXT_PUBLIC_SUPABASE_ANON_KEY === "PRESENT" || Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const serviceOk =
    presence.SUPABASE_SERVICE_ROLE_KEY === "PRESENT" || Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return {
    CUSTOMER_AUTH_ENV_QC: urlOk && anonOk && serviceOk ? "PASS" : "FAIL",
    NEXT_PUBLIC_SUPABASE_URL: presence.NEXT_PUBLIC_SUPABASE_URL === "PRESENT" ? "PRESENT" : urlOk ? "PRESENT" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      presence.NEXT_PUBLIC_SUPABASE_ANON_KEY === "PRESENT" ? "PRESENT" : anonOk ? "PRESENT" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY:
      presence.SUPABASE_SERVICE_ROLE_KEY === "PRESENT" ? "PRESENT" : serviceOk ? "PRESENT" : "MISSING",
  };
}

const INFINITY_RUNTIME_PRODUCTION_ENV_KEYS = [
  "GELATO_MODE",
  "GELATO_LIVE_API_KEY",
  "CLUB_THROTTLE_GELATO_LIVE_SUBMIT",
  "INFINITY_COMMERCE_BRIDGE_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

/** Merge Vercel production decrypted env over process.env for audits (never log result). */
export async function buildClubThrottleProductionAuditEnv(
  base: NodeJS.ProcessEnv = process.env,
): Promise<NodeJS.ProcessEnv> {
  const [ct, rt] = await Promise.all([
    fetchVercelProductionEnvValues(CLUB_THROTTLE_VERCEL_PROJECT_ID, [...CLUB_THROTTLE_PRODUCTION_ENV_KEYS], base),
    fetchVercelProductionEnvValues(INFINITY_RUNTIME_VERCEL_PROJECT_ID, [...INFINITY_RUNTIME_PRODUCTION_ENV_KEYS], base),
  ]);
  const overlay: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...ct, ...rt })) {
    if (v) overlay[k] = v;
  }
  const merged: NodeJS.ProcessEnv = { ...base, ...overlay };
  for (const key of INFINITY_RUNTIME_PRODUCTION_ENV_KEYS) {
    if (!rt[key]) delete merged[key];
  }
  for (const key of CLUB_THROTTLE_PRODUCTION_ENV_KEYS) {
    if (!ct[key]) delete merged[key];
  }
  const auditRestoreKeys = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "GELATO_MODE",
    "GELATO_LIVE_API_KEY",
    "CLUB_THROTTLE_GELATO_LIVE_SUBMIT",
    "CLUB_THROTTLE_COMMERCE_LIVE",
  ] as const;
  for (const key of auditRestoreKeys) {
    if (!merged[key]?.trim() && base[key]?.trim()) merged[key] = base[key]!.trim();
  }
  if (!merged.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() && base.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) {
    merged.NEXT_PUBLIC_SUPABASE_ANON_KEY = base.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();
  }
  return merged;
}

export async function fetchInfinityRuntimeProductionDeployment(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ deploymentId: string | null; url: string | null; aliasDeploymentId: string | null }> {
  const token = (env[VERCEL_TOKEN_ENV] ?? "").trim();
  const teamId = (env[VERCEL_TEAM_ID_ENV] ?? "").trim();
  if (!token) return { deploymentId: null, url: null, aliasDeploymentId: null };
  const q = `projectId=${encodeURIComponent(INFINITY_RUNTIME_VERCEL_PROJECT_ID)}&limit=1&target=production${teamId ? `&teamId=${encodeURIComponent(teamId)}` : ""}`;
  const list = await fetch(`https://api.vercel.com/v6/deployments?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!list.ok) return { deploymentId: null, url: null, aliasDeploymentId: null };
  const body = (await list.json()) as { deployments?: Array<{ uid?: string; url?: string }> };
  const latest = body.deployments?.[0];
  const alias = await fetch(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(latest?.uid ?? "")}${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => null);
  let aliasDeploymentId: string | null = null;
  if (alias?.ok) {
    const aj = (await alias.json()) as { alias?: string[]; aliasAssigned?: boolean };
    if (aj.aliasAssigned) aliasDeploymentId = latest?.uid ?? null;
  }
  return {
    deploymentId: latest?.uid ?? null,
    url: latest?.url ? `https://${latest.url}` : null,
    aliasDeploymentId,
  };
}
