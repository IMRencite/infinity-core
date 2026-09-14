import {
  HQ_ACTIVE_GLOW_INVARIANT,
  HQ_ACTIVE_WORKER_VISUAL_GATE,
  HQ_COMMAND_OVERSIGHT_CONTRACT,
  HQ_COMMAND_OVERSIGHT_VISUAL_GATE,
  HQ_INFINITY_SYMBOL_ACTIVITY_GATE,
  HQ_INFINITY_SYMBOL_VISIBILITY_GATE,
  HQ_WORKER_VISUAL_STATE_CONTRACT,
  type HqCommandOversightProjection,
  type HQWorkerVisualStateRecord,
  type NamedGateResult,
  type WorkerVisualInput,
} from "./contract";
import { projectCommandOversight } from "./command";
import { deriveWorkerVisualState, projectWorkerVisualState } from "./workers";

const CANONICAL_INFINITY_PATH =
  "M12 32 C12 14 32 14 50 32 C68 50 88 50 88 32 C88 14 68 14 50 32 C32 50 12 50 12 32";
const INNER_ACTIVE = "#e040fb";
const WORKER_ACTIVE = "#22d3ee";
const WORKER_BLOCKED = "#fbbf24";

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function hexLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

function contrastRatio(foreground: string, background: string): number {
  const left = hexLuminance(foreground);
  const right = hexLuminance(background);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

function energyCss(source: string): string {
  return source
    .split(/\}/)
    .filter((block) => block.includes(".hq-infinity-energy"))
    .join("}\n");
}

