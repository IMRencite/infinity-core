import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import {
  CRE_VENTURE_ID,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  backfillCreVentureOperationalRecord,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";
import {
  auditHqVentureRegistry,
  evaluateVentureHQProjectionGate,
  listCanonicalVenturesForHq,
  mergeCanonicalVenturesIntoHqList,
  projectCanonicalVentureForHq,
  projectEvidenceAwareCheckoutState,
  projectOccupancynpvHqDetail,
} from "../hq-venture-registry";
import { occupancynpvPaymentActivationEnabled } from "../occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched } from "../occupancynpv-public-launch-evidence";
import { evaluateOccupancynpvFulfillmentReadiness } from "../occupancynpv-fulfillment";

function assembly(overrides: Partial<OperatorVentureListItem> = {}): OperatorVentureListItem {
  return {
    ventureAssemblyId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    ventureName: "Other Assembly",
    status: "assembled",
    activeDepartment: null,
    latestActivity: null,
    latestActivityAt: null,
    launchState: "internal",
    knownSpendUsd: null,
    latestDecision: null,
    missionId: "msn_other",
    canonicalSource: "venture_assembly",
    ...overrides,
  };
}

function seedOccupancynpv() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    public_url: "https://occupancynpv.com",
    canonical_url: "https://occupancynpv.com",
    public_launch_state: "NO",
    payment_provider: "stripe",
    payment_account_binding: { kind: "PROVIDER_BINDING", key: OCCUPANCYNPV_STRIPE_ACCOUNT_ID, rawSecretStored: false },
    checkout_state: occupancynpvPaymentActivationEnabled() ? "ACTIVATED" : "CONFIGURED",
    revenue_state: occupancynpvPaymentActivationEnabled() ? "PAYMENT_ACTIVATED" : "UNCONFIGURED",
    fulfillment_state: "FULFILLMENT_READY",
    payment_products: [
      { id: "prod_VDIjmRpY19C9HZ", name: "OccupancyNPV Professional", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIjmRpY19C9HZ", rawSecretStored: false } },
      { id: "prod_VDIju0S2lBO9i5", name: "OccupancyNPV Per-Deal", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIju0S2lBO9i5", rawSecretStored: false } },
    ],
    payment_prices: [
      { id: "price_1UCs7hLdvXKx7R7GF2TPmwGL", productId: "prod_VDIjmRpY19C9HZ", amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7hLdvXKx7R7GF2TPmwGL", rawSecretStored: false } },
      { id: "price_1UCs7iLdvXKx7R7GmikBTGx4", productId: "prod_VDIju0S2lBO9i5", amountUsd: 149, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7iLdvXKx7R7GmikBTGx4", rawSecretStored: false } },
    ],
    blocked_actions: occupancynpvPaymentActivationEnabled() ? ["PUBLIC_LAUNCH"] : ["PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
  });
}

describe("HQ_CANONICAL_VENTURE_VISIBILITY_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
  });
  afterEach(() => {
    resetVentureOperatingScaleStore();
  });

  it("projects OccupancyNPV into HQ even when PUBLICLY_LAUNCHED is NO and no assembly exists", () => {
    seedOccupancynpv();
    const assemblies = [assembly()];
    const merged = mergeCanonicalVenturesIntoHqList(assemblies);
    const occupancynpv = merged.find((row) => row.ventureName === "OccupancyNPV");
    expect(occupancynpv).toBeTruthy();
    expect(occupancynpv?.ventureAssemblyId).toBe(CRE_VENTURE_ID);
    expect(occupancynpv?.domain).toBe("occupancynpv.com");
    expect(occupancynpv?.productionUrl).toBe("https://occupancynpv.com");
    expect(occupancynpv?.paidAppUrl).toBe("https://occupancynpv.com/occupancynpv/app");
    expect(occupancynpv?.publicLaunch).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
    if (occupancynpvPubliclyLaunched()) {
      expect(occupancynpv?.blockers).not.toContain("PUBLIC_LAUNCH");
    } else {
      expect(occupancynpv?.blockers).toEqual(expect.arrayContaining(["PUBLIC_LAUNCH"]));
    }
    expect(merged.filter((row) => row.ventureName === "OccupancyNPV")).toHaveLength(1);
  });

  it("does not duplicate OccupancyNPV when an assembly already matches the candidate", () => {
    seedOccupancynpv();
    const assemblies = [assembly({
      ventureAssemblyId: "11111111-2222-3333-4444-555555555555",
      ventureName: "CRE Lease NPV Validation",
      candidateId: "7e7e924e-0741-4155-a729-8d529da77ea9",
    })];
    const merged = mergeCanonicalVenturesIntoHqList(assemblies);
    expect(merged.filter((row) => row.ventureName === "OccupancyNPV" || row.canonicalVentureId === CRE_VENTURE_ID)).toHaveLength(1);
    expect(merged[0]?.ventureAssemblyId).toBe("11111111-2222-3333-4444-555555555555");
    expect(merged[0]?.canonicalVentureId).toBe(CRE_VENTURE_ID);
  });

  it("keeps payment-disabled and payment-active ventures visible", () => {
    const record = seedOccupancynpv();
    const projected = projectCanonicalVentureForHq(record);
    expect(projected.publicLaunch).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
    if (occupancynpvPaymentActivationEnabled()) {
      expect(["ACTIVE", "DEGRADED"]).toContain(projected.payment);
      expect(projected.paymentActivation).toBe("YES");
    } else {
      expect(["READY", "BLOCKED", "NO"]).toContain(projected.payment);
      expect(projected.paymentActivation).toBe("NO");
    }
    expect(mergeCanonicalVenturesIntoHqList([]).some((row) => row.ventureName === "OccupancyNPV")).toBe(true);
  });

  it("projects fulfillment and checkout from current evidence instead of historical constants", () => {
    seedOccupancynpv();
    const fulfillment = evaluateOccupancynpvFulfillmentReadiness().result;
    const checkout = projectEvidenceAwareCheckoutState({
      paymentActivation: occupancynpvPaymentActivationEnabled(),
      fulfillmentReady: fulfillment === "PASS",
    });
    if (fulfillment === "PASS") {
      expect(projectCanonicalVentureForHq(listCanonicalVenturesForHq()[0]!).fulfillment).toBe("PASS");
    } else {
      expect(projectCanonicalVentureForHq(listCanonicalVenturesForHq()[0]!).fulfillment).toBe("FAIL");
    }
    if (occupancynpvPaymentActivationEnabled() && fulfillment === "PASS" && checkout.checkout === "DEGRADED") {
      expect(checkout.createSession).toBe(false);
    } else {
      expect(checkout.createSession).toBe(occupancynpvPaymentActivationEnabled() && fulfillment === "PASS");
      expect(checkout.checkout).toBe(checkout.createSession ? "ENABLED" : "BLOCKED");
    }
  });

  it("registers a future canonical venture automatically without a founder add-to-HQ step", () => {
    seedOccupancynpv();
    writeVentureOperationalRecord({
      ...backfillCreVentureOperationalRecord(),
      venture_id: "venture_future_auto",
      venture_name: "Future Auto Venture",
      venture_status: "ACTIVE",
      public_launch_state: "NO",
      primary_domain: "future.example",
      public_url: "https://future.example",
      blocked_actions: ["PUBLIC_LAUNCH"],
    });
    const merged = mergeCanonicalVenturesIntoHqList([]);
    expect(merged.some((row) => row.ventureAssemblyId === "venture_future_auto")).toBe(true);
    expect(merged.some((row) => row.ventureName === "OccupancyNPV")).toBe(true);
  });

  it("excludes archived ventures and detects stale or duplicate projections", () => {
    seedOccupancynpv();
    writeVentureOperationalRecord({
      ...backfillCreVentureOperationalRecord(),
      venture_id: "venture_archived",
      venture_name: "Gone",
      venture_status: "ARCHIVED",
    });
    expect(listCanonicalVenturesForHq().some((row) => row.venture_id === "venture_archived")).toBe(false);
    const occupancynpv = mergeCanonicalVenturesIntoHqList([])[0]!;
    const stale = { ...occupancynpv, paymentState: "NO" as const, fulfillmentState: "FAIL" };
    const audit = auditHqVentureRegistry({
      assemblyItems: [],
      mergedItems: [occupancynpv, occupancynpv],
    });
    expect(audit.duplicateProjections).toBeGreaterThan(0);
    const gate = evaluateVentureHQProjectionGate({
      record: listCanonicalVenturesForHq().find((row) => row.venture_id === CRE_VENTURE_ID)!,
      hqItems: [stale],
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(expect.arrayContaining(["payment_stale", "fulfillment_stale"]));
  });

  it("passes VentureHQProjectionGate after merge and exposes OccupancyNPV commercial detail", () => {
    const record = seedOccupancynpv();
    const merged = mergeCanonicalVenturesIntoHqList([]);
    const gate = evaluateVentureHQProjectionGate({ record, hqItems: merged });
    expect(gate.result).toBe("PASS");
    const audit = auditHqVentureRegistry({ assemblyItems: [], mergedItems: merged });
    expect(audit.missingAfter).toBe(0);
    expect(audit.staleProjections).toBe(0);
    const detail = projectOccupancynpvHqDetail();
    expect(detail?.overview.domain).toBe("occupancynpv.com");
    expect(detail?.overview.productionUrl).toBe("https://occupancynpv.com");
    expect(detail?.overview.paidAppUrl).toBe("https://occupancynpv.com/occupancynpv/app");
    expect(detail?.commercial.professional).toBe("$290/year");
    expect(detail?.commercial.perDeal).toBe("$149/deal");
    expect(detail?.overview.publicLaunch).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
    expect(detail?.governance.founderProductReview.newPaidProductUi).toBe("PASS");
    expect(detail?.customerFacingUi.founderReview).toBe("PASS");
    expect(detail?.backend.backendReadinessGate).toBe("PASS");
    expect(detail?.backend.provider).toMatch(/managed_auth|managed_postgres|application_server/);
    expect(detail?.backend.auth).toBe("SUPABASE_AUTH");
    expect(detail?.backend.persistence).toBe("SUPABASE");
    expect(JSON.stringify(detail?.backend)).not.toMatch(/SERVICE_ROLE|sk_live|secret/i);
  });
});
