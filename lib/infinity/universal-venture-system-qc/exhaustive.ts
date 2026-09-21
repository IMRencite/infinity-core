import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ALL_HQ_ROOM_IDS, ROOM_DISPLAY_NAMES } from "@/lib/infinity/operator-console/room-naming";
import type { NamedSystemGate } from "./contract";

export const CANONICAL_VENTURE_SYSTEM_GRAPH = "CanonicalVentureSystemGraph" as const;
export const RENDERED_ROUTE_INVENTORY_CONTRACT = "RenderedRouteInventoryContract" as const;
export const RENDERED_INTERACTIVE_ELEMENT_INVENTORY = "RenderedInteractiveElementInventory" as const;
export const VENTURE_MATERIAL_COVERAGE_GATE = "VentureMaterialCoverageGate" as const;
export const VENTURE_QC_MANIFEST_DIFF_GATE = "VentureQCManifestDiffGate" as const;
export const CUSTOMER_WORKFLOW_DEAD_END_GATE = "CustomerWorkflowDeadEndGate" as const;
export const ORPHANED_CUSTOMER_ROUTE_GATE = "OrphanedCustomerRouteGate" as const;
export const VENTURE_INTERNAL_LINK_QC_GATE = "VentureInternalLinkQCGate" as const;
export const CUSTOMER_BUTTON_QC_GATE = "CustomerButtonQCGate" as const;
export const VENTURE_RENDERED_EVIDENCE_MANIFEST = "VentureRenderedEvidenceManifest" as const;

export const OCCUPANCYNPV_MATERIAL_ROUTES = [
  "/",
  "/pricing",
  "/how-it-works",
  "/faq",
  "/suggest-improvement",
  "/privacy-policy",
  "/terms-of-service",
  "/sitemap.xml",
  "/occupancynpv/app/login",
  "/occupancynpv/app",
  "/occupancynpv/app/checkout/complete",
] as const;

export const OCCUPANCYNPV_MATERIAL_WORKFLOWS = [
  "visitor_understands_product",
  "calculator_to_results",
  "pricing_to_checkout",
  "paid_to_entitlement",
  "return_login",
  "suggest_improvement",
  "legal_access",
] as const;

export const OCCUPANCYNPV_MATERIAL_INTERACTIONS = [
  "nav_home",
  "nav_pricing",
  "nav_improvement",
  "footer_privacy",
  "footer_terms",
  "footer_sitemap",
  "improvement_submit",
  "professional_checkout",
  "per_deal_checkout",
  "login_submit",
] as const;

export type CoverageDimension =
  | "route"
  | "visual"
  | "interaction"
  | "workflow"
  | "subsystem"
  | "mobile"
  | "accessibility"
  | "console"
  | "network"
  | "production_evidence";

export type AccountedStatus = "PASS" | "FAIL" | "NOT_APPLICABLE";

export function buildCanonicalVentureSystemGraph(ventureId: string) {
  return {
    contract: CANONICAL_VENTURE_SYSTEM_GRAPH,
    venture_id: ventureId,
    customer_surfaces: [
      "homepage", "navigation", "footer", "pricing", "product", "calculator", "results",
      "login", "account", "dashboard", "support", "feedback", "legal", "checkout_entry", "confirmation",
    ],
    product_systems: ["primary_workflow", "results", "persistence", "history", "tenant_isolation"],
    commercial_systems: ["pricing", "offers", "checkout", "payment", "subscription", "entitlement", "fulfillment"],
    operating_systems: ["growth", "email", "reply", "feedback", "qc", "deployment", "runtime_health"],
    integrations: ["stripe", "gmail", "gemini", "vercel", "supabase"],
    data_systems: ["customer_workspaces", "feedback_records", "financial_ledger"],
    quality_systems: ["visual", "interaction", "console", "network", "accessibility", "responsive"],
  };
}

export function occupancynpvRenderedRouteInventory() {
  return {
    contract: RENDERED_ROUTE_INVENTORY_CONTRACT,
    venture_id: CRE_VENTURE_ID,
    routes: OCCUPANCYNPV_MATERIAL_ROUTES.map((route) => ({ route, material: true, source: "canonical_product_configuration" })),
  };
}

export function evaluateVentureMaterialCoverageGate(input: {
  material: number;
  accounted: number;
  unknown: number;
}): NamedSystemGate & { accounted_percent: number } {
  const reasons: string[] = [];
  if (input.unknown > 0) reasons.push("UNKNOWN_MATERIAL_ITEMS");
  if (input.accounted < input.material) reasons.push(`MISSING_ACCOUNTING:${input.material - input.accounted}`);
  return {
    gate: VENTURE_MATERIAL_COVERAGE_GATE,
    result: reasons.length === 0 && input.material === input.accounted ? "PASS" : "FAIL",
    reasons,
    accounted_percent: input.material === 0 ? 100 : Math.round((input.accounted / input.material) * 100),
  };
}

