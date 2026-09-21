import { describe, expect, it } from "vitest";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { evaluateOccupancynpvFulfillmentReadiness } from "../occupancynpv-fulfillment";
import { occupancynpvPaymentActivationEnabled } from "../occupancynpv-payment-reactivation-evidence";
import {
  OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORIZED,
  OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION,
  occupancynpvPubliclyLaunched,
} from "../occupancynpv-public-launch-evidence";
import { evaluatePublicLaunchReadinessGate } from "../occupancynpv-public-launch-readiness";
import { executeOccupancynpvPublicLaunch } from "../occupancynpv-public-launch";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "../occupancynpv-canonical-checkout";

describe("OCCUPANCYNPV_PUBLIC_LAUNCH_EXECUTION_V1", () => {
  it("authorizes launch only with founder approval and unchanged economics", () => {
    expect(OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORIZED).toBe(true);
    expect(OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION).toBe("occupancynpv_public_launch_v1");
    expect(OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.amount).toBe(29000);
    expect(OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.amount).toBe(14900);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
  });

  it("does not launch when persist is skipped and readiness is the only check", async () => {
    const readiness = evaluatePublicLaunchReadinessGate();
    expect(readiness.categories.IMPROVEMENT_INTAKE).toBe("FAIL");
    expect(readiness.result).toBe("BLOCKED");
    expect(evaluateOccupancynpvFulfillmentReadiness().result).toBe("PASS");
    expect(occupancynpvPaymentActivationEnabled()).toBe(true);
    const dry = await executeOccupancynpvPublicLaunch({ persist: false, liveVerify: false });
    expect(dry.writes.stripeProductsCreated).toBe(0);
    expect(dry.writes.stripePricesCreated).toBe(0);
    expect(dry.writes.priceChanges).toBe(0);
    expect(dry.writes.manualCharges).toBe(0);
    expect(dry.writes.dnsWrites).toBe(0);
    expect(dry.writes.searchSubmissions).toBe(0);
    expect(dry.writes.outreachMessages).toBe(0);
    expect(dry.writes.paidMediaSpend).toBe(0);
    if (!occupancynpvPubliclyLaunched()) {
      expect(dry.writes.publicLaunchTransitions).toBe(0);
    }
  });
});
