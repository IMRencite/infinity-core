import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fulfillOccupancynpvVerifiedPayment } from "../fulfillment";
import { evaluateCalculationFixtures, flatRentInput } from "../fixtures";
import { resetOccupancynpvProductStore } from "../persist";
import { createOccupancynpvAccount } from "../customers";
import { createOccupancynpvProductStore } from "../store";
import {
  archiveWorkspace,
  createDealWorkspace,
  entitlementSnapshot,
  listCustomerWorkspacesPage,
  listWorkspaceScenarios,
  renameWorkspace,
  restoreWorkspace,
  saveWorkspaceScenarios,
  WORKSPACE_COLLECTION_PAGE_SIZE,
  WORKSPACE_DELETE_POLICY,
  workspaceResults,
} from "../workspaces";

function account(store: ReturnType<typeof createOccupancynpvProductStore>, email: string) {
  const created = createOccupancynpvAccount({ store, email, password: "password1" });
  if (!created.ok) throw new Error("account");
  fulfillOccupancynpvVerifiedPayment({
    store,
    offerId: "PROFESSIONAL",
    customerId: created.customer.customer_id,
    paymentReference: `pay_${email}`,
    eventId: `evt_${email}`,
  });
  return created;
}

describe("OccupancyNPV collection lifecycle", () => {
  beforeEach(() => resetOccupancynpvProductStore());
  afterEach(() => resetOccupancynpvProductStore());

  it("renames, archives, and restores without changing Per-Deal entitlement", () => {
    const store = createOccupancynpvProductStore();
    const created = createOccupancynpvAccount({ store, email: "deal@example.com", password: "password1" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    fulfillOccupancynpvVerifiedPayment({
      store,
      offerId: "PER_DEAL",
      customerId: created.customer.customer_id,
      paymentReference: "pay_deal_life",
      eventId: "evt_deal_life",
    });
    const workspace = createDealWorkspace({ store, session: created.session, name: "Downtown HQ" });
    expect(workspace.ok).toBe(true);
    if (!workspace.ok) return;
    const before = entitlementSnapshot(store, created.customer.customer_id);
    expect(before[0]?.status).toBe("CONSUMED");
    expect(renameWorkspace({ store, session: created.session, workspaceId: workspace.workspace.workspace_id, name: "Downtown HQ renewal" }).ok).toBe(true);
    expect(archiveWorkspace({ store, session: created.session, workspaceId: workspace.workspace.workspace_id }).ok).toBe(true);
    expect(listCustomerWorkspacesPage(store, created.session, { status: "ACTIVE" }).total).toBe(0);
    expect(listCustomerWorkspacesPage(store, created.session, { status: "ARCHIVED" }).items[0]?.name).toBe("Downtown HQ renewal");
    expect(restoreWorkspace({ store, session: created.session, workspaceId: workspace.workspace.workspace_id }).ok).toBe(true);
    expect(listCustomerWorkspacesPage(store, created.session, { status: "ACTIVE" }).total).toBe(1);
    expect(entitlementSnapshot(store, created.customer.customer_id)).toEqual(before);
    expect(createDealWorkspace({ store, session: created.session, name: "Second free" }).ok).toBe(false);
    expect(WORKSPACE_DELETE_POLICY).toBe("ARCHIVE_ONLY");
  });

  it("blocks cross-customer archive and scenario access", () => {
    const store = createOccupancynpvProductStore();
    const owner = account(store, "owner@example.com");
    const other = account(store, "other@example.com");
    const workspace = createDealWorkspace({ store, session: owner.session, name: "Owner deal" });
    expect(workspace.ok).toBe(true);
    if (!workspace.ok) return;
    expect(archiveWorkspace({ store, session: other.session, workspaceId: workspace.workspace.workspace_id }).ok).toBe(false);
    expect(saveWorkspaceScenarios({
      store,
      session: other.session,
      workspaceId: workspace.workspace.workspace_id,
      scenarios: [flatRentInput({ scenario_id: "x", scenario_name: "X" })],
    }).ok).toBe(false);
    expect(workspaceResults({ store, session: other.session, workspaceId: workspace.workspace.workspace_id }).ok).toBe(false);
  });

  it("paginates 25 and 100 workspaces with stable latest-first order", () => {
    const store = createOccupancynpvProductStore();
    const created = account(store, "scale@example.com");
    for (let index = 0; index < 100; index += 1) {
      const made = createDealWorkspace({
        store,
        session: created.session,
        name: `Workspace ${String(index + 1).padStart(3, "0")}`,
        now: new Date(Date.UTC(2026, 8, 8, 0, index)).toISOString(),
      });
      expect(made.ok).toBe(true);
    }
    const empty = listCustomerWorkspacesPage(store, created.session, { status: "ACTIVE", page: 1, pageSize: 10 });
    expect(empty.pageSize).toBe(WORKSPACE_COLLECTION_PAGE_SIZE);
    expect(listCustomerWorkspacesPage(store, created.session, { q: "Workspace 001" }).total).toBe(1);
    const page1 = listCustomerWorkspacesPage(store, created.session, { page: 1, pageSize: 10 });
    const page3 = listCustomerWorkspacesPage(store, created.session, { page: 3, pageSize: 10 });
    const page10 = listCustomerWorkspacesPage(store, created.session, { page: 10, pageSize: 10 });
    expect(page1.total).toBe(100);
    expect(page1.items).toHaveLength(10);
    expect(page3.items).toHaveLength(10);
    expect(page10.items).toHaveLength(10);
    expect(page1.items[0]?.updated_at >= page1.items[9]?.updated_at).toBe(true);
    expect(page1.items[0]?.workspace_id).not.toBe(page3.items[0]?.workspace_id);
    expect(listCustomerWorkspacesPage(store, created.session, { page: 1, pageSize: 10 }).items).toHaveLength(10);
  });

  it("keeps all scenarios discoverable and compares any selected pair", () => {
    const store = createOccupancynpvProductStore();
    const created = account(store, "scen@example.com");
    const workspace = createDealWorkspace({ store, session: created.session, name: "Multi" });
    expect(workspace.ok).toBe(true);
    if (!workspace.ok) return;
    expect(saveWorkspaceScenarios({ store, session: created.session, workspaceId: workspace.workspace.workspace_id, scenarios: [] }).ok).toBe(false);
    const one = saveWorkspaceScenarios({
      store,
      session: created.session,
      workspaceId: workspace.workspace.workspace_id,
      scenarios: [flatRentInput({ scenario_id: "lease_1", scenario_name: "Lease A" })],
    });
    expect(one.ok).toBe(true);
    const emptyCompare = workspaceResults({ store, session: created.session, workspaceId: workspace.workspace.workspace_id });
    expect(emptyCompare.ok).toBe(true);
    if (emptyCompare.ok) {
      expect(emptyCompare.comparison).toBeNull();
    }
    const inputs = [0, 1, 2, 3, 4].map((index) => flatRentInput({
      scenario_id: `lease_${index + 1}`,
      scenario_name: index < 2 ? `Lease ${index === 0 ? "A" : "B"}` : `Scenario ${index + 1}`,
      rent_steps: [{ start_month: 1, end_month: 12, monthly_rent: 1000 + index * 50 }],
    }));
    expect(saveWorkspaceScenarios({ store, session: created.session, workspaceId: workspace.workspace.workspace_id, scenarios: inputs }).ok).toBe(true);
    const listed = listWorkspaceScenarios({ store, session: created.session, workspaceId: workspace.workspace.workspace_id });
    expect(listed.ok && listed.scenarios).toHaveLength(5);
    const older = listed.ok ? listed.scenarios.find((row) => row.scenario_id === "lease_1") : null;
    expect(older?.input.scenario_name).toBe("Lease A");
    const compared = workspaceResults({
      store,
      session: created.session,
      workspaceId: workspace.workspace.workspace_id,
      compareScenarioIds: ["lease_1", "lease_5"],
    });
    expect(compared.ok && compared.compareScenarioIds).toEqual(["lease_1", "lease_5"]);
    expect(compared.ok && compared.comparison?.scenarios.map((row) => row.scenario_id)).toEqual(["lease_1", "lease_5"]);
    const twenty = Array.from({ length: 20 }, (_, index) => flatRentInput({
      scenario_id: `bulk_${index + 1}`,
      scenario_name: `Scenario ${index + 1}`,
      rent_steps: [{ start_month: 1, end_month: 12, monthly_rent: 800 + index }],
    }));
    expect(saveWorkspaceScenarios({ store, session: created.session, workspaceId: workspace.workspace.workspace_id, scenarios: twenty }).ok).toBe(true);
    const all = listWorkspaceScenarios({ store, session: created.session, workspaceId: workspace.workspace.workspace_id });
    expect(all.ok && all.scenarios.length).toBeGreaterThanOrEqual(20);
    expect(all.ok && all.scenarios.some((row) => row.scenario_id === "lease_1")).toBe(true);
  });

  it("does not change calculation fixtures", () => {
    const fixtures = evaluateCalculationFixtures();
    expect(fixtures.failed).toBe(0);
    expect(fixtures.passed).toBeGreaterThanOrEqual(8);
  });
});
