import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NamedPublicGate } from "@/lib/infinity/public-operations-projection/types";
import { publicOperationsRoomUiFiles } from "./gates";

function pass(gate: string, reason: string): NamedPublicGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedPublicGate {
  return { gate, result: "FAIL", reasons };
}

export const PUBLIC_HOMEPAGE_VISUAL_SOPHISTICATION_GATE = "PublicHomepageVisualSophisticationGate" as const;
export const ARCHITECTURAL_VISUAL_INTENT_GATE = "ArchitecturalVisualIntentGate" as const;
export const BRAND_EXPERIENCE_QUALITY_GATE = "BrandExperienceQualityGate" as const;
export const FOUNDER_VISUAL_ACCEPTANCE_GATE = "FounderVisualAcceptanceGate" as const;
export const PUBLIC_OVERHEAD_ROOM_COMPOSITION_GATE = "PublicOverheadRoomCompositionGate" as const;
export const PUBLIC_OPERATIONS_THREE_COLUMN_LAYOUT_GATE = "PublicOperationsThreeColumnLayoutGate" as const;
export const PUBLIC_AGENT_PRESENCE_PROMINENCE_GATE = "PublicAgentPresenceProminenceGate" as const;
export const PUBLIC_ACTIVE_ROOM_VISUAL_RESPONSE_GATE = "PublicActiveRoomVisualResponseGate" as const;
export const PUBLIC_HQ_PALETTE_CONSISTENCY_GATE = "PublicHQPaletteConsistencyGate" as const;
export const PUBLIC_FUTURISTIC_GRID_BACKGROUND_GATE = "PublicFuturisticGridBackgroundGate" as const;
export const PUBLIC_FULL_WIDTH_OPERATIONS_EXPERIENCE_GATE = "PublicFullWidthOperationsExperienceGate" as const;
export const PUBLIC_IDLE_AGENT_PRESENCE_GATE = "PublicIdleAgentPresenceGate" as const;
export const PUBLIC_IMR_BRAND_MARK_GATE = "PublicImrBrandMarkGate" as const;
export const PUBLIC_OPERATIONS_FLOOR_LAYOUT_GATE = "PublicOperationsFloorLayoutGate" as const;

export type FounderVisualAcceptanceResult = {
  gate: typeof FOUNDER_VISUAL_ACCEPTANCE_GATE;
  result: "PASS" | "FAIL" | "PENDING_FOUNDER_REVIEW";
  reasons: string[];
};

function joinedUi(cwd = process.cwd()): string {
  return publicOperationsRoomUiFiles(cwd).map((path) => readFileSync(path, "utf8")).join("\n");
}

function cssSource(cwd = process.cwd()): string {
  return readFileSync(join(cwd, "components/public/operations-room/operations-room.module.css"), "utf8");
}

export function evaluatePublicHomepageVisualSophisticationGate(cwd = process.cwd()): NamedPublicGate {
  const ui = joinedUi(cwd);
  const css = cssSource(cwd);
  const reasons: string[] = [];
  if (!ui.includes("data-public-operations-building")) reasons.push("NO_BUILDING_SURFACE");
  if (!css.includes("repeat(3, minmax(0, 1fr))") && !ui.includes('data-building-columns="3"')) {
    reasons.push("NARROW_OR_LINEAR_DASHBOARD");
  }
  if (!css.includes("roomInterior") && !ui.includes("data-room-interior")) reasons.push("EMPTY_ROOM_INTERIORS");
  if (!css.includes(".node") || !/width:\s*1\.[3-9]/.test(css)) reasons.push("AGENTS_NOT_PROMINENT");
  if (!css.includes(".working") || !css.includes("0 0 42px")) reasons.push("ACTIVE_ROOMS_DO_NOT_GLOW");
  if (!css.includes(".workTable") && !css.includes("data-work-table")) reasons.push("EMPTY_ROOM_INTERIORS");
  if (!css.includes("background-size") || !css.includes("44px 44px")) reasons.push("BACKGROUND_LACKS_HQ_GRID");
  if (!css.includes("rgba(56, 189, 248, 0.12)") && !css.includes("rgba(125, 211, 252, 0.14)")) {
    reasons.push("BACKGROUND_LACKS_HQ_GRID");
  }
  if (!ui.includes("data-public-sales-floor")) reasons.push("SALES_FLOOR_DISCONNECTED");
  if (ui.includes("Basic status dashboard") || ui.includes("server-status")) reasons.push("ADMIN_DASHBOARD_COPY");
  if (css.includes("width: min(1440px") && !css.includes("96vw") && !css.includes("94vw")) {
    reasons.push("NARROW_CONTENT_COLUMN");
  }
  return reasons.length
    ? fail(PUBLIC_HOMEPAGE_VISUAL_SOPHISTICATION_GATE, reasons)
    : pass(PUBLIC_HOMEPAGE_VISUAL_SOPHISTICATION_GATE, "FULL_WIDTH_OVERHEAD_HQ");
}

