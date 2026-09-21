import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { buildOccupancyNpvCurrentOffer } from "@/lib/infinity/offer-architecture/occupancynpv";
import type { OfferArchitectureContract, OfferType, TimeToValueType } from "@/lib/infinity/offer-architecture/types";
import { OFFER_ARCHITECTURE_CONTRACT } from "@/lib/infinity/offer-architecture/types";
import {
  evaluateCanonicalRenderedOfferParityGate,
  evaluateCommercialOfferCompletenessGate,
  evaluateCommercialOfferJourneyGate,
  evaluateOccupancynpvPriorBlindSpotRegression,
  evaluateOfferCTACompletenessGate,
  evaluateOfferMeasurementReadinessGate,
  evaluateOfferTimeToValueAlignmentGate,
  evaluatePriceOnlyCommercializationGate,
  evaluateRenderedOfferVisualQuality,
  occupancyNpvOfferSurfaces,
  occupancyNpvPriceOnlyRenderedOffer,
  completePaidFirstRenderedOffer,
  commercialOfferSmokeSurfaces,
  invalidateQcOnOfferArchitectureChange,
  mapOfferStatusToLifecycle,
  type RenderedOfferObservation,
} from "../commercial-offer";
import { buildOccupancynpvCurrentEvidence } from "../current-evidence";
import { evaluateOccupancynpvFullSystemQc, occupancynpvCommercialOfferVerification } from "../occupancynpv";
import { occupancyNpvCapabilityProfile, buildVentureSystemInventory } from "../inventory";
import { buildVentureProductionQcMatrix, evaluateUniversalVentureProductionQualityGate } from "../matrix";
import { evaluateCommercialDeploymentSmoke, evaluateMandatoryVentureSmokeSuite, planChangeImpactQc } from "../modes";
import { invalidateAffectedQcOnNewCapability } from "../exhaustive";
import { projectVentureSystemQcHqSummary } from "../hq";
import { FACTORY_INHERITED_QC_CONTRACTS, UNIVERSAL_VENTURE_SYSTEM_QC_PRINCIPLES } from "../contract";
import type { SystemVerificationInput } from "../matrix";

function activated(offer: OfferArchitectureContract, type: OfferType = offer.offer_type): OfferArchitectureContract {
  return {
    ...offer,
    offer_type: type,
    status: "ACTIVATED",
    activation: "ACTIVATED",
  };
}

function rendered(overrides: Partial<RenderedOfferObservation>): RenderedOfferObservation {
  return { ...completePaidFirstRenderedOffer(), ...overrides };
}

function completeness(input: {
  offer?: OfferArchitectureContract | null;
  rendered?: RenderedOfferObservation;
  claimed?: boolean;
  lifecycle?: "ANALYSIS_ONLY" | "PLANNED" | "TEST_READY" | "ACTIVE" | "PAUSED" | "RETIRED";
  friction?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  ttv?: TimeToValueType | "UNKNOWN";
  justification?: string | null;
  prior_offer?: boolean;
  prior_cta?: boolean;
  surfaces?: boolean;
}) {
  const offer = input.offer === undefined ? activated(buildOccupancyNpvCurrentOffer()) : input.offer;
  return evaluateCommercialOfferCompletenessGate({
    commercial_venture: true,
    commercial_activation_claimed: input.claimed ?? true,
    canonical_offer: offer,
    surfaces: occupancyNpvOfferSurfaces(input.surfaces ?? true),
    rendered: input.rendered ?? occupancyNpvPriceOnlyRenderedOffer(),
    purchase_friction: input.friction ?? offer?.purchase_friction ?? "HIGH",
    time_to_value: input.ttv ?? (offer?.time_to_value === "UNKNOWN" ? "UNKNOWN" : offer?.time_to_value ?? "TRANSACTION_BASED"),
    high_friction_justification: input.justification,
    claimed_lifecycle: input.lifecycle,
    prior_offer_present: input.prior_offer,
    prior_cta_present: input.prior_cta,
  });
}

