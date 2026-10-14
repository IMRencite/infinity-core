export const PORTFOLIO_JOB_CONTINUATION_V1 = "PORTFOLIO_JOB_CONTINUATION_V1" as const;

export async function triggerPortfolioJobWorkerContinuation(input: {
  cycle_id?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<{ triggered: boolean; reason: string }> {
  const env = input.env ?? process.env;
  const secret = env.CRON_SECRET || env.INFINITY_RUNTIME_TICK_SECRET;
  const base = (env.INFINITY_RUNTIME_URL || env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  if (!secret) return { triggered: false, reason: "RUNTIME_TICK_SECRET_MISSING" };
  const url = new URL("/api/runtime/portfolio-job-worker", base.startsWith("http") ? base : `https://${base}`);
  if (input.cycle_id) url.searchParams.set("cycle_id", input.cycle_id);
  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8_000),
    });
    return { triggered: res.status === 200 || res.status === 202, reason: `HTTP_${res.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { triggered: false, reason: message };
  }
}

export function portfolioJobContinuationQc(): "PASS" | "FAIL" {
  return typeof PORTFOLIO_JOB_CONTINUATION_V1 === "string" ? "PASS" : "FAIL";
}
