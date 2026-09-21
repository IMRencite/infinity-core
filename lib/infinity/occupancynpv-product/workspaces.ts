import { consumeOneTimeEntitlement } from "@/lib/infinity/fulfillment";
import { emitOccupancynpvCollectionEvent } from "./collection-events";
import { analyzeLeaseScenario, compareScenarios, sensitivityByDiscountRate, type LeaseScenarioInput } from "./npv";
import { overlayFor, professionalAccessAllowsUse, PROFESSIONAL_USAGE_POLICY } from "./policy";
import { newId, nowIso, type OccupancynpvProductStore } from "./store";
import type { DealWorkspace, OccupancynpvAuthSession, StoredLeaseScenario } from "./types";

export const WORKSPACE_COLLECTION_PAGE_SIZE = 10 as const;
export const WORKSPACE_DELETE_POLICY = "ARCHIVE_ONLY" as const;

export type WorkspaceLifecycleStatus = "ACTIVE" | "ARCHIVED";
export type WorkspaceListQuery = {
  status?: WorkspaceLifecycleStatus | "ALL";
  page?: number;
  pageSize?: number;
  q?: string;
};

export type WorkspaceCollectionPage = {
  items: DealWorkspace[];
  total: number;
  page: number;
  pageSize: number;
  status: WorkspaceLifecycleStatus | "ALL";
  q: string;
};

function qaSession(session: OccupancynpvAuthSession | null): boolean {
  return Boolean(session?.email?.trim().toLowerCase() === "infinitemediaresources@gmail.com");
}

function entitlementsFor(store: OccupancynpvProductStore, customerId: string) {
  return [...store.fulfillment.entitlements.values()].filter((row) => row.customer_identity_id === customerId);
}

export function authorizeWorkspaceAccess(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
}): { ok: true; workspace: DealWorkspace } | { ok: false; reason: string } {
  if (!input.session) return { ok: false, reason: "UNAUTHENTICATED" };
  const workspace = input.store.workspaces.get(input.workspaceId);
  if (!workspace) return { ok: false, reason: "WORKSPACE_NOT_FOUND" };
  if (workspace.customer_id !== input.session.customer_id) return { ok: false, reason: "CROSS_CUSTOMER_DENIED" };
  return { ok: true, workspace };
}

export function createDealWorkspace(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  name: string;
  now?: string;
}): { ok: true; workspace: DealWorkspace; professionalUsagePolicy: typeof PROFESSIONAL_USAGE_POLICY } | { ok: false; reason: string } {
  if (!input.session) return { ok: false, reason: "UNAUTHENTICATED" };
  const entitlements = entitlementsFor(input.store, input.session.customer_id);
  const qa = entitlements.find((row) => (row.offer_id === "INTERNAL_QA" || row.entitlement_type === "INTERNAL_QA_ACCESS") && row.status === "ACTIVE");
  if (qa) {
    const workspace = persistWorkspace(input.store, input.session.customer_id, qa.entitlement_id, input.name, input.now);
    return { ok: true, workspace, professionalUsagePolicy: PROFESSIONAL_USAGE_POLICY };
  }
  const perDeal = entitlements.find((row) => row.offer_id === "PER_DEAL" && row.status === "ACTIVE" && (row.quantity_remaining ?? 0) > 0);
  const professional = entitlements.find((row) => {
    if (row.offer_id !== "PROFESSIONAL") return false;
    if (row.entitlement_type === "INTERNAL_QA_ACCESS") return false;
    return professionalAccessAllowsUse({
      entitlement: row,
      overlay: overlayFor(input.store, row),
      now: nowIso(input.now),
    });
  });
  if (perDeal) {
    const consumed = consumeOneTimeEntitlement({
      store: input.store.fulfillment,
      entitlementId: perDeal.entitlement_id,
      customerIdentityId: input.session.customer_id,
      now: nowIso(input.now),
    });
    if (!consumed.ok) return { ok: false, reason: consumed.reason };
    const workspace = persistWorkspace(input.store, input.session.customer_id, perDeal.entitlement_id, input.name, input.now);
    const order = [...input.store.fulfillment.orders.values()].find((row) => row.payment_reference === perDeal.payment_reference);
    if (order) order.state = "FULFILLMENT_COMPLETE";
    return { ok: true, workspace, professionalUsagePolicy: PROFESSIONAL_USAGE_POLICY };
  }
  if (professional) {
    const workspace = persistWorkspace(input.store, input.session.customer_id, professional.entitlement_id, input.name, input.now);
    return { ok: true, workspace, professionalUsagePolicy: PROFESSIONAL_USAGE_POLICY };
  }
  return { ok: false, reason: "NO_VALID_ENTITLEMENT" };
}

