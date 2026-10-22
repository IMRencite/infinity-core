import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";

export const PORTFOLIO_CRON_SCHEDULE_IDENTITY = "0 */6 * * *" as const;

export const VERCEL_CRON_DOCUMENTED_USER_AGENT = "vercel-cron/1.0" as const;

/** Durable scheduler classification — not equivalent to request authentication. */
export type PortfolioDurableTriggerType =
  | "MANUAL"
  | "AUTHENTICATED_CRON_SHAPED"
  | "REAL_CRON_PLATFORM_CONFIRMED"
  | "UNKNOWN";

export type PortfolioPlatformOriginQc = "PASS" | "PENDING" | "FAIL";

export type PortfolioCronProvenance = {
  trigger_type: PortfolioDurableTriggerType;
  platform_provenance: string;
  schedule_identity: typeof PORTFOLIO_CRON_SCHEDULE_IDENTITY;
  x_vercel_cron_header: string | null;
  x_vercel_cron_schedule_header: string | null;
  user_agent: string | null;
  authorization_validated: boolean;
  platform_origin_qc: PortfolioPlatformOriginQc;
};

export function isPortfolioScheduledTrigger(trigger_type: PortfolioDurableTriggerType): boolean {
  return trigger_type === "REAL_CRON_PLATFORM_CONFIRMED";
}

/** Ledger rows: REAL_CRON only after platform confirmation; cron-shaped auth stays honest CRON_SHAPED. */
export function mapProvenanceToLedgerTriggerType(
  trigger_type: PortfolioDurableTriggerType,
): "REAL_CRON" | "CRON_SHAPED" | "MANUAL" {
  if (trigger_type === "REAL_CRON_PLATFORM_CONFIRMED") return "REAL_CRON";
  if (trigger_type === "AUTHENTICATED_CRON_SHAPED") return "CRON_SHAPED";
  return "MANUAL";
}

/**
 * Request-time classification only. Bearer + vercel User-Agent => AUTHENTICATED_CRON_SHAPED,
 * never REAL_CRON_PLATFORM_CONFIRMED without first-party platform log correlation.
 */
export function resolvePortfolioCronProvenance(
  request: Request,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): PortfolioCronProvenance {
  const userAgent = request.headers.get("user-agent");
  const cronHeader = request.headers.get("x-vercel-cron");
  const cronScheduleHeader = request.headers.get("x-vercel-cron-schedule");
  const auth = authorizeRuntimeTickRequest(request, env);
  const vercelCronUa = (userAgent ?? "").trim().toLowerCase() === VERCEL_CRON_DOCUMENTED_USER_AGENT;
  const cronShaped = vercelCronUa && auth.ok;
  const trigger_type: PortfolioDurableTriggerType = !auth.ok
    ? "MANUAL"
    : cronShaped
      ? "AUTHENTICATED_CRON_SHAPED"
      : "MANUAL";
  return {
    trigger_type,
    platform_provenance: cronShaped
      ? "authenticated-cron-shaped:pending-platform-confirmation"
      : auth.ok
        ? "manual-auth"
        : "unauthorized",
    schedule_identity: PORTFOLIO_CRON_SCHEDULE_IDENTITY,
    x_vercel_cron_header: cronHeader,
    x_vercel_cron_schedule_header: cronScheduleHeader,
    user_agent: userAgent,
    authorization_validated: auth.ok,
    platform_origin_qc: cronShaped ? "PENDING" : auth.ok ? "PENDING" : "FAIL",
  };
}

