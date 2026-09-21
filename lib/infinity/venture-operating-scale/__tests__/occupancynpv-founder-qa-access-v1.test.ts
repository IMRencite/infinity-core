import { describe, expect, it } from "vitest";
import { createOccupancynpvAccount } from "@/lib/infinity/occupancynpv-product/customers";
import { analyzeLeaseScenario } from "@/lib/infinity/occupancynpv-product/npv";
import { resetOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { createOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/store";
import { createDealWorkspace, saveWorkspaceScenarios, workspaceResults } from "@/lib/infinity/occupancynpv-product/workspaces";
import { flatRentInput } from "@/lib/infinity/occupancynpv-product/fixtures";
import {
  defaultOccupancynpvFounderQaGrant,
  isOccupancynpvInternalQaPaymentReference,
  occupancynpvEntitlementIsCommercial,
  occupancynpvFounderQaSessionEligible,
  OCCUPANCYNPV_FOUNDER_QA_CANDIDATE_EMAIL,
  OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT,
} from "../occupancynpv-founder-qa-access";

describe("OCCUPANCYNPV_FOUNDER_QA_ACCESS_V1", () => {
  it("does not treat email as authorization without an authenticated identity", () => {
    const grant = defaultOccupancynpvFounderQaGrant();
    expect(occupancynpvFounderQaSessionEligible({
      email: OCCUPANCYNPV_FOUNDER_QA_CANDIDATE_EMAIL,
      authIdentityId: "",
      grant,
    })).toBe(false);
    expect(occupancynpvFounderQaSessionEligible({
      email: "random@example.com",
      authIdentityId: "auth_123",
      grant,
    })).toBe(false);
    expect(occupancynpvFounderQaSessionEligible({
      email: OCCUPANCYNPV_FOUNDER_QA_CANDIDATE_EMAIL,
      authIdentityId: "auth_123",
      grant,
    })).toBe(true);
  });

  it("excludes QA entitlements from commercial and revenue metrics", () => {
    expect(isOccupancynpvInternalQaPaymentReference("internal_qa_occupancynpv_founder_v1")).toBe(true);
    expect(isOccupancynpvInternalQaPaymentReference("pay_live_123")).toBe(false);
    expect(occupancynpvEntitlementIsCommercial({
      offer_id: "INTERNAL_QA",
      entitlement_type: OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT,
      payment_reference: "internal_qa_occupancynpv_founder_v1",
    })).toBe(false);
    expect(occupancynpvEntitlementIsCommercial({
      offer_id: "PROFESSIONAL",
      entitlement_type: "PROFESSIONAL_ACCESS",
      payment_reference: "pay_live_123",
    })).toBe(true);
  });

  it("lets an authenticated QA identity use the product without a Stripe purchase", () => {
    resetOccupancynpvProductStore();
    const store = createOccupancynpvProductStore();
    const created = createOccupancynpvAccount({
      store,
      email: OCCUPANCYNPV_FOUNDER_QA_CANDIDATE_EMAIL,
      password: "password1",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const unentitled = createOccupancynpvAccount({ store, email: "buyer@example.com", password: "password1" });
    expect(unentitled.ok).toBe(true);
    if (!unentitled.ok) return;
    store.fulfillment.entitlements.set("ent_qa_1", {
      entitlement_id: "ent_qa_1",
      venture_id: "occupancynpv",
      customer_identity_id: created.customer.customer_id,
      offer_id: "INTERNAL_QA",
      payment_reference: "internal_qa_occupancynpv_founder_v1",
      subscription_reference: null,
      entitlement_type: OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT,
      resource_scope: "occupancynpv.application",
      quantity: 1,
      quantity_remaining: null,
      start_at: new Date().toISOString(),
      expires_at: null,
      status: "ACTIVE",
      consumed_at: null,
      revoked_at: null,
      source: "founder_qa_grant",
      version: "1",
      traceability: "trl_occupancynpv_founder_qa",
    });
    expect(createDealWorkspace({ store, session: unentitled.session, name: "Blocked" }).ok).toBe(false);
    const workspace = createDealWorkspace({ store, session: created.session, name: "QA deal" });
    expect(workspace.ok).toBe(true);
    if (!workspace.ok) return;
    const saved = saveWorkspaceScenarios({
      store,
      session: created.session,
      workspaceId: workspace.workspace.workspace_id,
      scenarios: [
        flatRentInput({ scenario_id: "a", scenario_name: "A" }),
        flatRentInput({ scenario_id: "b", scenario_name: "B", rent_steps: [{ start_month: 1, end_month: 12, monthly_rent: 1100 }] }),
      ],
    });
    expect(saved.ok).toBe(true);
    const results = workspaceResults({ store, session: created.session, workspaceId: workspace.workspace.workspace_id });
    expect(results.ok && results.comparison?.basis).toBe("NPV");
    expect(results.ok && (results.sensitivity?.length ?? 0) > 0).toBe(true);
    expect(analyzeLeaseScenario(flatRentInput({ scenario_id: "a", scenario_name: "A" })).ok).toBe(true);
    expect(occupancynpvEntitlementIsCommercial({
      offer_id: "INTERNAL_QA",
      entitlement_type: OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT,
      payment_reference: "internal_qa_occupancynpv_founder_v1",
    })).toBe(false);
    expect(defaultOccupancynpvFounderQaGrant().commercial_purchase).toBe(false);
    expect(defaultOccupancynpvFounderQaGrant().revenue_usd).toBe(0);
    expect(defaultOccupancynpvFounderQaGrant().stripe_payment).toBe("NONE");
    resetOccupancynpvProductStore();
  });
});
