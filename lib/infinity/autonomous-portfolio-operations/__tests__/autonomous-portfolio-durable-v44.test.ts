import { describe, expect, it } from "vitest";
import {
  cronAuthVsProvenanceSeparationQc,
  portfolioCronProvenanceIntegrityQc,
  resolvePortfolioCronProvenance,
} from "../durable/portfolio-cron-provenance-v1";
import { portfolioJobRetryPolicyQc } from "../durable/portfolio-job-retry-policy-v1";
import { autonomousPortfolioJobQueueQc } from "../durable/autonomous-portfolio-job-queue-v1";
import { portfolioJobClaimAndLeaseQc } from "../durable/portfolio-job-claim-and-lease-v1";
import { portfolioCronOrchestratorQc } from "../durable/portfolio-cron-orchestrator-v1";
import { autonomousPortfolioJobWorkerQc } from "../durable/portfolio-job-worker-v1";
import { portfolioJobContinuationQc } from "../durable/portfolio-job-continuation-v1";
import { durableContentSelfHealingQc } from "../durable/durable-content-self-healing-v1";
import { autonomousPublicationIdempotencyQc } from "../durable/autonomous-publication-idempotency-v1";
import { V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE } from "../durable/portfolio-tick-instrumentation-v1";
import { creativeSelfHealBudgetGovernanceQc } from "../durable/creative-self-heal-budget-governance-v1";

describe("AUTONOMOUS_PORTFOLIO_DURABLE_V44", () => {
  it("authenticated cron-shaped request is not platform-confirmed REAL_CRON", () => {
    const secret = "test-cron-secret";
    const manualBearer = resolvePortfolioCronProvenance(
      new Request("http://localhost/api/runtime/portfolio-operating-tick", {
        headers: { authorization: `Bearer ${secret}` },
      }),
      { CRON_SECRET: secret },
    );
    const manualUa = resolvePortfolioCronProvenance(
      new Request("http://localhost/api/runtime/portfolio-operating-tick", {
        headers: { "user-agent": "vercel-cron/1.0" },
      }),
      { CRON_SECRET: secret },
    );
    const cronShaped = resolvePortfolioCronProvenance(
      new Request("http://localhost/api/runtime/portfolio-operating-tick", {
        headers: {
          authorization: `Bearer ${secret}`,
          "user-agent": "vercel-cron/1.0",
        },
      }),
      { CRON_SECRET: secret },
    );
    expect(manualBearer.trigger_type).toBe("MANUAL");
    expect(manualUa.trigger_type).toBe("MANUAL");
    expect(cronShaped.trigger_type).toBe("AUTHENTICATED_CRON_SHAPED");
    expect(cronShaped.authorization_validated).toBe(true);
    expect(cronShaped.platform_origin_qc).toBe("PENDING");
    expect(
      portfolioCronProvenanceIntegrityQc({
        manual_bearer_only: manualBearer.trigger_type,
        manual_ua_only: manualUa.trigger_type,
        bearer_plus_vercel_ua: cronShaped.trigger_type,
      }),
    ).toBe("PASS");
    expect(cronAuthVsProvenanceSeparationQc()).toBe("PASS");
  });

  it("passes durable architecture QC gates", () => {
    expect(portfolioJobRetryPolicyQc()).toBe("PASS");
    expect(autonomousPortfolioJobQueueQc()).toBe("PASS");
    expect(portfolioJobClaimAndLeaseQc()).toBe("PASS");
    expect(portfolioCronOrchestratorQc()).toBe("PASS");
    expect(autonomousPortfolioJobWorkerQc()).toBe("PASS");
    expect(portfolioJobContinuationQc()).toBe("PASS");
    expect(durableContentSelfHealingQc()).toBe("PASS");
    expect(autonomousPublicationIdempotencyQc()).toBe("PASS");
    expect(creativeSelfHealBudgetGovernanceQc()).toBe("PASS");
    expect(V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE).toContain("SYNC_TICK_BOUNDARY");
  });
});
