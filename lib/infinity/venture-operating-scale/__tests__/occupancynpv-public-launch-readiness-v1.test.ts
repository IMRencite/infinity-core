import { describe, expect, it } from "vitest";
import { evaluateOccupancynpvFulfillmentReadiness, evaluateOccupancynpvOfferConsistency } from "../occupancynpv-fulfillment";
import { occupancynpvPaymentActivationEnabled } from "../occupancynpv-payment-reactivation-evidence";
import { evaluateOccupancynpvCustomerFacingUiQc } from "../occupancynpv-customer-facing-ui-qc";
import { occupancynpvFounderCustomerUiReviewState } from "../occupancynpv-founder-customer-ui-review";
import { auditOccupancynpvArtifactLineage } from "../occupancynpv-artifact-lineage";
import { classifyOccupancynpvLaunchMessaging } from "../occupancynpv-launch-messaging";
import {
  PUBLIC_LAUNCH_READINESS_GATE,
  evaluatePublicLaunchReadinessGate,
} from "../occupancynpv-public-launch-readiness";
import { projectOccupancynpvHqDetail } from "../hq-venture-registry";
import { occupancynpvPubliclyLaunched } from "../occupancynpv-public-launch-evidence";
import { backfillCreVentureOperationalRecord } from "../record";
import { writeVentureOperationalRecord } from "../persist";

describe("OCCUPANCYNPV_PUBLIC_LAUNCH_READINESS_V1", () => {
  it("builds PublicLaunchReadinessGate from canonical gates and does not launch", () => {
    const gate = evaluatePublicLaunchReadinessGate();
    expect(PUBLIC_LAUNCH_READINESS_GATE).toBe("PublicLaunchReadinessGate");
    expect(gate.publiclyLaunched).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
    expect(gate.writes.publicLaunch).toBe(0);
    expect(gate.writes.searchSubmissions).toBe(0);
    expect(gate.writes.outreach).toBe(0);
    expect(gate.writes.paymentActivationChanges).toBe(0);
    expect(gate.categories.PRODUCT).toBe("PASS");
    expect(gate.categories.FULFILLMENT).toBe(evaluateOccupancynpvFulfillmentReadiness().result === "PASS" ? "PASS" : "FAIL");
    expect(gate.categories.PAYMENTS).toBe(occupancynpvPaymentActivationEnabled() ? "PASS" : "FAIL");
    expect(gate.categories.COMMERCIAL_CONSISTENCY).toBe(evaluateOccupancynpvOfferConsistency().result === "PASS" ? "PASS" : "FAIL");
    expect(gate.categories.FOUNDER_REVIEW).toBe("PASS");
    expect(gate.launchAuthority).toBe("FOUNDER_APPROVAL_REQUIRED");
    expect(gate.categories.VALIDATION_MESSAGING).toBe("PASS");
    expect(gate.categories.IMPROVEMENT_INTAKE).toBe("FAIL");
    expect(gate.failed).toContain("IMPROVEMENT_INTAKE");
    expect(gate.result).toBe("BLOCKED");
    expect(gate.failed).not.toContain("VALIDATION_MESSAGING");
    expect(gate.nextState).toBe(
      occupancynpvPubliclyLaunched()
        ? "OCCUPANCYNPV_PUBLICLY_LAUNCHED"
        : "OCCUPANCYNPV_READY_FOR_PUBLIC_LAUNCH_AUTHORIZATION",
    );
    expect(gate.pendingFounderAction).toBe(
      occupancynpvPubliclyLaunched()
        ? "OCCUPANCYNPV_POST_LAUNCH_AUTONOMOUS_OPERATIONS"
        : "OCCUPANCYNPV_PUBLIC_LAUNCH_AUTHORIZATION",
    );
  });

  it("treats contradictory paid-product denial as a launch-blocking messaging failure", () => {
    const audit = classifyOccupancynpvLaunchMessaging([
      { route: "/early-access", html: "if the product is built. not a finished product. Payment is not collected." },
    ]);
    expect(audit.result).toBe("FAIL");
    expect(audit.earlyAccessMessaging).toBe("CONTRADICTORY");
    expect(audit.launchBlockingContradictions.length).toBeGreaterThan(0);
    const clean = classifyOccupancynpvLaunchMessaging([
      { route: "/early-access", html: "Request access to the live OccupancyNPV comparison workspace. Checkout is available for Professional and Per-Deal." },
    ]);
    expect(clean.result).toBe("PASS");
  });

  it("persists founder customer UI review as PASS without inferring extra scope", () => {
    const review = occupancynpvFounderCustomerUiReviewState();
    expect(review.status).toBe("PASS");
    expect(review.inferred).toBe(false);
    expect(review.scope).toEqual(expect.arrayContaining(["Pilot Access", "login/signup", "dashboard", "workspace"]));
    expect(evaluateOccupancynpvCustomerFacingUiQc().result).toBe("PASS");
  });

  it("explains same package artifact ID across digest changes without treating identity as content-immutable", () => {
    const lineage = auditOccupancynpvArtifactLineage();
    expect(lineage.finding).toBe("B");
    expect(lineage.repairRequired).toBe(false);
    expect(lineage.packageDerivedArtifactId).toBe("art_5eb5eeb74bfd2a300b85");
    expect(lineage.current.digest).not.toBe(lineage.previous.digest);
    expect(lineage.composeDigestMatchesCurrent).toBe(true);
  });

  it("keeps HQ launch-blocked and OccupancyNPV visible", () => {
    writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
    const detail = projectOccupancynpvHqDetail();
    expect(detail?.overview.domain).toBe("occupancynpv.com");
    expect(detail?.overview.publicLaunch).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
    expect(detail?.governance.founderProductReview.newPaidProductUi).toBe("PASS");
    expect(detail?.customerFacingUi.founderReview).toBe("PASS");
    expect(["NONE", "STRIPE_RESTRICTED_KEY_CHECKOUT_SESSION_WRITE", "OCCUPANCYNPV_PUBLIC_LAUNCH_AUTHORIZATION"]).toContain(
      detail?.governance.pendingFounderAction,
    );
    if (!occupancynpvPubliclyLaunched()) {
      expect(detail?.governance.pendingFounderAction).toBe("OCCUPANCYNPV_PUBLIC_LAUNCH_AUTHORIZATION");
    }
    if (occupancynpvPubliclyLaunched()) {
      expect(detail?.commercial.blockers).not.toContain("PUBLIC_LAUNCH");
    } else {
      expect(detail?.commercial.blockers).toEqual(["PUBLIC_LAUNCH"]);
    }
  });
});
