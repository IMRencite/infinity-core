import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { evaluateCalculationFixtures } from "@/lib/infinity/occupancynpv-product/fixtures";
import {
  ASKREVIEW_CANDIDATE_ID,
  ASKREVIEW_VENTURE_ID,
  ASKREVIEW_WORKING_NAME,
  OCCUPANCYNPV_CANDIDATE_ID,
} from "../constants";
import { evaluateSecondVentureDifferentiationGate } from "../differentiation-gate";
import { evaluateAskReviewFulfillmentContract, evaluateAskReviewOfferContract } from "../contracts";
import { askReviewBackendReadiness, askReviewVentureBackendContract, ASKREVIEW_PROVIDER_REASONING } from "../backend";
import { evaluateMultiVentureFactoryGeneralizationGate } from "../generalization-gate";
import { persistAskReviewOperationalRecord } from "../persist-record";
import { evaluateSecondVentureHqProjection } from "../hq";
import { loadPersistedOpportunityUniverse } from "../opportunity-universe";
import { selectSecondVenture } from "../selection";
import { backfillCreVentureOperationalRecord, resetVentureOperatingScaleStore, writeVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale";
import { mergeCanonicalVenturesIntoHqList } from "@/lib/infinity/venture-operating-scale/hq-venture-registry";
import { evaluateMissionConcurrencyGate } from "@/lib/infinity/venture-operating-scale/concurrency";
import { runPortfolioOperatingCycle } from "@/lib/infinity/venture-operating-scale/operations";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  createAskReviewAccount,
  createAskReviewLocation,
  fulfillAskReviewKit,
  generateReviewKit,
  listAskReviewLocations,
  resetAskReviewStore,
  signInAskReview,
} from "@/lib/infinity/askreview-product";
import { askReviewFooterHtml, evaluateAskReviewFooterContract } from "@/lib/infinity/askreview-product/public-footer";

describe("SECOND_VENTURE_AUTONOMOUS_FACTORY_PROOF_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetAskReviewStore();
    writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
  });
  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetAskReviewStore();
  });

  it("evaluates persisted scanner candidates and rejects OccupancyNPV clones", () => {
    const universe = loadPersistedOpportunityUniverse();
    expect(universe.length).toBeGreaterThanOrEqual(8);
    expect(universe.some((row) => row.id === OCCUPANCYNPV_CANDIDATE_ID)).toBe(true);
    const occupancy = universe.find((row) => row.id === OCCUPANCYNPV_CANDIDATE_ID)!;
    expect(evaluateSecondVentureDifferentiationGate(occupancy).result).toBe("FAIL");
    const calculator = universe.find((row) => row.id === "dcbf770c-92e4-404a-8c2c-abf61f199dc6")!;
    expect(evaluateSecondVentureDifferentiationGate(calculator).result).toBe("FAIL");
    const ask = universe.find((row) => row.id === ASKREVIEW_CANDIDATE_ID)!;
    expect(evaluateSecondVentureDifferentiationGate(ask).result).toBe("PASS");
    expect(ask.expectedValue).toBe("UNKNOWN");
  });

  it("selects AskReview under canonical decision policy without a second engine", () => {
    const selected = selectSecondVenture();
    expect(selected.selected).toBe(true);
    expect(selected.candidateId).toBe(ASKREVIEW_CANDIDATE_ID);
    expect(selected.workingName).toBe(ASKREVIEW_WORKING_NAME);
    expect(selected.economicDecision?.secondDecisionEngineCreated).toBe(false);
    expect(selected.economicDecision?.unitEconomics).toBe("UNKNOWN");
    expect(["VALIDATE", "BUILD"]).toContain(selected.economicDecision?.decision);
    expect(selected.evaluatedCount).toBeGreaterThanOrEqual(8);
  });

  it("defines offer, fulfillment, and backend contracts independently of OccupancyNPV", () => {
    expect(evaluateAskReviewOfferContract().result).toBe("PASS");
    expect(evaluateAskReviewFulfillmentContract().result).toBe("PASS");
    const backend = askReviewVentureBackendContract();
    expect(backend.productType).toBe("GENERATED_REPORT");
    expect(backend.capabilities.AUTHENTICATION.decision).toBe("REQUIRED");
    expect(backend.capabilities.FILE_STORAGE.decision).toBe("NOT_REQUIRED");
    expect(backend.providerBindings.some((row) => row.providerFamily === "supabase")).toBe(true);
    expect(backend.providerBindings.some((row) => row.providerFamily === "supabase_auth")).toBe(true);
    expect(ASKREVIEW_PROVIDER_REASONING).toMatch(/VALIDATION_ONLY/);
    expect(ASKREVIEW_PROVIDER_REASONING).toMatch(/not reused/);
    expect(["PARTIAL", "PASS"]).toContain(askReviewBackendReadiness());
  });

  it("generates a review kit and recovers from invalid input", () => {
    expect(generateReviewKit({ businessName: "Oak Street Salon", placeId: "bad" }).ok).toBe(false);
    const created = createAskReviewAccount({ email: "owner@example.com", password: "password1" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(signInAskReview({ email: "owner@example.com", password: "password1" }).ok).toBe(true);
    const location = createAskReviewLocation({
      accountId: created.account.accountId,
      name: "Oak Street Salon",
      placeId: "ChIJAskReviewFactoryProof001",
    });
    expect(location.ok).toBe(true);
    if (!location.ok) return;
    const first = fulfillAskReviewKit({ accountId: created.account.accountId, locationId: location.location.locationId });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.kit.reviewUrl).toContain("writereview");
    expect(first.kit.qrSvg).toContain("<svg");
    const duplicate = fulfillAskReviewKit({ accountId: created.account.accountId, locationId: location.location.locationId });
    expect(duplicate.ok).toBe(true);
    const listed = listAskReviewLocations({ accountId: created.account.accountId });
    expect(listed.total).toBe(1);
  });

  it("keeps OccupancyNPV visible in HQ and portfolio while AskReview auto-registers", () => {
    persistAskReviewOperationalRecord();
    const merged = mergeCanonicalVenturesIntoHqList([]);
    expect(merged.some((row) => row.canonicalVentureId === CRE_VENTURE_ID || row.ventureAssemblyId === CRE_VENTURE_ID)).toBe(true);
    expect(merged.some((row) => row.ventureAssemblyId === ASKREVIEW_VENTURE_ID)).toBe(true);
    expect(evaluateSecondVentureHqProjection().result).toBe("PASS");
    const portfolio = runPortfolioOperatingCycle();
    expect(portfolio.secondDecisionEngineCreated).toBe(false);
    expect(portfolio.ventures.some((row) => row.ventureId === CRE_VENTURE_ID)).toBe(true);
    expect(portfolio.ventures.some((row) => row.ventureId === ASKREVIEW_VENTURE_ID)).toBe(true);
    expect(evaluateMissionConcurrencyGate({
      proposed: "SECOND_VENTURE_BUILD",
      active: ["INBOUND_OBSERVER"],
    }).outcome).toBe("ALLOWED");
    expect(evaluateMultiVentureFactoryGeneralizationGate().result).toBe("PASS");
  });

  it("passes footer contract and does not break OccupancyNPV fixtures", () => {
    expect(evaluateAskReviewFooterContract(askReviewFooterHtml()).result).toBe("PASS");
    const fixtures = evaluateCalculationFixtures();
    expect(fixtures.failed).toBe(0);
  });
});