export function evaluateVentureQCManifestDiffGate(input: {
  previous_ids: readonly string[];
  current_ids: readonly string[];
  previous_pass_ids?: readonly string[];
}): NamedSystemGate & { unverified: string[]; removed: string[] } {
  const unverified = input.current_ids.filter((id) => !input.previous_ids.includes(id));
  const removed = input.previous_ids.filter((id) => !input.current_ids.includes(id));
  const staleGreen = (input.previous_pass_ids ?? []).filter((id) => unverified.includes(id));
  return {
    gate: VENTURE_QC_MANIFEST_DIFF_GATE,
    result: unverified.length === 0 && staleGreen.length === 0 ? "PASS" : "FAIL",
    reasons: [
      ...unverified.map((id) => `NEW_CAPABILITY_UNVERIFIED:${id}`),
      ...removed.map((id) => `REMOVED_CAPABILITY:${id}`),
    ],
    unverified,
    removed,
  };
}

export function invalidateAffectedQcOnNewCapability(input: {
  new_capability: string;
  affected: readonly string[];
}): Record<string, "UNVERIFIED"> {
  return Object.fromEntries(input.affected.map((id) => [id, "UNVERIFIED" as const]));
}

export function evaluateCustomerWorkflowDeadEndGate(input: {
  states: readonly { id: string; next_required: boolean; next_present: boolean }[];
  resultAccess?: { generated: boolean; accessPresent: boolean; accessDiscoverable: boolean };
}): NamedSystemGate {
  const dead = input.states.filter((row) => row.next_required && !row.next_present);
  const reasons = dead.map((row) => `DEAD_END:${row.id}`);
  if (input.resultAccess?.generated && !input.resultAccess.accessPresent) {
    reasons.push("RESULT_ACCESS_MISSING");
  }
  if (input.resultAccess?.generated && !input.resultAccess.accessDiscoverable) {
    reasons.push("RESULT_ACCESS_OBSCURE");
  }
  return {
    gate: CUSTOMER_WORKFLOW_DEAD_END_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateOrphanedCustomerRouteGate(input: {
  capability_routes: readonly string[];
  reachable: readonly string[];
  documented: readonly string[];
  existing: readonly string[];
}): NamedSystemGate {
  const reasons: string[] = [];
  for (const route of input.capability_routes) {
    if (!input.reachable.includes(route)) reasons.push(`UNREACHABLE:${route}`);
  }
  for (const route of input.documented) {
    if (!input.existing.includes(route)) reasons.push(`DOCUMENTED_ABSENT:${route}`);
  }
  return { gate: ORPHANED_CUSTOMER_ROUTE_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureInternalLinkQCGate(input: {
  links: readonly { href: string; status: number | null; preview_leak?: boolean }[];
}): NamedSystemGate {
  const reasons: string[] = [];
  for (const link of input.links) {
    if (link.status === 404) reasons.push(`DEAD_LINK:${link.href}`);
    if (link.preview_leak) reasons.push(`PREVIEW_LEAK:${link.href}`);
    if (link.href.includes("vercel.app") && !link.href.includes("occupancynpv.com")) reasons.push(`WRONG_DOMAIN:${link.href}`);
  }
  return { gate: VENTURE_INTERNAL_LINK_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateCustomerButtonQCGate(input: {
  visible: boolean;
  clipped: boolean;
  styled: boolean;
  accessible_name: boolean;
  clickable: boolean;
  action_ok: boolean;
  console_ok: boolean;
  network_ok: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.visible) reasons.push("NOT_VISIBLE");
  if (input.clipped) reasons.push("CLIPPED");
  if (!input.styled) reasons.push("UNSTYLED");
  if (!input.accessible_name) reasons.push("NO_ACCESSIBLE_NAME");
  if (!input.clickable) reasons.push("NOT_CLICKABLE");
  if (!input.action_ok) reasons.push("ACTION_FAILED");
  if (!input.console_ok) reasons.push("CONSOLE_FAILURE");
  if (!input.network_ok) reasons.push("NETWORK_FAILURE");
  return { gate: CUSTOMER_BUTTON_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function hqMaterialSurfaces(): string[] {
  return [
    "login",
    "/dashboard",
    "HQ Command",
    "status strip",
    "Operating Floor",
    ...ALL_HQ_ROOM_IDS.map((id) => ROOM_DISPLAY_NAMES[id].displayName),
    "venture navigation",
    "venture detail",
    "QC detail",
    "financial state",
    "runtime state",
  ];
}

export function coverageDimensions(input: Record<CoverageDimension, AccountedStatus>): Record<CoverageDimension, AccountedStatus> {
  return input;
}

export function fullQcRequiresCompleteAccounting(input: {
  material: number;
  pass: number;
  fail: number;
  na: number;
  unknown: number;
}): boolean {
  return input.unknown === 0 && input.pass + input.fail + input.na === input.material;
}
