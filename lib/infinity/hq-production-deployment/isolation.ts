import { HQ_PUBLIC_ISOLATION_GATE, type HqNamedGate } from "./contract";

const PRIVATE_LEAK = /founder daily|Verified Treasury Cash|Mercury API token|prospect@|authorized capital|execute_publish|CRON_SECRET|service_role|organization_members|\/api\/operator-console\/daily-report|suppression:email|source_role|1a0af74557b0eb36|ProspectAuthoredOptOut/i;

export function evaluateHQPublicIsolationGate(input: {
  publicOrigin: string;
  publicServesOperations: boolean;
  publicServesHq: boolean;
  body: string;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!/^https:\/\/(www\.)?imros\.io\/?$/.test(input.publicOrigin)) reasons.push("PUBLIC_ORIGIN_NOT_IMROS");
  if (!input.publicServesOperations) reasons.push("PUBLIC_OPERATIONS_MISSING");
  if (input.publicServesHq) reasons.push("PUBLIC_SERVES_FOUNDER_HQ");
  if (PRIVATE_LEAK.test(input.body)) reasons.push("PRIVATE_HQ_PAYLOAD_IN_PUBLIC");
  if (/FounderDailyOperationsReport|hq-todays-report|data-hq-daily-reports/.test(input.body)) {
    reasons.push("FOUNDER_REPORTS_EXPOSED_PUBLICLY");
  }
  return {
    gate: HQ_PUBLIC_ISOLATION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["PUBLIC_ISOLATED"],
  };
}
