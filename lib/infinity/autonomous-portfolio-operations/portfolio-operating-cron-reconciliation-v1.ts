import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const PORTFOLIO_OPERATING_CRON_PROOF_PATH =
  ".infinity/autonomous-portfolio-operations/last-scheduled-portfolio-cron.json" as const;

export type PortfolioCronProofRecord = {
  trigger: "SCHEDULED";
  provenance: "x-vercel-cron";
  completed_at: string;
  route: "/api/runtime/portfolio-operating-tick";
  cycle_version: string;
  assets_published: number;
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

export function reconcilePortfolioOperatingCronProof(cwd = process.cwd()): {
  V43_2_REAL_PORTFOLIO_CRON_AVAILABLE: boolean;
  V43_2_PORTFOLIO_CRON_TIMESTAMP: string | null;
  V43_2_PORTFOLIO_CRON_PROVENANCE: string | null;
  V43_2_PORTFOLIO_CRON_STATUS: "PASS" | "PENDING_NEXT_REAL_CRON";
  PORTFOLIO_OPERATING_SCHEDULER_QC: "PASS" | "PENDING_NEXT_REAL_CRON";
} {
  const proof = readPortfolioOperatingCronProof(cwd);
  if (!proof || proof.trigger !== "SCHEDULED" || proof.provenance !== "x-vercel-cron") {
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