function persistWorkspace(
  store: OccupancynpvProductStore,
  customerId: string,
  entitlementId: string,
  name: string,
  now?: string,
): DealWorkspace {
  const created = nowIso(now);
  const workspace: DealWorkspace = {
    workspace_id: newId("ws"),
    venture_id: "occupancynpv",
    customer_id: customerId,
    entitlement_id: entitlementId,
    name: name.trim() || "Deal workspace",
    status: "ACTIVE",
    created_at: created,
    updated_at: created,
  };
  store.workspaces.set(workspace.workspace_id, workspace);
  return workspace;
}

export function listCustomerWorkspaces(store: OccupancynpvProductStore, session: OccupancynpvAuthSession | null): DealWorkspace[] {
  if (!session) return [];
  return [...store.workspaces.values()]
    .filter((row) => row.customer_id === session.customer_id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function workspaceCollectionCounts(store: OccupancynpvProductStore, session: OccupancynpvAuthSession | null) {
  const rows = listCustomerWorkspaces(store, session);
  return {
    total: rows.length,
    active: rows.filter((row) => row.status === "ACTIVE").length,
    archived: rows.filter((row) => row.status === "ARCHIVED").length,
  };
}

export function listCustomerWorkspacesPage(
  store: OccupancynpvProductStore,
  session: OccupancynpvAuthSession | null,
  query: WorkspaceListQuery = {},
): WorkspaceCollectionPage {
  const status = query.status ?? "ACTIVE";
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? WORKSPACE_COLLECTION_PAGE_SIZE));
  const page = Math.max(1, query.page ?? 1);
  const q = (query.q ?? "").trim().toLowerCase();
  const filtered = listCustomerWorkspaces(store, session).filter((row) => {
    if (status !== "ALL" && row.status !== status) return false;
    if (q && !row.name.toLowerCase().includes(q)) return false;
    return true;
  });
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    status,
    q: query.q ?? "",
  };
}

export function renameWorkspace(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  name: string;
  now?: string;
}): { ok: true; workspace: DealWorkspace } | { ok: false; reason: string } {
  const access = authorizeWorkspaceAccess(input);
  if (!access.ok) return access;
  access.workspace.name = input.name.trim() || access.workspace.name;
  access.workspace.updated_at = nowIso(input.now);
  emitOccupancynpvCollectionEvent("workspace_renamed", qaSession(input.session));
  return { ok: true, workspace: access.workspace };
}

export function archiveWorkspace(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  now?: string;
}): { ok: true; workspace: DealWorkspace } | { ok: false; reason: string } {
  const access = authorizeWorkspaceAccess(input);
  if (!access.ok) return access;
  access.workspace.status = "ARCHIVED";
  access.workspace.updated_at = nowIso(input.now);
  emitOccupancynpvCollectionEvent("workspace_archived", qaSession(input.session));
  return { ok: true, workspace: access.workspace };
}

export function restoreWorkspace(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  now?: string;
}): { ok: true; workspace: DealWorkspace } | { ok: false; reason: string } {
  const access = authorizeWorkspaceAccess(input);
  if (!access.ok) return access;
  access.workspace.status = "ACTIVE";
  access.workspace.updated_at = nowIso(input.now);
  emitOccupancynpvCollectionEvent("workspace_restored", qaSession(input.session));
  return { ok: true, workspace: access.workspace };
}

