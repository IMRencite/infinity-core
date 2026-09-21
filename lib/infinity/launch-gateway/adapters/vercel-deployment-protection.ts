import { FAILED_CRE_VALIDATION_PROJECT } from "@/lib/infinity/market-validation-experiment/constants";
import { HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE } from "@/lib/infinity/market-validation-experiment/live-validation-failure";

export const VERCEL_PROJECT_UPDATE_PATH = "/v9/projects" as const;
export const VERCEL_PROJECT_UPDATE_METHOD = "PATCH" as const;
export const VERCEL_DISABLE_SSO_PROTECTION_BODY = { ssoProtection: null } as const;
export const PROTECTION_CAPABILITY = HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE;
export const ISOLATED_VALIDATION_PROJECT = FAILED_CRE_VALIDATION_PROJECT;

export function vercelProjectUpdatePath(projectIdOrName: string): string {
  return `${VERCEL_PROJECT_UPDATE_PATH}/${encodeURIComponent(projectIdOrName)}`;
}

export function buildVercelDisableSsoProtectionBody(): { ssoProtection: null } {
  return { ssoProtection: null };
}

export function evaluateVercelProtectionMutationRequest(input: {
  projectName: string;
  body: unknown;
  teamDefault?: boolean;
  protectionBypassHeader?: unknown;
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (input.projectName !== ISOLATED_VALIDATION_PROJECT) {
    issues.push("PROJECT_SCOPE_FORBIDDEN");
  }
  if (input.teamDefault) issues.push("TEAM_WIDE_MUTATION_FORBIDDEN");
  if (input.protectionBypassHeader) issues.push("PROTECTION_BYPASS_FORBIDDEN");
  if (!input.body || typeof input.body !== "object" || Array.isArray(input.body)) {
    issues.push("INVALID_PROTECTION_BODY");
    return { valid: false, issues };
  }
  const keys = Object.keys(input.body as object);
  if (keys.length !== 1 || keys[0] !== "ssoProtection") issues.push("INVENTED_PROTECTION_FIELD");
  if ((input.body as { ssoProtection?: unknown }).ssoProtection !== null) {
    issues.push("SSO_PROTECTION_MUST_BE_NULL");
  }
  return { valid: issues.length === 0, issues };
}

export function protectionEnabledFromProject(body: {
  ssoProtection?: { deploymentType?: string } | null;
  passwordProtection?: unknown;
}): {
  vercelAuthEnabled: boolean;
  passwordEnabled: boolean;
} {
  return {
    vercelAuthEnabled: body.ssoProtection != null,
    passwordEnabled: body.passwordProtection != null,
  };
}

export async function inspectVercelProjectSsoProtection(input: {
  projectName: string;
  teamId?: string | null;
  token?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<{
  projectName: string;
  found: boolean;
  vercelAuthEnabled: boolean | null;
  passwordEnabled: boolean | null;
  ssoProtection: unknown;
  httpStatus: number | null;
  method: "GET";
  mutated: false;
}> {
  const name = input.projectName.trim();
  const fetchImpl = input.fetchImpl ?? fetch;
  const teamId = input.teamId ?? null;
  const token = input.token ?? null;
  const path = vercelProjectUpdatePath(name);
  const url = teamId
    ? `https://api.vercel.com${path}?teamId=${encodeURIComponent(teamId)}`
    : `https://api.vercel.com${path}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(url, { method: "GET", headers });
  if (res.status === 404) {
    return {
      projectName: name,
      found: false,
      vercelAuthEnabled: null,
      passwordEnabled: null,
      ssoProtection: null,
      httpStatus: 404,
      method: "GET",
      mutated: false,
    };
  }
  if (!res.ok) {
    return {
      projectName: name,
      found: false,
      vercelAuthEnabled: null,
      passwordEnabled: null,
      ssoProtection: null,
      httpStatus: res.status,
      method: "GET",
      mutated: false,
    };
  }
  const body = (await res.json()) as {
    name?: string;
    ssoProtection?: { deploymentType?: string } | null;
    passwordProtection?: unknown;
  };
  const flags = protectionEnabledFromProject(body);
  return {
    projectName: body.name ?? name,
    found: true,
    vercelAuthEnabled: flags.vercelAuthEnabled,
    passwordEnabled: flags.passwordEnabled,
    ssoProtection: body.ssoProtection ?? null,
    httpStatus: 200,
    method: "GET",
    mutated: false,
  };
}