export function evaluateArchitecturalVisualIntentGate(cwd = process.cwd()): NamedPublicGate {
  const ui = joinedUi(cwd);
  const css = cssSource(cwd);
  const reasons: string[] = [];
  if (!ui.includes("data-public-floor")) reasons.push("FLOORS_MISSING");
  if (!ui.includes("data-department-id") || !ui.includes('data-room-composition="overhead"')) reasons.push("ROOMS_MISSING");
  if (!ui.includes("data-public-agent-id")) reasons.push("AGENTS_MISSING");
  if (!css.includes(".orb")) reasons.push("LIVE_WORK_ORBS_MISSING");
  if (!css.includes("perspective") && !css.includes("box-shadow")) reasons.push("DEPTH_MISSING");
  if (!ui.includes("data-public-sales-floor")) reasons.push("SALES_FLOOR_MISSING");
  if (!ui.includes("data-sales-room-id")) reasons.push("SALES_ROOMS_MISSING");
  if (!ui.includes("data-work-station")) reasons.push("WORK_STATIONS_MISSING");
  return reasons.length
    ? fail(ARCHITECTURAL_VISUAL_INTENT_GATE, reasons)
    : pass(ARCHITECTURAL_VISUAL_INTENT_GATE, "FLOORS_ROOMS_AGENTS_ORBS_PRESENT");
}

export function evaluateBrandExperienceQualityGate(cwd = process.cwd()): NamedPublicGate {
  const ui = joinedUi(cwd);
  const css = cssSource(cwd);
  const reasons: string[] = [];
  if (!/Autonomous Venture Operations/i.test(ui)) reasons.push("AUTONOMOUS_LANGUAGE_MISSING");
  if (!css.includes("#030711") && !css.includes("#050814")) reasons.push("MIDNIGHT_PALETTE_MISSING");
  if (!css.includes("#7dd3fc") && !css.includes("#38bdf8")) reasons.push("CYAN_ACCENT_MISSING");
  if (!/headquarters|operations building|digital headquarters/i.test(ui + css)) reasons.push("HQ_BRAND_LANGUAGE_MISSING");
  if (/comic sans|neon everywhere|cyberpunk overload|arcade/i.test(ui + css)) reasons.push("CHEAP_VISUAL_LANGUAGE");
  if (!ui.includes("data-imr-brand-mark") || !ui.includes("/brand/imr-mark.png")) {
    reasons.push("IMR_BRAND_MARK_MISSING");
  }
  return reasons.length
    ? fail(BRAND_EXPERIENCE_QUALITY_GATE, reasons)
    : pass(BRAND_EXPERIENCE_QUALITY_GATE, "PREMIUM_OPERATING_HQ");
}

export function evaluatePublicOverheadRoomCompositionGate(cwd = process.cwd()): NamedPublicGate {
  const ui = joinedUi(cwd);
  const css = cssSource(cwd);
  const reasons: string[] = [];
  if (!ui.includes('data-room-composition="overhead"')) reasons.push("OVERHEAD_MARK_MISSING");
  if (!css.includes(".wall") && !css.includes(".corner")) reasons.push("PERIMETER_MISSING");
  if (!css.includes(".floorPlate") && !ui.includes("data-room-floor")) reasons.push("FLOOR_MISSING");
  if (!ui.includes("data-work-station") || (!ui.includes("data-work-table") && !css.includes(".workTable"))) {
    reasons.push("WORK_ZONE_MISSING");
  }
  if (!ui.includes("data-public-agent-id")) reasons.push("AGENT_PLACEMENT_MISSING");
  if (!css.includes(".working") || !ui.includes("data-active-glow")) reasons.push("STATE_REACTIVE_MISSING");
  if (!css.includes(".roomInterior")) reasons.push("TITLE_TEXT_BORDER_ONLY");
  return reasons.length
    ? fail(PUBLIC_OVERHEAD_ROOM_COMPOSITION_GATE, reasons)
    : pass(PUBLIC_OVERHEAD_ROOM_COMPOSITION_GATE, "OVERHEAD_ROOMS_COMPOSED");
}

