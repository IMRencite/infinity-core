export const HQ_NAVIGATION_INTEGRITY_GATE = "HQNavigationIntegrityGate" as const;
export const RENDERED_HQ_CONSOLE_QUALITY_GATE = "RenderedHQConsoleQualityGate" as const;
export const REDUNDANT_NAVIGATION_GATE = "RedundantNavigationGate" as const;

export type HqNavVisibility = "visible" | "placeholder";

export type HqPrimaryNavItem = {
  id: string;
  label: string;
  href: string | null;
  visibility: HqNavVisibility;
  purpose: string;
  allowedAlias?: false;
};

/**
 * One visible primary-nav purpose → one destination.
 * Placeholders have no href and are not Links.
 * Accidental shared href among enabled items is forbidden.
 */
export const HQ_PRIMARY_NAV_ITEMS: HqPrimaryNavItem[] = [
  { id: "hq", label: "HQ", href: "/dashboard", visibility: "visible", purpose: "home operating projection" },
  { id: "founder_ideas", label: "Founder Ideas", href: "/dashboard/founder-ideas", visibility: "visible", purpose: "founder idea lab" },
  { id: "ventures", label: "Ventures", href: "/dashboard/ventures", visibility: "visible", purpose: "venture registry" },
  { id: "portfolio", label: "Portfolio", href: "/dashboard/portfolio", visibility: "visible", purpose: "portfolio scoreboard" },
  { id: "launch_sim", label: "Launch (sim)", href: "/dashboard/launch", visibility: "visible", purpose: "simulation launch lab" },
  { id: "opportunities", label: "Opportunities", href: "/dashboard/opportunities", visibility: "visible", purpose: "canonical opportunity universe" },
  { id: "allocations", label: "Allocations", href: "/dashboard/allocations", visibility: "visible", purpose: "capital allocations" },
  { id: "validation", label: "Validation", href: "/dashboard/validation", visibility: "visible", purpose: "validation queue" },
  { id: "executive", label: "Executive", href: "/dashboard/executive", visibility: "visible", purpose: "executive review" },
  { id: "runtime", label: "Runtime", href: "/dashboard/runtime", visibility: "visible", purpose: "mission runtime scheduler and instances" },
  { id: "operations", label: "Operations", href: "/dashboard/operations", visibility: "visible", purpose: "founder-facing operating observability" },
  { id: "daily_reports", label: "Daily Reports", href: "/dashboard/daily-reports", visibility: "visible", purpose: "founder daily operations briefing" },
  { id: "production_health", label: "HQ Health", href: "/dashboard/production-health", visibility: "visible", purpose: "production health and readiness" },
  { id: "reasoning", label: "Reasoning", href: "/dashboard/reasoning", visibility: "visible", purpose: "reasoning traces" },
  { id: "assets", label: "Assets", href: "/dashboard/assets", visibility: "visible", purpose: "asset inventory" },
  { id: "intelligence", label: "Intelligence", href: "/dashboard/intelligence", visibility: "visible", purpose: "performance intelligence and continuous improvement" },
  { id: "builds", label: "Builds", href: "/dashboard/builds", visibility: "visible", purpose: "build factory" },
  { id: "missions", label: "Missions", href: "/dashboard/missions", visibility: "visible", purpose: "canonical mission list" },
  { id: "activity", label: "Activity", href: "/dashboard/activity", visibility: "visible", purpose: "canonical activity feed" },
  { id: "governance", label: "Governance", href: "/dashboard/governance", visibility: "visible", purpose: "blockers and authorizations" },
  { id: "organizations", label: "Organizations", href: null, visibility: "placeholder", purpose: "org switcher not built" },
  { id: "settings", label: "Settings", href: null, visibility: "placeholder", purpose: "settings not built" },
];

export const HQ_KNOWN_APP_ROUTES = [
  "/dashboard",
  "/dashboard/founder-ideas",
  "/dashboard/ventures",
  "/dashboard/portfolio",
  "/dashboard/launch",
  "/dashboard/opportunities",
  "/dashboard/allocations",
  "/dashboard/validation",
  "/dashboard/executive",
  "/dashboard/runtime",
  "/dashboard/operations",
  "/dashboard/daily-reports",
  "/dashboard/production-health",
  "/dashboard/reasoning",
  "/dashboard/assets",
  "/dashboard/intelligence",
  "/dashboard/builds",
  "/dashboard/missions",
  "/dashboard/activity",
  "/dashboard/governance",
  "/dashboard/onboarding",
  "/dashboard/workspace-unavailable",
] as const;

export function hqNavReactKey(item: HqPrimaryNavItem): string {
  return item.id;
}

export function visiblePrimaryNavItems(): HqPrimaryNavItem[] {
  return HQ_PRIMARY_NAV_ITEMS.filter((item) => item.visibility === "visible" && item.href);
}
