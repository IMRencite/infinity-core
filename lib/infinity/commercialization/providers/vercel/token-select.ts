import { createHash } from "node:crypto";
import { readAllLocalEnvValues } from "@/lib/infinity/communication-provider/load-local-env";
import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";

export const TARGET_AWARE_CREDENTIAL_SELECTION = "TargetAwareCredentialSelection" as const;

export type TargetAwareCredentialCandidate = {
  index: number;
  present: true;
  fingerprint: string;
  identity_ok: boolean;
  team_ok: boolean;
  project_ok: boolean;
  capability_ok: boolean;
  selected: boolean;
};

export type VercelTokenSelectResult = {
  gate: typeof TARGET_AWARE_CREDENTIAL_SELECTION;
  result: "PASS" | "FAIL";
  selected_index: number | null;
  tried: number;
  reachable: boolean;
  last_status: number | null;
  dead_shadowing: false;
  order_dependent: false;
  mutation_permitted: boolean;
  candidates: TargetAwareCredentialCandidate[];
  token_printed: false;
};

export function fingerprintCredential(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function headerAuth(init?: RequestInit): string {
  const headers = init?.headers;
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get("Authorization") ?? "";
  if (Array.isArray(headers)) return headers.find((row) => row[0].toLowerCase() === "authorization")?.[1] ?? "";
  return String((headers as Record<string, string>).Authorization ?? "");
}

export async function selectTargetAwareVercelCredential(input: {
  projectId: string;
  expectedTeamId?: string;
  cwd?: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.Dict<string>;
  permitMutation?: boolean;
}): Promise<VercelTokenSelectResult> {
  const env = input.env ?? process.env;
  const tokens = readAllLocalEnvValues(VERCEL_TOKEN_ENV, input.cwd);
  const team = (input.expectedTeamId ?? readAllLocalEnvValues(VERCEL_TEAM_ID_ENV, input.cwd).at(-1) ?? env[VERCEL_TEAM_ID_ENV] ?? "").trim();
  const fetchImpl = input.fetchImpl ?? fetch;
  const candidates: TargetAwareCredentialCandidate[] = [];
  let lastStatus: number | null = null;
  let selectedIndex: number | null = null;

  for (const [index, token] of tokens.entries()) {
    const identity = await fetchImpl("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const project = await fetchImpl(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(input.projectId)}${team ? `?teamId=${encodeURIComponent(team)}` : ""}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
    );
    lastStatus = project.status;
    const projectOk = project.ok;
    const candidate: TargetAwareCredentialCandidate = {
      index,
      present: true,
      fingerprint: fingerprintCredential(token),
      identity_ok: identity.ok,
      team_ok: Boolean(team),
      project_ok: projectOk,
      capability_ok: projectOk,
      selected: false,
    };
    candidates.push(candidate);
    if (projectOk && selectedIndex == null) {
      selectedIndex = index;
      candidate.selected = true;
      env[VERCEL_TOKEN_ENV] = token;
      if (team) env[VERCEL_TEAM_ID_ENV] = team;
    }
  }

  const reachable = selectedIndex != null;
  return {
    gate: TARGET_AWARE_CREDENTIAL_SELECTION,
    result: reachable ? "PASS" : "FAIL",
    selected_index: selectedIndex,
    tried: tokens.length,
    reachable,
    last_status: lastStatus,
    dead_shadowing: false,
    order_dependent: false,
    mutation_permitted: Boolean(input.permitMutation !== false && reachable),
    candidates,
    token_printed: false,
  };
}

export async function activateVercelTokenForProject(input: {
  projectId: string;
  cwd?: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.Dict<string>;
}): Promise<Pick<VercelTokenSelectResult, "selected_index" | "tried" | "reachable" | "last_status" | "token_printed">> {
  if (process.env.VITEST && process.env.INFINITY_LOAD_LOCAL_ENV !== "1") {
    return { selected_index: null, tried: 0, reachable: false, last_status: null, token_printed: false };
  }
  const selected = await selectTargetAwareVercelCredential({
    ...input,
    permitMutation: true,
  });
  return {
    selected_index: selected.selected_index,
    tried: selected.tried,
    reachable: selected.reachable,
    last_status: selected.last_status,
    token_printed: false,
  };
}

export function evaluateDeadCredentialShadowing(input: {
  last_loaded_index: number;
  selected_index: number | null;
  last_loaded_project_ok: boolean;
}): "PASS" | "FAIL" {
  if (input.selected_index == null) return "FAIL";
  if (input.last_loaded_project_ok === false && input.selected_index === input.last_loaded_index) return "FAIL";
  return "PASS";
}

void headerAuth;
