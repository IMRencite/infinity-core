import { describe, expect, it } from "vitest";
import {
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
  it("does not treat manual Bearer + x-vercel-cron header as REAL_CRON", () => {
    const manual = resolvePortfolioCronProvenance(
      new Request("http://localhost/api/runtime/portfolio-operating-tick", {
        headers: { authorization: "Bearer secret", "x-vercel-cron": "1" },
      }),
    );
    const real = resolvePortfolioCronProvenance(
      new Request("http://localhost/api/runtime/portfolio-operating-tick", {
        headers: { "x-vercel-cron": "1", "user-agent": "vercel-cron/1.0" },
      }),
    );
    expect(manual.trigger_type).toBe("MANUAL");
    expect(real.trigger_type).toBe("REAL_CRON");
    expect(
      portfolioCronProvenanceIntegrityQc({
        manual_with_spoofed_header: manual.trigger_type,
        platform_cron: real.trigger_type,
      }),
    ).toBe("PASS");
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
