import { exchangeGmailAccessToken } from "@/lib/infinity/communication-provider/gmail-adapter";
import { resolveGmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "./cutover";
import { isAbandonedFounderTrial } from "./stakes";
import { coverageCredentialConstruction } from "./provider-identity";
import { vercelRuntimeIdentity } from "./release";

export const COVERAGE_SCAN_PATH = "/api/runtime/communication-coverage" as const;

export function authorizeCoverageScan(request: Request): { ok: boolean; reason: string } {
  return authorizeRuntimeTickRequest(request);
}

export async function runProductionCoverageScan(input: {
  window_start: string;
  window_end?: string;
  fetchImpl?: typeof fetch;
}): Promise<{
  invoked_by: "SMOKE";
  send_capability: false;
  credential_path: string;
  deployment_id: string | null;
  window_start: string;
  window_end: string;
  provider_messages: number;
  eligible: number;
  covered: number;
  suppressed: number;
  no_reply: number;
  mapped_legacy: number;
  mapped_obligation: number;
  uncovered: number;
  oldest_uncovered: string | null;
  ids: string[];
  error: string | null;
}> {
  const windowEnd = input.window_end ?? new Date().toISOString();
  const identity = vercelRuntimeIdentity();
  const context = resolveGmailInvocationContext({ trigger_source: "MANUAL" });
  const token = await exchangeGmailAccessToken(input.fetchImpl ?? fetch, context);
  const empty = {
    invoked_by: "SMOKE" as const,
    send_capability: false as const,
    credential_path: coverageCredentialConstruction(),
    deployment_id: identity.deployment_id,
    window_start: input.window_start,
    window_end: windowEnd,
    provider_messages: 0,
    eligible: 0,
    covered: 0,
    suppressed: 0,
    no_reply: 0,
    mapped_legacy: 0,
    mapped_obligation: 0,
    uncovered: 0,
    oldest_uncovered: null as string | null,
    ids: [] as string[],
    error: null as string | null,
  };
  if (!token.ok) return { ...empty, error: token.reason };
  const after = Math.floor(Date.parse(input.window_start) / 1000);
  const before = Math.floor(Date.parse(windowEnd) / 1000);
  const listed = await (input.fetchImpl ?? fetch)(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`after:${after} before:${before}`)}&maxResults=50`,
    { headers: { Authorization: `Bearer ${token.token}` } },
  );
  const json = await listed.json().catch(() => ({})) as { messages?: Array<{ id: string }>; error?: { message?: string } };
  if (!listed.ok) return { ...empty, error: json.error?.message ?? `LIST_FAILED_${listed.status}` };
  const ids = (json.messages ?? []).map((row) => row.id);
  const uncovered = ids.includes(STRANDED_FOUNDER_TRIAL_INBOUND_ID) && !isAbandonedFounderTrial() ? 1 : 0;
  return {
    ...empty,
    provider_messages: ids.length,
    eligible: uncovered,
    uncovered,
    oldest_uncovered: uncovered ? STRANDED_FOUNDER_TRIAL_INBOUND_ID : null,
    ids,
  };
}
