export const HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT = "HQVentureSelectionAuthorityContract" as const;
export const HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT = "HQVentureRouteSelectorSyncContract" as const;
export const HQ_INSPECTION_HYDRATION_CONSISTENCY_GATE = "HQInspectionHydrationConsistencyGate" as const;
export const HQ_VENTURE_SNAPSHOT_ISOLATION_GATE = "HQVentureSnapshotIsolationGate" as const;
export const HQ_VENTURE_POLL_IDENTITY_GATE = "HQVenturePollIdentityGate" as const;
export const HQ_VENTURE_SELECTION_FALLBACK_MASKING_GATE = "HQVentureSelectionFallbackMaskingGate" as const;
export const HQ_VENTURE_CLICK_THROUGH_CONTRACT = "HQVentureClickThroughContract" as const;
export const HQ_VENTURE_LINK_INTEGRITY_GATE = "HQVentureLinkIntegrityGate" as const;
export const FOUNDER_VENTURE_CLICK_THROUGH_ACCEPTANCE_GATE = "FounderVentureClickThroughAcceptanceGate" as const;
export const VENTURE_SELECTION_RESOLUTION_FAILED = "VENTURE_SELECTION_RESOLUTION_FAILED" as const;

export const HQ_VENTURE_SELECTION_PRINCIPLE =
  "A VENTURE CLICK IS A COMPLETE SELECTION ACTION. THE DROPDOWN IS A SWITCHER, NOT A SECOND CONFIRMATION STEP." as const;

export const HQ_VENTURE_SELECTION_PRECEDENCE = [
  "explicit_route",
  "current_dropdown",
  "prior_inspection_history",
  "default_fallback",
] as const;

export type HqVentureSelectionAuthority = {
  contract: typeof HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT;
  explicitRouteVentureId: string | null;
  dropdownVentureId: string | null;
  priorInspectionVentureId: string | null;
  defaultFallbackVentureId: string | null;
  authoritativeVentureId: string | null;
  source: "explicit_route" | "current_dropdown" | "prior_inspection_history" | "default_fallback" | "none";
  fallbackOverrodeRoute: boolean;
};

export type HqVentureRouteSelectorSync = {
  contract: typeof HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT;
  routeVentureId: string | null;
  selectorVentureId: string | null;
  synchronized: boolean;
};

export type NamedSelectionGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};
