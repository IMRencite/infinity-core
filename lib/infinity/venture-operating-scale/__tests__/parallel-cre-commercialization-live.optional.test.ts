import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { executeParallelCreCommercializationExecutionMission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1 live providers", () => {
  it("executes against real provider read surfaces and writes a sanitized report", async () => {
    loadServerEnvFromLocalFile();
    const result = await executeParallelCreCommercializationExecutionMission({ observeInbound: true });
    const report = {
      mission: result.mission,
      concurrency: result.concurrency.outcome,
      parallelExecution: result.parallelExecution,
      naming: result.domain.naming,
      finalists: result.domain.finalists,
      providers: result.domain.providers,
      decision: result.domain.decision,
      treasury: result.domain.treasury,
      eag: result.domain.eag,
      purchase: {
        authorized: result.domain.purchaseAuthorizedByExistingPolicy,
        attempted: result.domain.purchaseAttempted,
        count: result.domain.purchaseCount,
        domain: result.domain.purchasedDomain,
        nextState: result.domain.nextState,
        dnsWrites: result.domain.dnsWrites,
        dnsNext: result.domain.dnsNextAuthorization,
      },
      stripe: {
        connected: result.stripe.connected,
        environment: result.stripe.environment,
        safeAccountIdentity: result.stripe.safeAccountIdentity,
        providerVerification: result.stripe.providerVerification,
        capabilities: result.stripe.capabilities,
        offers: result.stripe.offers,
        offerConsistency: result.stripe.offerConsistency,
        planStatus: result.stripe.planStatus,
        configurationReady: result.stripe.configurationReady,
        activationReady: result.stripe.activationReady,
        blockers: result.stripe.blockers,
        writes: result.stripe.stripeWrites,
        nextAuthorization: result.stripe.nextAuthorization,
      },
      record: {
        domain: result.record.primary_domain,
        dns: result.record.dns_state,
        ssl: result.record.ssl_state,
        payments: result.record.payment_provider,
        revenue: result.record.revenue_state,
        experiment: result.record.current_experiment,
        observer: result.record.inbound_observer_state,
        launch: result.record.public_launch_state,
        history: result.record.domain_history,
      },
      daily: {
        result: result.daily.snapshot.dailyResult,
        commercialization: result.daily.commercializationWorkRecognized,
        external: result.daily.externalWaitingRecognized,
        signals: result.daily.snapshot.learningSignals,
      },
      readiness: result.readiness,
      hq: result.hqMission,
      experiment: result.experiment,
      external: result.external,
      nextAuthorizations: result.nextAuthorizations,
      nextState: result.nextState,
    };
    writeFileSync(
      ".infinity/venture-operating-scale/parallel-cre-commercialization-execution-v1-report.json",
      `${JSON.stringify(report, null, 2)}\n`,
    );
    expect(result.external.domainPurchases).toBe(0);
    expect(result.external.dnsWrites).toBe(0);
    expect(result.external.publiclyLaunched).toBe("NO");
    expect(result.experiment.clockRestarted).toBe(false);
  }, 120_000);
});