function passRow(system_id: SystemVerificationInput["system_id"], at = "2026-09-12T00:00:00.000Z"): SystemVerificationInput {
  return {
    system_id,
    status: "PASS",
    last_verified_at: at,
    verification_level: "LIVE_PRODUCTION",
    environment: "LIVE_PRODUCTION",
    failure_reason: null,
  };
}

describe("COMMERCIAL_OFFER_QC_HARDENING_V1", () => {
  it("locks pricing-is-not-offer principles and factory inheritance", () => {
    expect(UNIVERSAL_VENTURE_SYSTEM_QC_PRINCIPLES.pricing_is_not_offer).toContain("PRICING IS NOT THE SAME AS THE OFFER");
    expect(UNIVERSAL_VENTURE_SYSTEM_QC_PRINCIPLES.checkout_is_not_offer).toContain("CHECKOUT IS NOT THE SAME AS THE OFFER");
    expect(FACTORY_INHERITED_QC_CONTRACTS).toEqual(expect.arrayContaining([
      "CommercialOfferCompletenessGate",
      "RenderedOfferSurfaceContract",
      "PriceOnlyCommercializationGate",
      "CanonicalRenderedOfferParityGate",
    ]));
    expect(mapOfferStatusToLifecycle("LIVE_PROJECTION", "LIVE_PROJECTION")).toBe("ANALYSIS_ONLY");
    expect(mapOfferStatusToLifecycle("ACTIVATED", "ACTIVATED")).toBe("ACTIVE");
    expect(mapOfferStatusToLifecycle("TEST_CANDIDATE")).toBe("TEST_READY");
  });

  it("fails price-only commercialization even when checkout exists", () => {
    const priceOnly = evaluatePriceOnlyCommercializationGate(occupancyNpvPriceOnlyRenderedOffer());
    expect(priceOnly.result).toBe("FAIL");
    expect(priceOnly.reasons).toContain("PRICE_CARD_IS_NOT_OFFER_ARCHITECTURE");
    const gate = completeness({ rendered: occupancyNpvPriceOnlyRenderedOffer(), lifecycle: "ACTIVE" });
    expect(gate.result).toBe("FAIL");
    expect(gate.price_only.result).toBe("FAIL");
    expect(gate.reasons).toEqual(expect.arrayContaining([
      "PRICE_ONLY_COMMERCIALIZATION",
      "MISSING_OR_UNEXPRESSED_OFFER",
    ]));
  });

  it("fails missing CTA, canonical/live mismatch, journey dead end, missing measurement, and offer removal", () => {
    expect(evaluateOfferCTACompletenessGate(rendered({
      cta_visible: false,
      cta_clickable: false,
      cta_label: null,
    })).result).toBe("FAIL");

    const mismatch = evaluateCanonicalRenderedOfferParityGate({
      canonical: activated(buildOccupancyNpvCurrentOffer(), "FREE_TRIAL"),
      rendered: rendered({ live_offer_type: "PAID_FIRST", live_trial_or_pilot: "OFF" }),
      lifecycle: "ACTIVE",
    });
    expect(mismatch.result).toBe("FAIL");
    expect(mismatch.reasons).toContain("OFFER_TYPE_MISMATCH");

    expect(evaluateCommercialOfferJourneyGate({
      offer_surface: true,
      offer_start: true,
      product_account_or_payment: false,
      value_or_entitlement: false,
      paid_conversion: false,
      dead_end: true,
    }, true).result).toBe("FAIL");

    expect(evaluateOfferMeasurementReadinessGate({
      lifecycle: "ACTIVE",
      paid: true,
      measurement: occupancyNpvPriceOnlyRenderedOffer().measurement,
    }).result).toBe("FAIL");

    const removed = completeness({
      rendered: occupancyNpvPriceOnlyRenderedOffer(),
      lifecycle: "ACTIVE",
      prior_offer: true,
      prior_cta: true,
    });
    expect(removed.removal.result).toBe("FAIL");
    expect(removed.reasons).toContain("ACTIVE_OFFER_REMOVED");
  });

  it("allows intentional paid-first and requires evidence when friction is HIGH", () => {
    const justified = completeness({
      offer: activated(buildOccupancyNpvCurrentOffer(), "PAID_FIRST"),
      rendered: completePaidFirstRenderedOffer(),
      lifecycle: "ACTIVE",
      friction: "HIGH",
      justification: "Paid-first retained: first transaction value is inside the paid product; free-first-deal is deferred pending capital and evidence.",
    });
    expect(justified.result).toBe("PASS");
    expect(justified.paid_first.result).toBe("PASS");

    const unjustified = completeness({
      offer: activated(buildOccupancyNpvCurrentOffer(), "PAID_FIRST"),
      rendered: rendered({ risk_reduction_visible: false }),
      lifecycle: "ACTIVE",
      friction: "HIGH",
      justification: null,
    });
    expect(unjustified.paid_first.result).toBe("FAIL");
    expect(unjustified.paid_first.reasons).toContain("HIGH_FRICTION_PAID_FIRST_UNJUSTIFIED");

    const noTrialStillOk = completeness({
      offer: {
        ...activated(buildOccupancyNpvCurrentOffer(), "PAID_FIRST"),
        trial_policy: { ...buildOccupancyNpvCurrentOffer().trial_policy, enabled: false },
        discount_policy: "NOT_APPLICABLE",
        freemium_policy: "NOT_APPLICABLE",
      },
      rendered: completePaidFirstRenderedOffer(),
      lifecycle: "ACTIVE",
      justification: "Intentional paid-first. Trial OFF and discount NONE are not defects.",
    });
    expect(noTrialStillOk.result).toBe("PASS");
  });

  it("flags trial-without-transaction-path time-to-value mismatch", () => {
    expect(evaluateOfferTimeToValueAlignmentGate({
      offer_type: "FREE_TRIAL",
      time_to_value: "TRANSACTION_BASED",
    }).result).toBe("FAIL");
    expect(evaluateOfferTimeToValueAlignmentGate({
      offer_type: "FREE_TRIAL",
      time_to_value: "TRANSACTION_BASED",
      explanation: "Trial includes one guided deal so the first transaction can complete.",
    }).result).toBe("PASS");
    expect(evaluateOfferTimeToValueAlignmentGate({
      offer_type: "PAID_FIRST",
      time_to_value: "TRANSACTION_BASED",
    }).result).toBe("PASS");
  });

  it("is archetype-aware across commercial offer shapes", () => {
    const cases: Array<{ type: OfferType; cta: string; behavior: string; ttv: TimeToValueType }> = [
      { type: "PAID_FIRST", cta: "Buy Professional", behavior: "checkout", ttv: "TIME_BASED" },
      { type: "FREE_TRIAL", cta: "Start Trial", behavior: "trial", ttv: "TIME_BASED" },
      { type: "FREE_FIRST_USE", cta: "Start First Deal", behavior: "first-use", ttv: "USAGE_BASED" },
      { type: "DISCOUNTED_FIRST_PURCHASE", cta: "Buy Professional", behavior: "checkout", ttv: "TRANSACTION_BASED" },
      { type: "PAID_PILOT", cta: "Request Pilot", behavior: "pilot", ttv: "SERVICE_BASED" },
      { type: "MONTHLY_SUBSCRIPTION", cta: "Buy Professional", behavior: "checkout", ttv: "TIME_BASED" },
      { type: "CONSULTATION_FIRST", cta: "Book Demo", behavior: "demo", ttv: "SERVICE_BASED" },
    ];
    for (const row of cases) {
      const base = activated(buildOccupancyNpvCurrentOffer(), row.type);
      const offer = row.type === "FREE_TRIAL"
        ? {
            ...base,
            trial_policy: {
              ...base.trial_policy,
              enabled: true,
              kind: "FREE_TRIAL" as const,
              duration: "14 days",
              post_trial_price: "$290/year",
              auto_convert: false,
            },
          }
        : base;
      const gate = completeness({
        offer,
        rendered: rendered({
          cta_label: row.cta,
          cta_behavior: row.behavior,
          live_offer_type: row.type,
          live_trial_or_pilot: row.type === "FREE_TRIAL" ? "ON" : "OFF",
          live_post_offer_price: row.type === "FREE_TRIAL" ? "$290/year" : undefined,
        }),
        lifecycle: "ACTIVE",
        ttv: row.ttv,
        justification: row.type === "PAID_FIRST" ? "Intentional paid-first with disclosed value." : null,
      });
      expect(gate.result, row.type).toBe("PASS");
    }
  });

  it("catches the OccupancyNPV price-only FULL QC blind spot", () => {
    const current = buildOccupancyNpvCurrentOffer();
    expect(current.price.display).toContain("$290");
    expect(current.price.display).toContain("$149");
    expect(current.trial_policy.enabled).toBe(false);
    expect(current.purchase_friction).toBe("HIGH");
    expect(current.time_to_value).toBe("TRANSACTION_BASED");

    const regression = evaluateOccupancynpvPriorBlindSpotRegression(current);
    expect(regression.pricing).toBe("PASS");
    expect(regression.checkout).toBe("PASS");
    expect(regression.payment).toBe("PASS");
    expect(regression.fulfillment).toBe("PASS");
    expect(regression.active_rendered_offer).toBe("FAIL");
    expect(regression.completeness.result).toBe("FAIL");
    expect(regression.completeness.gate).toBe("CommercialOfferCompletenessGate");
    expect(regression.blind_spot_caught).toBe(true);

    const now = "2026-09-12T00:00:00.000Z";
    const inventory = buildVentureSystemInventory(occupancyNpvCapabilityProfile());
    const offer = occupancynpvCommercialOfferVerification({
      rendered: occupancyNpvPriceOnlyRenderedOffer(),
      at: now,
    });
    const verifications: SystemVerificationInput[] = inventory.entries
      .filter((row) => row.applicability === "APPLICABLE")
      .map((row) => row.system_id === "COMMERCIAL_OFFER"
        ? offer.verification
        : passRow(row.system_id, now));
    const quality = evaluateUniversalVentureProductionQualityGate({
      inventory,
      matrix: buildVentureProductionQcMatrix({ inventory, verifications, mode: "FULL", now }),
    });
    expect(verifications.find((row) => row.system_id === "SUBSCRIPTION")?.status).toBe("PASS");
    expect(verifications.find((row) => row.system_id === "CHECKOUT")?.status).toBe("PASS");
    expect(verifications.find((row) => row.system_id === "PAYMENT")?.status).toBe("PASS");
    expect(verifications.find((row) => row.system_id === "FULFILLMENT")?.status).toBe("PASS");
    expect(offer.completeness.result).toBe("FAIL");
    expect(quality.result).toBe("FAIL");
    expect(quality.overall).toBe("FAIL");
    expect(quality.reasons.some((row) => row.startsWith("COMMERCIAL_OFFER:FAIL"))).toBe(true);
  });

  it("runs offer smoke on every commercial deployment and invalidates QC on offer change", () => {
    const plan = planChangeImpactQc({ changed_paths: ["app/occupancynpv/pricing/page.tsx"] });
    expect(plan.mandatory_smoke).toBe(true);
    expect(plan.targeted_systems).toContain("COMMERCIAL_OFFER");

    const completenessGate = completeness({
      rendered: occupancyNpvPriceOnlyRenderedOffer(),
      lifecycle: "ACTIVE",
    });
    const smoke = evaluateCommercialDeploymentSmoke({
      commercial: true,
      completeness: completenessGate,
      rendered: occupancyNpvPriceOnlyRenderedOffer(),
      surfaces: [
        { surface: "home_public_entry", applicable: true, result: "PASS" },
        { surface: "navigation", applicable: true, result: "PASS" },
        { surface: "primary_product_workflow", applicable: true, result: "PASS" },
        { surface: "primary_cta", applicable: true, result: "PASS" },
        { surface: "auth_if_applicable", applicable: true, result: "PASS" },
        { surface: "payment_entry_if_paid", applicable: true, result: "PASS" },
        { surface: "feedback_improvement_entry", applicable: true, result: "PASS" },
        { surface: "legal_footer", applicable: true, result: "PASS" },
        { surface: "console", applicable: true, result: "PASS" },
        { surface: "network", applicable: true, result: "PASS" },
        { surface: "mobile", applicable: true, result: "PASS" },
      ],
    });
    expect(smoke.result).toBe("FAIL");
    expect(smoke.reasons.join(" ")).toMatch(/primary_offer_surface|offer_state|offer_journey_entry/);

    const unchecked = evaluateMandatoryVentureSmokeSuite([
      { surface: "home_public_entry", applicable: true, result: "PASS" },
    ]);
    expect(unchecked.reasons).toEqual(expect.arrayContaining([
      "SMOKE_SURFACE_UNCHECKED:primary_offer_surface",
      "SMOKE_SURFACE_UNCHECKED:primary_offer_cta",
      "SMOKE_SURFACE_UNCHECKED:offer_state",
    ]));

    const invalidated = invalidateQcOnOfferArchitectureChange();
    expect(invalidated.SUBSCRIPTION).toBe("UNVERIFIED");
    expect(invalidated.COMMERCIAL_OFFER).toBe("UNVERIFIED");
    expect(invalidated.offer_surface).toBe("UNVERIFIED");
    expect(invalidated.offer_cta).toBe("UNVERIFIED");
    expect(invalidated.offer_disclosure).toBe("UNVERIFIED");
    expect(invalidated.offer_journey).toBe("UNVERIFIED");
    expect(invalidated.offer_measurement).toBe("UNVERIFIED");
    expect(invalidateAffectedQcOnNewCapability({
      new_capability: "OfferArchitectureContract",
      affected: ["COMMERCIAL_OFFER", "SUBSCRIPTION"],
    }).COMMERCIAL_OFFER).toBe("UNVERIFIED");
    expect(commercialOfferSmokeSurfaces({
      commercial: true,
      completeness: completenessGate,
      rendered: occupancyNpvPriceOnlyRenderedOffer(),
    }).every((row) => row.applicable)).toBe(true);
  });

  it("inspects offer-block visual quality and preserves customer suggestions", () => {
    expect(evaluateRenderedOfferVisualQuality({
      ...occupancyNpvPriceOnlyRenderedOffer(),
      offer_prominence_ok: false,
      terms_clipped: true,
      browser_default_controls: true,
      mobile_ok: false,
    }).result).toBe("FAIL");
    const detail = readFileSync("components/dashboard/operator-console/canonical-venture-hq-detail.tsx", "utf8");
    expect(detail).toContain("CustomerSuggestionsTab");
    expect(detail).toContain("Commercial Offer");
    const suggestions = readFileSync("lib/infinity/product-improvement-loop/suggestions.ts", "utf8");
    expect(suggestions).toContain("projectVentureCustomerSuggestions");
    const offerEngine = readFileSync("lib/infinity/offer-architecture/occupancynpv.ts", "utf8");
    expect(offerEngine).toContain("trial_policy: trialOff()");
    expect(offerEngine).not.toContain("trial_enabled: true");
  });

  it("fails OccupancyNPV FULL QC when live HTML is missing or price-only, and keeps HQ offer fields visible", () => {
    const missing = occupancynpvCommercialOfferVerification({});
    expect(missing.completeness.result).toBe("FAIL");
    expect(missing.completeness.price_only.result).toBe("FAIL");
    const live = evaluateOccupancynpvFullSystemQc(buildOccupancynpvCurrentEvidence());
    expect(live.systems.commercial_offer).toBe("FAIL");
    expect(live.quality.result).toBe("FAIL");
    const hq = projectVentureSystemQcHqSummary(CRE_VENTURE_ID);
    expect(hq.commercial_offer).toBe("FAIL");
    expect(hq.purchase_friction).toBe("HIGH");
    expect(hq.time_to_value).toBe("TRANSACTION_BASED");
    expect(OFFER_ARCHITECTURE_CONTRACT).toBe("OfferArchitectureContract");
  });
});
