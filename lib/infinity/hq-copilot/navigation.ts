import { ALL_HQ_ROOM_IDS, getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { HqCopilotNavigationAction } from "./types";

export type HqCopilotNavigationTarget = {
  id: string;
  aliases: string[];
  href: (input: { currentVentureId?: string | null }) => string;
  label: string;
  roomId?: DepartmentId;
};

const STATIC_TARGETS: HqCopilotNavigationTarget[] = [
  {
    id: "hq",
    aliases: ["hq", "headquarters", "dashboard", "home", "infinity hq"],
    href: () => "/dashboard",
    label: "Infinity HQ",
  },
  {
    id: "ventures",
    aliases: ["ventures", "venture list", "venture atlas", "atlas"],
    href: () => "/dashboard/ventures",
    label: "Venture Atlas",
  },
  {
    id: "portfolio",
    aliases: ["portfolio", "portfolio command", "top earners"],
    href: () => "/dashboard/portfolio",
    label: "Portfolio",
  },
  {
    id: "validation",
    aliases: ["validation station", "validation", "quality control"],
    href: () => "/dashboard/validation",
    label: "Validation Station",
    roomId: "quality_control",
  },
  {
    id: "launch",
    aliases: ["deployment depot", "launch", "provider readiness", "providers"],
    href: () => "/dashboard/launch",
    label: "Deployment Depot",
    roomId: "launch_operations",
  },
  {
    id: "opportunities",
    aliases: ["venture radar", "opportunities", "opportunity lab"],
    href: () => "/dashboard/opportunities",
    label: "Venture Radar",
    roomId: "opportunity_lab",
  },
  {
    id: "builds",
    aliases: ["builds", "latest build", "creation lab", "product lab"],
    href: () => "/dashboard/builds",
    label: "Creation Lab",
    roomId: "product_lab",
  },
  {
    id: "intelligence",
    aliases: ["signal intelligence", "performance", "intelligence"],
    href: () => "/dashboard/intelligence",
    label: "Signal Intelligence",
    roomId: "intelligence_center",
  },
  {
    id: "executive",
    aliases: ["command", "executive", "command chamber"],
    href: () => "/dashboard/executive",
    label: "Command",
    roomId: "executive_office",
  },
];

const ALLOWED_HREF_PREFIXES = [
  "/dashboard",
  "/dashboard/ventures",
  "/dashboard/portfolio",
  "/dashboard/validation",
  "/dashboard/launch",
  "/dashboard/opportunities",
  "/dashboard/builds",
  "/dashboard/intelligence",
  "/dashboard/executive",
  "/dashboard/reasoning",
] as const;

function isAllowlistedHref(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("://")) return false;
  if (href.includes("\\") || href.includes("..")) return false;
  return ALLOWED_HREF_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`) || href.startsWith(`${prefix}?`));
}

export function listHqCopilotNavigationTargets(): HqCopilotNavigationTarget[] {
  const roomTargets: HqCopilotNavigationTarget[] = ALL_HQ_ROOM_IDS.map((roomId) => {
    const names = getRoomDisplayNames(roomId);
    const existing = STATIC_TARGETS.find((t) => t.roomId === roomId);
    if (existing) return existing;
    return {
      id: `room:${roomId}`,
      aliases: [names.displayName.toLowerCase(), roomId.replaceAll("_", " ")],
      href: ({ currentVentureId }) =>
        currentVentureId ? `/dashboard/ventures/${currentVentureId}?room=${roomId}` : `/dashboard?room=${roomId}`,
      label: names.displayName,
      roomId,
    };
  });
  const seen = new Set<string>();
  const out: HqCopilotNavigationTarget[] = [];
  for (const target of [...STATIC_TARGETS, ...roomTargets]) {
    if (seen.has(target.id)) continue;
    seen.add(target.id);
    out.push(target);
  }
  return out;
}

export function resolveHqCopilotNavigation(
  question: string,
  input: { currentVentureId?: string | null } = {},
): HqCopilotNavigationAction | null {
  const text = question.toLowerCase();
  const targets = listHqCopilotNavigationTargets();
  let best: HqCopilotNavigationTarget | null = null;
  let bestLen = 0;
  for (const target of targets) {
    for (const alias of target.aliases) {
      if (alias.length >= 3 && text.includes(alias) && alias.length > bestLen) {
        best = target;
        bestLen = alias.length;
      }
    }
  }
  if (!best) return null;
  const href = best.href({ currentVentureId: input.currentVentureId ?? null });
  if (!isAllowlistedHref(href)) return null;
  return { type: "NAVIGATE", href, label: best.label };
}

export function sanitizeHqCopilotNavigationHref(href: string): string | null {
  return isAllowlistedHref(href) ? href : null;
}
