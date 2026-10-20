import type { ResponsiveCapabilityEvidenceV1 } from "@/lib/infinity/organic-growth-engine/continuous/render-browser-evidence-v1";
import { runClubThrottleProductionDeployment } from "./club-throttle-production-deployment-runner";

export const CLUB_THROTTLE_DEPLOY_EVIDENCE_PATH =
  ".infinity/blog-os/v52-club-throttle-production-deploy.json" as const;

export async function executeClubThrottleProductionDeployment(input: {
  deploy?: boolean;
  dest?: string;
  persistEvidence?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
  /** When false, do not assign clubthrottle.com to the deployment. */
  aliasProduction?: boolean;
  /** When false, skip dark-garment art rebuild during deploy (static asset / identity deploys). */
  rebuildDarkGarmentArt?: boolean;
  /** Rendered capability browser samples for journal index (required at PRODUCTION_DEPLOY). */
  browser_capability_evidence?: ResponsiveCapabilityEvidenceV1 | null;
} = {}) {
  return runClubThrottleProductionDeployment(input);
}
