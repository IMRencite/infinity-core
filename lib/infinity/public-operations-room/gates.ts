import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  evaluatePublicProjectionNoSensitiveDataGate,
  evaluatePublicProjectionReadOnlyGate,
  evaluatePublicVentureVisibilityGate,
  PUBLIC_OPERATIONS_SURFACE,
} from "@/lib/infinity/public-operations-projection";
import type { NamedPublicGate, PublicOperationsProjection } from "@/lib/infinity/public-operations-projection/types";
import {
  PUBLIC_OPERATIONS_ROOM_ENDPOINT,
  PUBLIC_OPERATIONS_ROOM_FORBIDDEN_FETCHES,
  PUBLIC_UI_FORBIDDEN_IMPORTS,
} from "./contract";
import { agentMotion, formatPublicCount, isUnknownCount } from "./format";

function pass(gate: string, reason: string): NamedPublicGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedPublicGate {
  return { gate, result: "FAIL", reasons };
}

export const PUBLIC_OPERATIONS_ROOM_DATA_BOUNDARY_GATE = "PublicOperationsRoomDataBoundaryGate" as const;
export const PUBLIC_OPERATIONS_ROOM_TRUTH_GATE = "PublicOperationsRoomTruthGate" as const;
export const PUBLIC_OPERATIONS_ROOM_DOM_PRIVACY_GATE = "PublicOperationsRoomDOMPrivacyGate" as const;
export const PUBLIC_OPERATIONS_ROOM_NETWORK_BOUNDARY_GATE = "PublicOperationsRoomNetworkBoundaryGate" as const;
export const PUBLIC_AGENT_ANIMATION_TRUTH_GATE = "PublicAgentAnimationTruthGate" as const;
export const PUBLIC_OPERATIONS_RESPONSIVE_GATE = "PublicOperationsResponsiveGate" as const;
export const PUBLIC_OPERATIONS_ACCESSIBILITY_GATE = "PublicOperationsAccessibilityGate" as const;
export const PUBLIC_OPERATIONS_BROWSER_RUNTIME_GATE = "PublicOperationsBrowserRuntimeGate" as const;

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, acc);
    else if (/\.(ts|tsx|css)$/.test(entry.name)) acc.push(path);
  }
  return acc;
}

export function publicOperationsRoomUiFiles(cwd = process.cwd()): string[] {
  return [
    ...walkFiles(join(cwd, "components/public/operations-room")),
    ...walkFiles(join(cwd, "app/public/operations-room")),
    ...walkFiles(join(cwd, "app/public/privacy")),
    ...walkFiles(join(cwd, "app/public/terms")),
  ];
}

export function publicOperationsRoomSourceFiles(cwd = process.cwd()): string[] {
  return [
    ...publicOperationsRoomUiFiles(cwd),
    ...walkFiles(join(cwd, "lib/infinity/public-operations-room")).filter((path) => !path.includes("__tests__") && !path.endsWith("gates.ts")),
  ];
}

export function evaluatePublicOperationsRoomDataBoundaryGate(input?: { sources?: string[] }): NamedPublicGate {
  const sources = input?.sources ?? publicOperationsRoomSourceFiles().map((path) => readFileSync(path, "utf8"));
  const reasons: string[] = [];
  for (const source of sources) {
    for (const forbidden of PUBLIC_UI_FORBIDDEN_IMPORTS) {
      if (source.includes(forbidden) && /from ["']|require\(/.test(source)) {
        const importHit = source.split("\n").some((line) => line.includes("from ") && line.includes(forbidden));
        if (importHit) reasons.push(`PRIVATE_IMPORT:${forbidden}`);
      }
    }
  }
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_ROOM_DATA_BOUNDARY_GATE, [...new Set(reasons)])
    : pass(PUBLIC_OPERATIONS_ROOM_DATA_BOUNDARY_GATE, "PUBLIC_TYPES_ONLY");
}

export function evaluatePublicOperationsRoomNetworkBoundaryGate(input?: { sources?: string[] }): NamedPublicGate {
  const ui = (input?.sources ?? publicOperationsRoomUiFiles().map((path) => readFileSync(path, "utf8"))).join("\n");
  const reasons: string[] = [];
  if (!ui.includes("PUBLIC_OPERATIONS_ROOM_ENDPOINT") && !ui.includes(PUBLIC_OPERATIONS_ROOM_ENDPOINT)) {
    reasons.push("PUBLIC_ENDPOINT_MISSING");
  }
  for (const forbidden of PUBLIC_OPERATIONS_ROOM_FORBIDDEN_FETCHES) {
    if (ui.includes(forbidden)) reasons.push(`PRIVATE_FETCH:${forbidden}`);
  }
  if (/new EventSource/.test(ui)) reasons.push("PRIVATE_SSE");
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_ROOM_NETWORK_BOUNDARY_GATE, reasons)
    : pass(PUBLIC_OPERATIONS_ROOM_NETWORK_BOUNDARY_GATE, "PUBLIC_ENDPOINT_ONLY");
}

export function evaluatePublicOperationsRoomDOMPrivacyGate(markup: string): NamedPublicGate {
  const reasons: string[] = [];
  if (/john@|@[a-z0-9.-]+\.[a-z]{2,}/i.test(markup) && !/imros\.io|occupancynpv\.com|infinitemediaresources\.com/.test(markup)) {
    reasons.push("CUSTOMER_OR_EMAIL");
  }
  if (/john@example\.com|cus_|sk_live|Bearer |C:\\Users\\|BUILD_ID|pid:\s*\d+/.test(markup)) {
    reasons.push("SENSITIVE_PATTERN");
  }
  if (/AskReview|First Outbound Validation|spend authority|Verified Cash|\$50\b/i.test(markup)) {
    reasons.push("PRIVATE_BUSINESS_DETAIL");
  }
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_ROOM_DOM_PRIVACY_GATE, reasons)
    : pass(PUBLIC_OPERATIONS_ROOM_DOM_PRIVACY_GATE, "DOM_PUBLIC_SAFE");
}