export function entitlementSnapshot(store: OccupancynpvProductStore, customerId: string) {
  return entitlementsFor(store, customerId).map((row) => ({
    entitlement_id: row.entitlement_id,
    offer_id: row.offer_id,
    status: row.status,
    quantity_remaining: row.quantity_remaining,
    consumed_at: row.consumed_at,
  }));
}

export function listWorkspaceScenarios(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
}): { ok: true; scenarios: StoredLeaseScenario[] } | { ok: false; reason: string } {
  const access = authorizeWorkspaceAccess(input);
  if (!access.ok) return access;
  const scenarios = [...input.store.scenarios.values()]
    .filter((row) => row.workspace_id === input.workspaceId)
    .sort((a, b) => a.scenario_id.localeCompare(b.scenario_id));
  return { ok: true, scenarios };
}

export function saveWorkspaceScenarios(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  scenarios: LeaseScenarioInput[];
  compare?: boolean;
  compareScenarioIds?: string[];
}): { ok: true; scenarios: StoredLeaseScenario[] } | { ok: false; reason: string; errors?: string[] } {
  const access = authorizeWorkspaceAccess(input);
  if (!access.ok) return access;
  if (input.scenarios.length < 1) return { ok: false, reason: "SCENARIO_REQUIRED" };
  const stored: StoredLeaseScenario[] = [];
  for (const scenario of input.scenarios) {
    const analyzed = analyzeLeaseScenario(scenario);
    if (!analyzed.ok) return { ok: false, reason: "SCENARIO_INVALID", errors: analyzed.errors };
    const key = `${input.workspaceId}:${scenario.scenario_id}`;
    const created = !input.store.scenarios.has(key);
    const row: StoredLeaseScenario = {
      scenario_id: scenario.scenario_id,
      workspace_id: input.workspaceId,
      input: scenario,
      result: analyzed.result,
    };
    input.store.scenarios.set(key, row);
    stored.push(row);
    emitOccupancynpvCollectionEvent(created ? "scenario_created" : "scenario_opened", qaSession(input.session));
  }
  if (input.compare) {
    const ids = input.compareScenarioIds?.filter(Boolean) ?? stored.map((row) => row.scenario_id);
    if (ids.length < 2) return { ok: false, reason: "TWO_SCENARIOS_REQUIRED" };
    emitOccupancynpvCollectionEvent("comparison_pair_selected", qaSession(input.session));
  }
  access.workspace.updated_at = nowIso();
  return { ok: true, scenarios: stored };
}

function selectedScenarioPair(scenarios: StoredLeaseScenario[], compareScenarioIds?: string[]) {
  const ids = compareScenarioIds?.filter(Boolean) ?? [];
  if (ids.length >= 2) {
    const pair = ids.slice(0, 2).map((id) => scenarios.find((row) => row.scenario_id === id)).filter(Boolean) as StoredLeaseScenario[];
    return pair.length === 2 ? pair : [];
  }
  return scenarios.length === 2 ? scenarios : [];
}

export function workspaceResults(input: {
  store: OccupancynpvProductStore;
  session: OccupancynpvAuthSession | null;
  workspaceId: string;
  sensitivityRates?: number[];
  compareScenarioIds?: string[];
}) {
  const access = authorizeWorkspaceAccess(input);
  if (!access.ok) return access;
  const listed = listWorkspaceScenarios(input);
  if (!listed.ok) return listed;
  const scenarios = listed.scenarios.filter((row) => row.result);
  const pair = selectedScenarioPair(scenarios, input.compareScenarioIds);
  const results = pair.map((row) => row.result!).filter(Boolean);
  const comparison = results.length === 2 ? compareScenarios(results) : null;
  const first = pair[0] ?? scenarios[0];
  const sensitivity = first
    ? sensitivityByDiscountRate(first.input, input.sensitivityRates ?? [0, 0.08, 0.12])
    : [];
  return {
    ok: true as const,
    workspace: access.workspace,
    scenarios: listed.scenarios,
    comparison,
    compareScenarioIds: pair.map((row) => row.scenario_id),
    sensitivity,
  };
}
