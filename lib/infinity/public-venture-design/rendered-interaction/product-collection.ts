export const PERSISTENT_PRODUCT_COLLECTION_CONTRACT = "PersistentProductCollectionContract" as const;
export const PRODUCT_COLLECTION_SCALABILITY_GATE = "ProductCollectionScalabilityGate" as const;
export const PRODUCT_COLLECTION_LIFECYCLE_GATE = "ProductCollectionLifecycleGate" as const;
export const PRODUCT_SUB_ITEM_DISCOVERABILITY_GATE = "ProductSubItemDiscoverabilityGate" as const;

export const COLLECTION_SCALE_FIXTURES = [0, 1, 10, 25, 100] as const;
export const SUBITEM_SCALE_FIXTURES = [0, 1, 2, 5, 20] as const;
export const DEFAULT_COLLECTION_PAGE_SIZE = 10 as const;

export type PersistentProductCollectionContract = {
  contract: typeof PERSISTENT_PRODUCT_COLLECTION_CONTRACT;
  collectionItemType: string;
  ownership: "CUSTOMER";
  lifecycleStates: ReadonlyArray<"ACTIVE" | "ARCHIVED">;
  organizationStrategy: "ACTIVE_ARCHIVED_TABS";
  boundedListStrategy: "PAGINATION";
  defaultPageSize: number;
  search: "NAME" | "NONE";
  subItems: { type: string; discoverability: "ALL_DURABLE_VISIBLE" };
  destructiveAction: "ARCHIVE_ONLY" | "SOFT_DELETE" | "PERMANENT_DELETE";
  entitlementOnArchive: "UNCHANGED";
  recovery: "RESTORE_TO_ACTIVE";
};

export function occupancynpvWorkspaceCollectionContract(): PersistentProductCollectionContract {
  return {
    contract: PERSISTENT_PRODUCT_COLLECTION_CONTRACT,
    collectionItemType: "DealWorkspace",
    ownership: "CUSTOMER",
    lifecycleStates: ["ACTIVE", "ARCHIVED"],
    organizationStrategy: "ACTIVE_ARCHIVED_TABS",
    boundedListStrategy: "PAGINATION",
    defaultPageSize: DEFAULT_COLLECTION_PAGE_SIZE,
    search: "NAME",
    subItems: { type: "LeaseScenario", discoverability: "ALL_DURABLE_VISIBLE" },
    destructiveAction: "ARCHIVE_ONLY",
    entitlementOnArchive: "UNCHANGED",
    recovery: "RESTORE_TO_ACTIVE",
  };
}

export type CollectionScaleEvidence = {
  fixtureCount: number;
  renderedItemCount: number;
  pageSize: number;
  overflowPx?: number;
  result?: "PASS" | "FAIL";
};

export function renderBoundedCollectionFixture(count: number, pageSize = DEFAULT_COLLECTION_PAGE_SIZE): {
  html: string;
  renderedItemCount: number;
  pageSize: number;
} {
  const renderedItemCount = Math.min(pageSize, Math.max(0, count));
  const cards = Array.from({ length: renderedItemCount }, (_, index) => `<article data-workspace-card="true"><h3>Workspace ${index + 1}</h3><a href="/occupancynpv/app/workspaces/${index + 1}">Continue workspace</a><button>Rename</button><button>Archive</button></article>`).join("");
  return {
    renderedItemCount,
    pageSize,
    html: `<section data-collection="workspaces" data-collection-bounded="true" data-collection-page-size="${pageSize}" data-workspace-list="true" data-collection-tab="active"><div role="tablist"><button>Active</button><button>Archived</button></div><p>${count} active</p>${cards}${count > pageSize ? `<nav data-pagination="true">Page 1 of ${Math.ceil(count / pageSize)}</nav>` : ""}</section>`,
  };
}

export function renderScenarioCollectionFixture(count: number): string {
  const items = Array.from({ length: count }, (_, index) => `<li data-scenario-item="true"><h3>${index < 2 ? `Lease ${index === 0 ? "A" : "B"}` : `Scenario ${index + 1}`}</h3><button>Open / Edit</button></li>`).join("");
  const compare = count >= 2
    ? `<form data-compare-select="true"><label>Scenario A</label><label>Scenario B</label><button>Compare NPV</button></form>`
    : `<p>Add another scenario to compare.</p>`;
  const empty = count === 0 ? `<p>Add First Scenario</p>` : "";
  return `<section data-scenario-list="true">${empty}<ul>${items}</ul>${compare}</section>`;
}

export type ProductCollectionScalabilityGateResult = {
  gate: typeof PRODUCT_COLLECTION_SCALABILITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  persistentCollectionPresent: boolean;
  boundedInitialRender: boolean;
  stableOrdering: boolean;
  itemCountVisible: boolean;
  archiveLifecyclePresent: boolean;
  heavyUseEvidencePresent: boolean;
};

