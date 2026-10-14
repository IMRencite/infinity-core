export const PORTFOLIO_CRON_SCHEDULE_IDENTITY = "0 */6 * * *" as const;

export type PortfolioTickTriggerType = "REAL_CRON" | "MANUAL";

export type PortfolioCronProvenance = {
  trigger_type: PortfolioTickTriggerType;
  platform_provenance: string;
  schedule_identity: typeof PORTFOLIO_CRON_SCHEDULE_IDENTITY;
  x_vercel_cron_header: string | null;
  user_agent: string | null;
};

/** Vercel scheduled invocations set User-Agent vercel-cron; manual Bearer probes must not spoof REAL_CRON. */
export function resolvePortfolioCronProvenance(request: Request): PortfolioCronProvenance {
  const userAgent = request.headers.get("user-agent");
  const cronHeader = request.headers.get("x-vercel-cron");
  const platformCron =
    cronHeader === "1" && /vercel-cron/i.test(userAgent ?? "");
  return {
    trigger_type: platformCron ? "REAL_CRON" : "MANUAL",
    platform_provenance: platformCron ? "vercel-cron:user-agent" : "manual-auth",
    schedule_identity: PORTFOLIO_CRON_SCHEDULE_IDENTITY,
    x_vercel_cron_header: cronHeader,
    user_agent: userAgent,
  };
}

export function portfolioCronProvenanceIntegrityQc(input: {
  manual_with_spoofed_header: PortfolioTickTriggerType;
  platform_cron: PortfolioTickTriggerType;
}): "PASS" | "FAIL" {
  return input.manual_with_spoofed_header === "MANUAL" && input.platform_cron === "REAL_CRON" ? "PASS" : "FAIL";
}