export function evaluatePublicOperationsRoomTruthGate(input: {
  renderedActive: string;
  renderedIdle: string;
  renderedUnknown?: string;
  projection: PublicOperationsProjection;
  loadingHasNumericFake?: boolean;
}): NamedPublicGate {
  const reasons: string[] = [];
  if (input.renderedActive !== String(input.projection.active_public_agents)) reasons.push("ACTIVE_MISMATCH");
  if (input.renderedIdle !== String(input.projection.idle_public_agents)) reasons.push("IDLE_MISMATCH");
  if (input.loadingHasNumericFake) reasons.push("FAKE_LOADING_METRIC");
  if (input.renderedUnknown && isUnknownCount(input.projection.autonomous_operating_hours) && input.renderedUnknown === "0") {
    reasons.push("UNKNOWN_RENDERED_ZERO");
  }
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_ROOM_TRUTH_GATE, reasons)
    : pass(PUBLIC_OPERATIONS_ROOM_TRUTH_GATE, "COUNTS_MATCH_PROJECTION");
}

export function evaluatePublicAgentAnimationTruthGate(input: {
  agentStatus: "ACTIVE" | "IDLE";
  motion: ReturnType<typeof agentMotion>;
}): NamedPublicGate {
  const expected = agentMotion(input.agentStatus);
  if (input.motion !== expected) {
    return fail(PUBLIC_AGENT_ANIMATION_TRUTH_GATE, [`MOTION_${input.motion}_FOR_${input.agentStatus}`]);
  }
  if (input.agentStatus === "IDLE" && input.motion === "working") {
    return fail(PUBLIC_AGENT_ANIMATION_TRUTH_GATE, ["IDLE_ANIMATED_AS_WORKING"]);
  }
  return pass(PUBLIC_AGENT_ANIMATION_TRUTH_GATE, "MOTION_MATCHES_STATUS");
}

export function evaluatePublicOperationsResponsiveGate(input: {
  desktopFloor: boolean;
  tabletSpatial: boolean;
  mobileCards: boolean;
  mobileUsesDesktopFloor: boolean;
}): NamedPublicGate {
  const reasons: string[] = [];
  if (!input.desktopFloor) reasons.push("DESKTOP_FLOOR_MISSING");
  if (!input.tabletSpatial) reasons.push("TABLET_SPATIAL_MISSING");
  if (!input.mobileCards) reasons.push("MOBILE_CARDS_MISSING");
  if (input.mobileUsesDesktopFloor) reasons.push("MOBILE_USES_DESKTOP_FLOOR");
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_RESPONSIVE_GATE, reasons)
    : pass(PUBLIC_OPERATIONS_RESPONSIVE_GATE, "VIEWPORTS_SEPARATED");
}

export function evaluatePublicOperationsAccessibilityGate(input: {
  hasHeadings: boolean;
  hasTextEquivalents: boolean;
  reducedMotion: boolean;
  ariaLive: boolean;
}): NamedPublicGate {
  const reasons: string[] = [];
  if (!input.hasHeadings) reasons.push("HEADINGS_MISSING");
  if (!input.hasTextEquivalents) reasons.push("TEXT_EQUIVALENTS_MISSING");
  if (!input.reducedMotion) reasons.push("REDUCED_MOTION_MISSING");
  if (!input.ariaLive) reasons.push("ARIA_LIVE_MISSING");
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_ACCESSIBILITY_GATE, reasons)
    : pass(PUBLIC_OPERATIONS_ACCESSIBILITY_GATE, "A11Y_CONTRACT");
}

export function evaluatePublicOperationsBrowserRuntimeGate(input: {
  overflow: boolean;
  consoleErrors: string[];
  privateRequests: string[];
}): NamedPublicGate {
  const reasons: string[] = [];
  if (input.overflow) reasons.push("HORIZONTAL_OVERFLOW");
  if (input.consoleErrors.length) reasons.push("CONSOLE_ERRORS");
  if (input.privateRequests.length) reasons.push(...input.privateRequests.map((row) => `PRIVATE_REQUEST:${row}`));
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_BROWSER_RUNTIME_GATE, reasons)
    : pass(PUBLIC_OPERATIONS_BROWSER_RUNTIME_GATE, "BROWSER_SAFE");
}

export function evaluatePublicOperationsRoomPrivacyBundle(projection: PublicOperationsProjection): NamedPublicGate[] {
  return [
    evaluatePublicProjectionNoSensitiveDataGate(projection),
    evaluatePublicProjectionReadOnlyGate({
      allowedMethods: [...PUBLIC_OPERATIONS_SURFACE.methods],
      mutationCapable: PUBLIC_OPERATIONS_SURFACE.mutationCapable,
      createMission: PUBLIC_OPERATIONS_SURFACE.createMission,
      triggerTick: PUBLIC_OPERATIONS_SURFACE.triggerTick,
      sendOutreach: PUBLIC_OPERATIONS_SURFACE.sendOutreach,
      deploy: PUBLIC_OPERATIONS_SURFACE.deploy,
      mutateFinance: PUBLIC_OPERATIONS_SURFACE.mutateFinance,
      mutateProvider: PUBLIC_OPERATIONS_SURFACE.mutateProvider,
    }),
    evaluatePublicVentureVisibilityGate({
      projection,
      hiddenNames: ["AskReview"],
      askReviewExposed: projection.public_ventures.some((row) => /askreview/i.test(row.public_name)),
      defaultVisibility: "HIDDEN",
    }),
  ];
}

void formatPublicCount;