export function evaluateProductCollectionScalabilityGate(input: {
  html: string;
  evidence?: CollectionScaleEvidence[] | null;
}): ProductCollectionScalabilityGateResult {
  const html = input.html;
  const reasons: string[] = [];
  const persistentCollectionPresent = /data-collection=|data-workspace-list|Workspaces|Locations/i.test(html);
  const boundedInitialRender = /data-collection-bounded|data-collection-page-size|data-pagination|pageSize/i.test(html);
  const stableOrdering = /updated_at|Updated|updatedAt|order\("updated_at"|data-collection-order/i.test(html);
  const itemCountVisible = /\d+\s+(active|archived|saved|workspace|location)/i.test(html);
  const archiveLifecyclePresent = /Archive|Archived|status.*ARCHIVED/i.test(html);
  const required = [25, 100] as const;
  const samples = input.evidence ?? [];
  const heavyUseEvidencePresent = required.every((count) =>
    samples.some((sample) => sample.fixtureCount === count && sample.renderedItemCount <= sample.pageSize && (sample.result ?? "PASS") === "PASS"),
  );
  const unbounded = /workspaces\.map|items\.map/.test(html) && !boundedInitialRender;
  if (!persistentCollectionPresent) reasons.push("COLLECTION_SURFACE_MISSING");
  if (!boundedInitialRender || unbounded) reasons.push("UNBOUNDED_COLLECTION_RENDER");
  if (!stableOrdering) reasons.push("COLLECTION_ORDER_UNSTABLE");
  if (!itemCountVisible) reasons.push("COLLECTION_COUNT_HIDDEN");
  if (!archiveLifecyclePresent) reasons.push("COLLECTION_LIFECYCLE_MISSING");
  if (!heavyUseEvidencePresent) reasons.push("HEAVY_USE_FIXTURE_MISSING");
  return {
    gate: PRODUCT_COLLECTION_SCALABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    persistentCollectionPresent,
    boundedInitialRender,
    stableOrdering,
    itemCountVisible,
    archiveLifecyclePresent,
    heavyUseEvidencePresent,
  };
}

export type ProductCollectionLifecycleGateResult = {
  gate: typeof PRODUCT_COLLECTION_LIFECYCLE_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  openAction: boolean;
  renameAction: boolean;
  archiveRestore: boolean;
  entitlementPreserved: boolean;
};

export function evaluateProductCollectionLifecycleGate(input: {
  html: string;
  entitlementUnchanged?: boolean;
}): ProductCollectionLifecycleGateResult {
  const html = input.html;
  const reasons: string[] = [];
  const openAction = /Continue workspace|Open \/ Edit|Open\/Edit|Open location|Open kit/i.test(html);
  const renameAction = /Rename|workspace_renamed|renameWorkspace/i.test(html);
  const archiveRestore = /Archive/.test(html) && /Restore/.test(html);
  const entitlementPreserved = input.entitlementUnchanged !== false && !/quantity_remaining\s*\+|restoreEntitlement|quantity_remaining:\s*[^\n]*\+\s*1/i.test(html);
  if (!openAction) reasons.push("COLLECTION_OPEN_MISSING");
  if (!renameAction) reasons.push("COLLECTION_RENAME_MISSING");
  if (!archiveRestore) reasons.push("COLLECTION_ARCHIVE_RESTORE_MISSING");
  if (!entitlementPreserved) reasons.push("ENTITLEMENT_RESTORED_ON_ARCHIVE");
  return {
    gate: PRODUCT_COLLECTION_LIFECYCLE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    openAction,
    renameAction,
    archiveRestore,
    entitlementPreserved,
  };
}

export type ProductSubItemDiscoverabilityGateResult = {
  gate: typeof PRODUCT_SUB_ITEM_DISCOVERABILITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  allChildrenVisible: boolean;
  identityPresent: boolean;
  openEditPresent: boolean;
  latestDoesNotHidePrior: boolean;
};

export function evaluateProductSubItemDiscoverabilityGate(input: {
  html: string;
  childCount?: number;
  renderedChildCount?: number;
}): ProductSubItemDiscoverabilityGateResult {
  const html = input.html;
  const reasons: string[] = [];
  const allChildrenVisible = /data-scenario-list|data-scenario-item|scenarios\.map|data-kit-history|data-kit-item/i.test(html);
  const identityPresent = /scenario_name|Lease A|Scenario |Kit /i.test(html);
  const openEditPresent = /Open \/ Edit|Save Scenario|Add First Scenario|Add Another Scenario|Open kit|View kit/i.test(html);
  const latestDoesNotHidePrior = !/scenarios\[0\]|json\.scenarios\[0\]/.test(html) || /scenarios\.map|data-scenario-item/.test(html);
  const hidden = input.childCount != null && input.renderedChildCount != null && input.renderedChildCount < input.childCount;
  if (!allChildrenVisible || hidden) reasons.push("PRIOR_CHILD_RECORDS_HIDDEN");
  if (!identityPresent) reasons.push("SUBITEM_IDENTITY_MISSING");
  if (!openEditPresent) reasons.push("SUBITEM_OPEN_MISSING");
  if (!latestDoesNotHidePrior) reasons.push("LATEST_CHILD_HIDES_PRIOR");
  return {
    gate: PRODUCT_SUB_ITEM_DISCOVERABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    allChildrenVisible: allChildrenVisible && !hidden,
    identityPresent,
    openEditPresent,
    latestDoesNotHidePrior,
  };
}