export function evaluateHQWorkerVisualStateContract(workers: WorkerVisualInput[]): NamedGateResult {
  const reasons: string[] = [];
  for (const node of workers) {
    const record = projectWorkerVisualState(node);
    if (!record.workerId) reasons.push("WORKER_ID_MISSING");
    if (!record.room) reasons.push(`ROOM_MISSING:${record.workerId}`);
    if (!record.visualState) reasons.push(`VISUAL_STATE_MISSING:${record.workerId}`);
    if (!record.accessibleState) reasons.push(`ACCESSIBLE_STATE_MISSING:${record.workerId}`);
    if (record.glow !== (record.visualState === "ACTIVE")) reasons.push(`GLOW_MISMATCH:${record.workerId}`);
  }
  if (!HQ_ACTIVE_GLOW_INVARIANT.includes("CANONICAL_WORKER_EXECUTING")) reasons.push("INVARIANT_MISSING");
  return {
    gate: HQ_WORKER_VISUAL_STATE_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQActiveWorkerVisualGate(input: {
  workers: WorkerVisualInput[];
  rendered: HQWorkerVisualStateRecord[];
  reducedMotionFallbackPresent: boolean;
}): NamedGateResult {
  const reasons: string[] = [];
  const projected = input.workers.map(projectWorkerVisualState);
  for (const expected of projected) {
    const rendered = input.rendered.find((row) => row.workerId === expected.workerId);
    if (!rendered) {
      reasons.push(`RENDER_MISSING:${expected.workerId}`);
      continue;
    }
    if (expected.visualState === "ACTIVE" && !rendered.glow) reasons.push(`ACTIVE_WITHOUT_GLOW:${expected.workerId}`);
    if (expected.visualState !== "ACTIVE" && rendered.glow) reasons.push(`FALSE_GLOW:${expected.workerId}`);
    if (expected.visualState === "WAITING" && rendered.visualState === "ACTIVE") {
      reasons.push(`WAITING_EQUALS_ACTIVE:${expected.workerId}`);
    }
    if (expected.visualState === "BLOCKED" && rendered.visualState === "ACTIVE") {
      reasons.push(`BLOCKED_EQUALS_ACTIVE:${expected.workerId}`);
    }
    if (!rendered.accessibleState) reasons.push(`STATE_LABEL_ABSENT:${expected.workerId}`);
    if (rendered.visualState !== expected.visualState) reasons.push(`UI_CANONICAL_DISAGREE:${expected.workerId}`);
  }
  if (!input.reducedMotionFallbackPresent) reasons.push("REDUCED_MOTION_FALLBACK_MISSING");
  return {
    gate: HQ_ACTIVE_WORKER_VISUAL_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQCommandOversightContract(input: {
  workers: WorkerVisualInput[];
  systemState?: string | null;
  waitingWork?: boolean;
}): NamedGateResult & { projection: HqCommandOversightProjection } {
  const projection = projectCommandOversight(input);
  const reasons: string[] = [];
  if (projection.activeWorkerCount > 0 && projection.commandState !== "ACTIVE_OVERSIGHT") {
    reasons.push("ACTIVE_WORKERS_WITHOUT_OVERSIGHT");
  }
  if (projection.activeWorkerCount === 0 && projection.commandState === "ACTIVE_OVERSIGHT") {
    reasons.push("OVERSIGHT_WITHOUT_ACTIVE_WORKERS");
  }
  if (projection.infinityState === "ACTIVE" && projection.commandState !== "ACTIVE_OVERSIGHT") {
    reasons.push("INFINITY_ACTIVE_WITHOUT_OVERSIGHT");
  }
  return {
    gate: HQ_COMMAND_OVERSIGHT_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    projection,
  };
}

export function evaluateHQCommandOversightVisualGate(input: {
  workers: WorkerVisualInput[];
  renderedCommandState: string;
  systemState?: string | null;
  waitingWork?: boolean;
}): NamedGateResult {
  const expected = projectCommandOversight(input);
  const reasons: string[] = [];
  if (expected.activeWorkerCount > 0 && input.renderedCommandState !== "ACTIVE_OVERSIGHT") {
    reasons.push("ACTIVE_WORKER_COMMAND_INACTIVE");
  }
  if (expected.activeWorkerCount === 0 && input.renderedCommandState === "ACTIVE_OVERSIGHT") {
    reasons.push("COMMAND_ACTIVE_WITHOUT_EXECUTION");
  }
  if (input.renderedCommandState !== expected.commandState) {
    reasons.push(`COMMAND_VISUAL_DISAGREE:${input.renderedCommandState}:${expected.commandState}`);
  }
  return {
    gate: HQ_COMMAND_OVERSIGHT_VISUAL_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQInfinitySymbolActivityGate(input: {
  workers: WorkerVisualInput[];
  renderedInfinityState: string;
  reducedMotionFallbackPresent: boolean;
  systemState?: string | null;
  waitingWork?: boolean;
}): NamedGateResult {
  const expected = projectCommandOversight(input);
  const reasons: string[] = [];
  if (expected.commandState === "ACTIVE_OVERSIGHT" && input.renderedInfinityState !== "ACTIVE") {
    reasons.push("COMMAND_ACTIVE_SYMBOL_INACTIVE");
  }
  if (
    (expected.commandState === "WAITING" || expected.commandState === "WAITING_FOR_EVIDENCE")
    && input.renderedInfinityState === "ACTIVE"
  ) {
    reasons.push("WAITING_USES_ACTIVE_PULSE");
  }
  if (expected.commandState === "BLOCKED" && input.renderedInfinityState === "ACTIVE") {
    reasons.push("BLOCKED_LOOKS_ACTIVE");
  }
  if (expected.commandState === "AUTHORIZATION_REQUIRED" && input.renderedInfinityState === "ACTIVE") {
    reasons.push("AUTHORIZATION_LOOKS_ACTIVE");
  }
  if (input.renderedInfinityState !== expected.infinityState) {
    reasons.push(`INFINITY_VISUAL_DISAGREE:${input.renderedInfinityState}:${expected.infinityState}`);
  }
  if (!input.reducedMotionFallbackPresent) reasons.push("REDUCED_MOTION_FALLBACK_MISSING");
  return {
    gate: HQ_INFINITY_SYMBOL_ACTIVITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function glowCount(workers: WorkerVisualInput[]): number {
  return workers.filter((node) => deriveWorkerVisualState(node) === "ACTIVE").length;
}

export function evaluateHQInfinitySymbolVisibilityGate(input: {
  globalsCss: string;
  liveActivityCss: string;
  coreSource: string;
}): NamedGateResult {
  const globalsCss = input.globalsCss;
  const liveActivityCss = input.liveActivityCss;
  const coreSource = input.coreSource;
  const css = `${globalsCss}\n${liveActivityCss}`;
  const energy = energyCss(css);
  const reasons: string[] = [];
  if (!css.includes("--hq-infinity-inner-active")) reasons.push("INNER_ACTIVE_TOKEN_MISSING");
  if (!css.includes("--hq-infinity-inner-standby")) reasons.push("INNER_STANDBY_TOKEN_MISSING");
  if (!css.includes(INNER_ACTIVE) && !css.includes("var(--hq-infinity-inner-active)")) {
    reasons.push("NEON_PURPLE_NOT_APPLIED");
  }
  if (energy.includes("#fbbf24") || energy.includes("var(--infinity-blocked)")) {
    reasons.push("YELLOW_STILL_CONTROLS_INNER_LINES");
  }
  if (energy.includes("#38bdf8") || energy.includes("#22d3ee")) {
    reasons.push("CYAN_CONTROLS_INNER_LINES");
  }
  if (!coreSource.includes(INNER_ACTIVE) && !coreSource.includes("#c026d3")) {
    reasons.push("ENERGY_GRADIENT_NOT_PURPLE");
  }
  if (coreSource.includes("#38bdf8") || coreSource.includes("#fbbf24")) {
    reasons.push("CORE_ENERGY_USES_CYAN_OR_YELLOW");
  }
  if (!coreSource.includes(CANONICAL_INFINITY_PATH)) reasons.push("INFINITY_GEOMETRY_CHANGED");
  if (!coreSource.includes("aria-label")) reasons.push("STATE_LABEL_MISSING");
  if (!css.includes('[data-hq-decision-core="PRESENT_IDLE"] .hq-infinity-energy') || !energy.includes("animation: none")) {
    reasons.push("STANDBY_STILL_ANIMATES");
  }
  if (!css.includes("prefers-reduced-motion") || !/prefers-reduced-motion[\s\S]*\.hq-infinity-energy[\s\S]*animation:\s*none/.test(css)) {
    reasons.push("REDUCED_MOTION_FALLBACK_MISSING");
  }
  if (!globalsCss.includes(`--infinity-active: ${WORKER_ACTIVE}`) || !globalsCss.includes(`--infinity-blocked: ${WORKER_BLOCKED}`)) {
    reasons.push("WORKER_COLORS_REGRESSED");
  }
  if (contrastRatio(INNER_ACTIVE, "#040406") < 3) reasons.push("DARK_BACKGROUND_CONTRAST_LOW");
  if (contrastRatio(INNER_ACTIVE, WORKER_ACTIVE) < 1.2) reasons.push("CYAN_PURPLE_NOT_DISTINCT");
  if (/drop-shadow\(0 0 (3[0-9]|[4-9]\d)px/.test(energy)) reasons.push("GLOW_NOT_RESTRAINED");
  return {
    gate: HQ_INFINITY_SYMBOL_VISIBILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