/** Elevate to REAL_CRON only when Vercel platform classifies the invocation as Cron Job. */
export function classifyPortfolioCronPlatformOrigin(input: {
  authorization_validated: boolean;
  vercel_request_type: string | null;
  route_matches: boolean;
  deployment_matches: boolean;
  timestamp_matches: boolean;
}): {
  trigger_type: PortfolioDurableTriggerType;
  platform_origin_qc: PortfolioPlatformOriginQc;
  platform_provenance: string;
} {
  if (!input.authorization_validated) {
    return {
      trigger_type: "MANUAL",
      platform_origin_qc: "FAIL",
      platform_provenance: "unauthorized",
    };
  }
  const requestType = (input.vercel_request_type ?? "").trim().toLowerCase();
  const isCronJob =
    requestType === "cron job" ||
    requestType === "cron" ||
    requestType.includes("cron job");
  if (
    isCronJob &&
    input.route_matches &&
    input.deployment_matches &&
    input.timestamp_matches
  ) {
    return {
      trigger_type: "REAL_CRON_PLATFORM_CONFIRMED",
      platform_origin_qc: "PASS",
      platform_provenance: "vercel-platform:cron-job-confirmed",
    };
  }
  if (!input.vercel_request_type) {
    return {
      trigger_type: "AUTHENTICATED_CRON_SHAPED",
      platform_origin_qc: "PENDING",
      platform_provenance: "authenticated-cron-shaped:platform-log-inconclusive",
    };
  }
  return {
    trigger_type: "MANUAL",
    platform_origin_qc: "FAIL",
    platform_provenance: "platform-log:non-cron-request-type",
  };
}

export function portfolioCronProvenanceIntegrityQc(input: {
  manual_bearer_only: PortfolioDurableTriggerType;
  manual_ua_only: PortfolioDurableTriggerType;
  bearer_plus_vercel_ua: PortfolioDurableTriggerType;
}): "PASS" | "FAIL" {
  return input.manual_bearer_only === "MANUAL" &&
    input.manual_ua_only === "MANUAL" &&
    input.bearer_plus_vercel_ua === "AUTHENTICATED_CRON_SHAPED"
    ? "PASS"
    : "FAIL";
}

export function cronAuthVsProvenanceSeparationQc(): "PASS" | "FAIL" {
  const secret = "test-cron-secret";
  const spoof = resolvePortfolioCronProvenance(
    new Request("http://localhost/api/runtime/portfolio-operating-tick", {
      headers: {
        authorization: `Bearer ${secret}`,
        "user-agent": VERCEL_CRON_DOCUMENTED_USER_AGENT,
      },
    }),
    { CRON_SECRET: secret },
  );
  if (spoof.trigger_type === "REAL_CRON_PLATFORM_CONFIRMED") return "FAIL";
  if (!spoof.authorization_validated) return "FAIL";
  if (spoof.trigger_type !== "AUTHENTICATED_CRON_SHAPED") return "FAIL";
  const elevated = classifyPortfolioCronPlatformOrigin({
    authorization_validated: true,
    vercel_request_type: "Cron Job",
    route_matches: true,
    deployment_matches: true,
    timestamp_matches: true,
  });
  return elevated.trigger_type === "REAL_CRON_PLATFORM_CONFIRMED" && elevated.platform_origin_qc === "PASS"
    ? "PASS"
    : "FAIL";
}

export function realCronProvenancePolicyQc(): "PASS" | "FAIL" {
  const secret = "test-cron-secret";
  const manualBearer = resolvePortfolioCronProvenance(
    new Request("http://localhost/api/runtime/portfolio-operating-tick", {
      headers: { authorization: `Bearer ${secret}` },
    }),
    { CRON_SECRET: secret },
  );
  const manualUa = resolvePortfolioCronProvenance(
    new Request("http://localhost/api/runtime/portfolio-operating-tick", {
      headers: { "user-agent": VERCEL_CRON_DOCUMENTED_USER_AGENT },
    }),
    { CRON_SECRET: secret },
  );
  const cronShaped = resolvePortfolioCronProvenance(
    new Request("http://localhost/api/runtime/portfolio-operating-tick", {
      headers: {
        authorization: `Bearer ${secret}`,
        "user-agent": VERCEL_CRON_DOCUMENTED_USER_AGENT,
      },
    }),
    { CRON_SECRET: secret },
  );
  return portfolioCronProvenanceIntegrityQc({
    manual_bearer_only: manualBearer.trigger_type,
    manual_ua_only: manualUa.trigger_type,
    bearer_plus_vercel_ua: cronShaped.trigger_type,
  }) === "PASS" && cronAuthVsProvenanceSeparationQc() === "PASS"
    ? "PASS"
    : "FAIL";
}
