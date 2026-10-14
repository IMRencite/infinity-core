import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { latestRealCronLedgerForRoute } from "./durable/autonomous-runtime-scheduled-execution-ledger-v1";

export const PORTFOLIO_OPERATING_CRON_PROOF_PATH =
  ".infinity/autonomous-portfolio-operations/last-scheduled-portfolio-cron.json" as const;

export type PortfolioCronProofRecord = {
  trigger: "SCHEDULED";
  provenance: "x-vercel-cron" | "vercel-cron:user-agent";
  completed_at: string;
  route: "/api/runtime/portfolio-operating-tick";
  cycle_version: string;
  assets_published: number;
  cycle_id?: string | null;
};

export function readPortfolioOperatingCronProof(cwd = process.cwd()): PortfolioCronProofRecord | null {
  const file = join(cwd, PORTFOLIO_OPERATING_CRON_PROOF_PATH);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as PortfolioCronProofRecord;
  } catch {
    return null;
  }
}

export async function reconcilePortfolioOperatingCronProofAsync(cwd = process.cwd()): Promise<{
  V44_REAL_PORTFOLIO_CRON_AVAILABLE: boolean;
  V44_PORTFOLIO_CRON_CYCLE_ID: string | null;
  V44_PORTFOLIO_CRON_TIMESTAMP: string | null;
  V44_PORTFOLIO_CRON_PROVENANCE: string | null;
  V44_PORTFOLIO_CRON_STATUS: "PASS" | "PENDING_NEXT_REAL_CRON";
  PORTFOLIO_OPERATING_SCHEDULER_QC: "PASS" | "PENDING_NEXT_REAL_CRON";
}> {
  const ledger = await latestRealCronLedgerForRoute("/api/runtime/portfolio-operating-tick");
  if (ledger && ledger.trigger_type === "REAL_CRON") {
    return {
      V44_REAL_PORTFOLIO_CRON_AVAILABLE: true,
      V44_PORTFOLIO_CRON_CYCLE_ID: ledger.cycle_id,
      V44_PORTFOLIO_CRON_TIMESTAMP: ledger.request_timestamp,
      V44_PORTFOLIO_CRON_PROVENANCE: ledger.platform_provenance,
      V44_PORTFOLIO_CRON_STATUS: "PASS",
      PORTFOLIO_OPERATING_SCHEDULER_QC: "PASS",
    };
  }
  const proof = readPortfolioOperatingCronProof(cwd);
  if (proof && proof.trigger === "SCHEDULED") {
    return {
      V44_REAL_PORTFOLIO_CRON_AVAILABLE: true,
      V44_PORTFOLIO_CRON_CYCLE_ID: proof.cycle_id ?? null,
      V44_PORTFOLIO_CRON_TIMESTAMP: proof.completed_at,
      V44_PORTFOLIO_CRON_PROVENANCE: proof.provenance,
      V44_PORTFOLIO_CRON_STATUS: "PASS",
      PORTFOLIO_OPERATING_SCHEDULER_QC: "PASS",
    };
  }
  return {
    V44_REAL_PORTFOLIO_CRON_AVAILABLE: false,
    V44_PORTFOLIO_CRON_CYCLE_ID: null,
    V44_PORTFOLIO_CRON_TIMESTAMP: null,
    V44_PORTFOLIO_CRON_PROVENANCE: null,
    V44_PORTFOLIO_CRON_STATUS: "PENDING_NEXT_REAL_CRON",
    PORTFOLIO_OPERATING_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
  };
}

/** @deprecated Local FS only — prefer reconcilePortfolioOperatingCronProofAsync */
export function reconcilePortfolioOperatingCronProof(cwd = process.cwd()): {
  V43_2_REAL_PORTFOLIO_CRON_AVAILABLE: boolean;
  V43_2_PORTFOLIO_CRON_TIMESTAMP: string | null;
  V43_2_PORTFOLIO_CRON_PROVENANCE: string | null;
  V43_2_PORTFOLIO_CRON_STATUS: "PASS" | "PENDING_NEXT_REAL_CRON";
  PORTFOLIO_OPERATING_SCHEDULER_QC: "PASS" | "PENDING_NEXT_REAL_CRON";
} {
  const proof = readPortfolioOperatingCronProof(cwd);
  if (!proof || proof.trigger !== "SCHEDULED") {
    return {
      V43_2_REAL_PORTFOLIO_CRON_AVAILABLE: false,
      V43_2_PORTFOLIO_CRON_TIMESTAMP: null,
      V43_2_PORTFOLIO_CRON_PROVENANCE: null,
      V43_2_PORTFOLIO_CRON_STATUS: "PENDING_NEXT_REAL_CRON",
      PORTFOLIO_OPERATING_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
    };
  }
  return {
    V43_2_REAL_PORTFOLIO_CRON_AVAILABLE: true,
    V43_2_PORTFOLIO_CRON_TIMESTAMP: proof.completed_at,
    V43_2_PORTFOLIO_CRON_PROVENANCE: proof.provenance,
    V43_2_PORTFOLIO_CRON_STATUS: "PASS",
    PORTFOLIO_OPERATING_SCHEDULER_QC: "PASS",
  };
}