export function evaluatePublicOperationsThreeColumnLayoutGate(cwd = process.cwd()): NamedPublicGate {
  const ui = joinedUi(cwd);
  const css = cssSource(cwd);
  if (ui.includes('data-building-columns="3"') && css.includes("repeat(3, minmax(0, 1fr))")) {
    return pass(PUBLIC_OPERATIONS_THREE_COLUMN_LAYOUT_GATE, "DESKTOP_THREE_COLUMN");
  }
  return fail(PUBLIC_OPERATIONS_THREE_COLUMN_LAYOUT_GATE, ["THREE_COLUMN_DESKTOP_MISSING"]);
}

export function evaluatePublicAgentPresenceProminenceGate(cwd = process.cwd()): NamedPublicGate {
  const css = cssSource(cwd);
  const ui = joinedUi(cwd);
  const reasons: string[] = [];
  if (!ui.includes('data-agent-prominence="high"')) reasons.push("PROMINENCE_MARK_MISSING");
  if (!/width:\s*1\.[3-9]/.test(css) && !/width:\s*2[0-8]px/.test(css)) reasons.push("AGENT_NODE_TOO_SMALL");
  if (!css.includes("box-shadow: 0 0 0 4px") && !css.includes("box-shadow: 0 0 0 5px")) reasons.push("AGENT_HALO_MISSING");
  return reasons.length
    ? fail(PUBLIC_AGENT_PRESENCE_PROMINENCE_GATE, reasons)
    : pass(PUBLIC_AGENT_PRESENCE_PROMINENCE_GATE, "AGENTS_VISUALLY_DETECTABLE");
}

export function evaluatePublicActiveRoomVisualResponseGate(cwd = process.cwd()): NamedPublicGate {
  const css = cssSource(cwd);
  const ui = joinedUi(cwd);
  const reasons: string[] = [];
  if (!ui.includes("data-active-glow")) reasons.push("ACTIVE_GLOW_MARK_MISSING");
  if (!css.includes("#e879f9") && !css.includes("rgba(232, 121, 249")) reasons.push("ACTIVE_LIGHTING_MISSING");
  if (!css.includes("patrol") && !css.includes("travel")) reasons.push("ACTIVE_MOTION_MISSING");
  if (!css.includes("prefers-reduced-motion")) reasons.push("REDUCED_MOTION_MISSING");
  return reasons.length
    ? fail(PUBLIC_ACTIVE_ROOM_VISUAL_RESPONSE_GATE, reasons)
    : pass(PUBLIC_ACTIVE_ROOM_VISUAL_RESPONSE_GATE, "ACTIVE_GLOW_AND_MOTION");
}

export function evaluatePublicHQPaletteConsistencyGate(cwd = process.cwd()): NamedPublicGate {
  const css = cssSource(cwd);
  const reasons: string[] = [];
  if (!css.includes("#030711") && !css.includes("#050814")) reasons.push("NAVY_MISSING");
  if (!css.includes("#38bdf8") && !css.includes("#2563eb")) reasons.push("ELECTRIC_BLUE_MISSING");
  if (!css.includes("#7dd3fc")) reasons.push("CYAN_MISSING");
  if (!css.includes("#f8fbff") && !css.includes("#e8f1ff")) reasons.push("SOFT_WHITE_MISSING");
  if (/#22c55e|#10b981|limegreen/i.test(css)) reasons.push("GREEN_HEAVY");
  return reasons.length
    ? fail(PUBLIC_HQ_PALETTE_CONSISTENCY_GATE, reasons)
    : pass(PUBLIC_HQ_PALETTE_CONSISTENCY_GATE, "HQ_PALETTE");
}

export function evaluatePublicFuturisticGridBackgroundGate(cwd = process.cwd()): NamedPublicGate {
  const css = cssSource(cwd);
  const ui = joinedUi(cwd);
  const reasons: string[] = [];
  if (!ui.includes('data-hq-grid="true"')) reasons.push("GRID_MARK_MISSING");
  if (!css.includes("44px 44px") && !css.includes("48px 48px")) reasons.push("GRID_TEXTURE_MISSING");
  if (!css.includes("radial-gradient")) reasons.push("AMBIENT_GLOW_MISSING");
  if (!css.includes("perspective")) reasons.push("DEPTH_MISSING");
  return reasons.length
    ? fail(PUBLIC_FUTURISTIC_GRID_BACKGROUND_GATE, reasons)
    : pass(PUBLIC_FUTURISTIC_GRID_BACKGROUND_GATE, "GRID_DEPTH_GLOW");
}

export function evaluatePublicFullWidthOperationsExperienceGate(cwd = process.cwd()): NamedPublicGate {
  const css = cssSource(cwd);
  const ui = joinedUi(cwd);
  const reasons: string[] = [];
  if (!ui.includes('data-full-width="true"')) reasons.push("FULL_WIDTH_MARK_MISSING");
  if (!css.includes("96vw") && !css.includes("94vw")) reasons.push("VIEWPORT_WIDTH_MISSING");
  if (css.includes("width: min(1440px") && !/9[046]vw/.test(css)) reasons.push("NARROW_CENTERED_DASHBOARD");
  return reasons.length
    ? fail(PUBLIC_FULL_WIDTH_OPERATIONS_EXPERIENCE_GATE, reasons)
    : pass(PUBLIC_FULL_WIDTH_OPERATIONS_EXPERIENCE_GATE, "IMMERSIVE_WIDTH");
}

export function evaluatePublicIdleAgentPresenceGate(cwd = process.cwd()): NamedPublicGate {
  const css = cssSource(cwd);
  const ui = joinedUi(cwd);
  const reasons: string[] = [];
  if (!ui.includes('data-agent-presence="ready"') && !ui.includes("data-agent-presence={presence}")) {
    reasons.push("IDLE_PRESENCE_MARK_MISSING");
  }
  if (!ui.includes("data-idle-presence") && !css.includes("idlePresence")) reasons.push("IDLE_PRESENCE_MOTION_MISSING");
  if (!css.includes("idlePresence")) reasons.push("IDLE_DRIFT_MISSING");
  if (!css.includes("idleScan") && !css.includes("idleArc")) reasons.push("IDLE_RING_OR_ARC_MISSING");
  const idleBlock = css.match(/\.idle \.node,\s*\.node\.idle \{[\s\S]*?\}/);
  if (idleBlock && /patrol|travel/.test(idleBlock[0])) reasons.push("IDLE_USES_ACTIVE_PATH");
  const idleOrb = css.match(/\.idle \.orb[\s\S]{0,80}/)?.[0] ?? "";
  if (/animation:\s*travel/.test(idleOrb)) reasons.push("IDLE_WORK_ORB_PATH");
  if (!css.includes("prefers-reduced-motion")) reasons.push("REDUCED_MOTION_MISSING");
  if (!css.includes("agentPresence") && !ui.includes("agentPresence") && !ui.includes("data-agent-presence")) {
    reasons.push("PRESENCE_NOT_PUBLIC_STATE_DRIVEN");
  }
  if (css.includes(".idle .node.working") || css.includes(".node.idle.working")) reasons.push("IDLE_FAKE_ACTIVE");
  return reasons.length
    ? fail(PUBLIC_IDLE_AGENT_PRESENCE_GATE, reasons)
    : pass(PUBLIC_IDLE_AGENT_PRESENCE_GATE, "IDLE_READY_NOT_EXECUTING");
}

function pngHasAlpha(path: string): boolean {
  if (!existsSync(path)) return false;
  const bytes = readFileSync(path);
  if (bytes.length < 26) return false;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return isPng && (bytes[25] === 6 || bytes[25] === 4);
}

export function evaluatePublicImrBrandMarkGate(cwd = process.cwd()): NamedPublicGate {
  const ui = joinedUi(cwd);
  const markCss = existsSync(join(cwd, "components/public/operations-room/imr-brand-mark.module.css"))
    ? readFileSync(join(cwd, "components/public/operations-room/imr-brand-mark.module.css"), "utf8")
    : "";
  const live = existsSync(join(cwd, "components/public/operations-room/live-operations-room.tsx"))
    ? readFileSync(join(cwd, "components/public/operations-room/live-operations-room.tsx"), "utf8")
    : "";
  const legal = existsSync(join(cwd, "components/public/legal/legal-shell.tsx"))
    ? readFileSync(join(cwd, "components/public/legal/legal-shell.tsx"), "utf8")
    : "";
  const asset = join(cwd, "public/brand/imr-mark.png");
  const reasons: string[] = [];
  if (!existsSync(asset)) reasons.push("IMR_MARK_ASSET_MISSING");
  if (!pngHasAlpha(asset)) reasons.push("IMR_MARK_NOT_TRANSPARENT");
  if (!ui.includes("data-imr-brand-mark") || !ui.includes("/brand/imr-mark.png")) reasons.push("IMR_MARK_NOT_RENDERED");
  if (!live.includes("ImrBrandMark")) reasons.push("HOMEPAGE_MARK_MISSING");
  if (!legal.includes("ImrBrandMark")) reasons.push("LEGAL_MARK_MISSING");
  if (!/position:\s*(fixed|absolute)/.test(markCss) || !markCss.includes("right:")) reasons.push("MARK_NOT_TOP_RIGHT");
  if (!markCss.includes("background: transparent")) reasons.push("MARK_BOX_NOT_TRANSPARENT");
  if (!ui.includes('alt="IMR"') || !ui.includes('aria-label="IMR"')) reasons.push("MARK_ALT_MISSING");
  if (/background:\s*#000|background:\s*black/i.test(markCss)) reasons.push("OPAQUE_BLACK_BOX");
  return reasons.length
    ? fail(PUBLIC_IMR_BRAND_MARK_GATE, reasons)
    : pass(PUBLIC_IMR_BRAND_MARK_GATE, "IMR_MARK_TOP_RIGHT_TRANSPARENT");
}

export function evaluateFounderVisualAcceptanceGate(input?: {
  founderAccepted?: boolean;
  founderRejected?: boolean;
  priorAutomatedPass?: boolean;
}): FounderVisualAcceptanceResult {
  if (input?.founderRejected) {
    return {
      gate: FOUNDER_VISUAL_ACCEPTANCE_GATE,
      result: "FAIL",
      reasons: ["FOUNDER_PHYSICAL_BROWSER_REJECTION_OVERRIDES_AUTOMATED_PASS"],
    };
  }
  if (input?.founderAccepted) {
    return {
      gate: FOUNDER_VISUAL_ACCEPTANCE_GATE,
      result: "PASS",
      reasons: ["FOUNDER_PHYSICAL_BROWSER_ACCEPTED"],
    };
  }
  return {
    gate: FOUNDER_VISUAL_ACCEPTANCE_GATE,
    result: "PENDING_FOUNDER_REVIEW",
    reasons: input?.priorAutomatedPass
      ? ["AUTOMATED_PASS_INSUFFICIENT_UNTIL_FOUNDER_RE_REVIEW"]
      : ["FOUNDER_PHYSICAL_REVIEW_REQUIRED"],
  };
}

export function evaluatePublicOperationsFloorLayoutGate(cwd = process.cwd()): NamedPublicGate {
  const ui = joinedUi(cwd);
  const css = cssSource(cwd);
  const reasons: string[] = [];
  if (!ui.includes('data-hq-room={id === "OPERATIONS" ? "true" : "false"}') && !ui.includes('data-hq-room="true"')) {
    reasons.push("HQ_MARK_MISSING");
  }
  if (!/OPERATIONS[\s\S]*RESEARCH/.test(ui)) reasons.push("HQ_NOT_FIRST");
  if (!css.includes("grid-column: 1 / -1") && !css.includes("grid-column: 1/-1")) reasons.push("HQ_NOT_FULL_WIDTH");
  if (!css.includes("repeat(3, minmax(0, 1fr))")) reasons.push("DESKTOP_NOT_THREE_COLUMN");
  if (!css.includes("repeat(2, minmax(0, 1fr))")) reasons.push("TABLET_NOT_TWO_COLUMN");
  if (!/@media \(max-width: 720px\)[\s\S]*grid-template-columns:\s*1fr/.test(css)) reasons.push("MOBILE_NOT_ONE_COLUMN");
  if (!ui.includes('data-room-layout="desktop"') || !ui.includes('data-room-layout="tablet"') || !ui.includes('data-room-layout="mobile"')) {
    reasons.push("RESPONSIVE_FLOORS_MISSING");
  }
  if (!css.includes("overflow-wrap: anywhere") && !css.includes("word-break: break-word")) reasons.push("ROOM_FIT_OVERFLOW");
  if (!css.includes("prefers-reduced-motion")) reasons.push("REDUCED_MOTION_CHANGED");
  if (!css.includes("#e879f9") || !css.includes("#3dffb0") || !css.includes("#7dd3fc")) reasons.push("STATE_COLORS_CHANGED");
  return reasons.length
    ? fail(PUBLIC_OPERATIONS_FLOOR_LAYOUT_GATE, reasons)
    : pass(PUBLIC_OPERATIONS_FLOOR_LAYOUT_GATE, "HQ_FULL_WIDTH_THREE_COLUMN_FLOOR");
}
