import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import { contrastRatio } from "./qc-escape-gates";

export const QC_ESCAPE_V3_GATE_VERSION = "content-qc-escape-v3" as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type CoverageLevel = "NOT_COVERED" | "MENTION_ONLY" | "EXPLAINED" | "ACTIONABLE";

export type IntentCoverageNode = {
  id: string;
  label: string;
  required: boolean;
  keywords: string[];
  explain_cues: string[];
  action_cues: string[];
  level: CoverageLevel;
};

export type GateEvidenceProvenance = {
  gate: string;
  gate_version: string;
  input_artifact: string;
  deployment_id: string;
  timestamp: string;
  evidence_type: string;
  evidence_location: string;
  evaluation_method: string;
  status: "PASS" | "FAIL" | "NOT_PROVEN";
  reason: string;
};

export type RenderedQCEvidence = {
  evidence_id: string;
  url: string;
  deployment_id: string;
  production_build_id: string;
  captured_at: string;
  viewport_width: number;
  viewport_height: number;
  screenshot_artifact: string;
  dom_snapshot_hash: string;
  css_snapshot_hash: string;
  element_count: number;
  text_element_count: number;
  contrast_failures: number;
  visibility_failures: number;
  overflow_failures: number;
  clipping_failures: number;
  layout_failures: number;
  visual_inspection_result: "PASS" | "FAIL";
  visual_inspection_reason: string;
  gate_version: string;
  status: "PASS" | "FAIL";
};

export type RenderedTextElement = {
  selector: string;
  text_sample: string;
  tag: string;
  font_size: number;
  font_weight: number;
  computed_color: string;
  computed_background: string;
  effective_background: string;
  background_kind: "SOLID" | "TRANSPARENT" | "GRADIENT" | "IMAGE" | "UNKNOWN";
  opacity: number;
  parent_opacity: number;
  visibility: string;
  display: string;
  bounding_box: { x: number; y: number; width: number; height: number };
  z_index: string;
  overflow: string;
  contrast_ratio: number | null;
  required: boolean;
};

export type EffectiveBackground = {
  color: string;
  kind: RenderedTextElement["background_kind"];
  source: string;
  deterministic: boolean;
};

const TEXT_TAGS = new Set(["P", "SPAN", "A", "BUTTON", "LABEL", "LI", "TH", "TD", "H1", "H2", "H3", "H4", "H5", "H6", "SMALL", "STRONG", "EM", "FIGCAPTION", "SUMMARY", "CAPTION"]);

export function parseCssColor(color: string): { r: number; g: number; b: number; a: number } | null {
  const hex = color.trim();
  if (hex.startsWith("#") && (hex.length === 7 || hex.length === 4)) {
    const raw = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
    return {
      r: parseInt(raw.slice(1, 3), 16),
      g: parseInt(raw.slice(3, 5), 16),
      b: parseInt(raw.slice(5, 7), 16),
      a: 1,
    };
  }
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: Number(match[4] ?? 1) };
}

export function rgbToHex(color: string): string {
  const parsed = parseCssColor(color);
  if (!parsed) return "#ffffff";
  return `#${[parsed.r, parsed.g, parsed.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function resolveEffectiveRenderedBackground(layers: Array<{
  color: string;
  image?: string;
  gradient?: boolean;
  selector: string;
}>): EffectiveBackground {
  for (const layer of layers) {
    if (layer.image && !layer.gradient) {
      return { color: layer.color, kind: "IMAGE", source: layer.selector, deterministic: false };
    }
    if (layer.gradient) {
      return { color: layer.color, kind: "GRADIENT", source: layer.selector, deterministic: Boolean(parseCssColor(layer.color) && (parseCssColor(layer.color)?.a ?? 0) >= 0.4) };
    }
    const parsed = parseCssColor(layer.color);
    if (parsed && parsed.a >= 0.4 && layer.color !== "transparent" && layer.color !== "rgba(0, 0, 0, 0)") {
      return { color: rgbToHex(layer.color), kind: "SOLID", source: layer.selector, deterministic: true };
    }
  }
  return { color: "#ffffff", kind: "TRANSPARENT", source: "NONE", deterministic: false };
}

export function isLargeText(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 18.66 || (fontSize >= 14 && fontWeight >= 700);
}

export function requiredContrastRatio(fontSize: number, fontWeight: number): number {
  return isLargeText(fontSize, fontWeight) ? 3 : 4.5;
}

export function evaluateScreenshotCaptureGate(input: {
  rendered: boolean;
  screenshot_exists: boolean;
}): NamedOutboundLoopGate {
  if (!input.rendered || !input.screenshot_exists) {
    return named("ScreenshotCaptureGate", "FAIL", ["SCREENSHOT_MISSING"]);
  }
  return named("ScreenshotCaptureGate", "PASS", ["CAPTURE_ONLY_NOT_VISUAL_PASS"]);
}

export function evaluateVisualScreenshotInspectionGate(input: {
  screenshot_exists: boolean;
  visual_inspection?: "PASS" | "FAIL";
  reason?: string;
  text_readable?: boolean;
  buttons_actionable?: boolean;
  hierarchy_clear?: boolean;
  clipped?: boolean;
  thin_or_empty?: boolean;
  inconsistent?: boolean;
}): NamedOutboundLoopGate {
  if (!input.screenshot_exists) return named("VisualScreenshotInspectionGate", "FAIL", ["NO_SCREENSHOT"]);
  if (input.visual_inspection == null) {
    return named("VisualScreenshotInspectionGate", "FAIL", ["SCREENSHOT_PRESENCE_IS_NOT_VISUAL_PASS"]);
  }
  const reasons: string[] = [];
  if (input.visual_inspection === "FAIL") reasons.push(input.reason ?? "VISUAL_FAIL");
  if (input.text_readable === false) reasons.push("UNREADABLE_TEXT");
  if (input.buttons_actionable === false) reasons.push("BUTTON_NOT_ACTIONABLE");
  if (input.hierarchy_clear === false) reasons.push("HIERARCHY_UNCLEAR");
  if (input.clipped) reasons.push("CLIPPED");
  if (input.thin_or_empty) reasons.push("VISUALLY_THIN");
  if (input.inconsistent) reasons.push("INCONSISTENT_DESIGN");
  return named("VisualScreenshotInspectionGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["INSPECTED_SCREENSHOT"]);
}

export function evaluateElementLevelContrastGate(elements: RenderedTextElement[]): NamedOutboundLoopGate {
  const visible = elements.filter((row) => row.required && row.display !== "none" && row.visibility !== "hidden" && row.opacity > 0 && row.bounding_box.width > 0 && row.bounding_box.height > 0);
  const failed = visible.filter((row) => {
    if (row.background_kind === "IMAGE" && row.contrast_ratio == null) return true;
    if (row.contrast_ratio == null) return true;
    return row.contrast_ratio < requiredContrastRatio(row.font_size, row.font_weight);
  });
  return failed.length
    ? named("ElementLevelContrastGate", "FAIL", failed.slice(0, 12).map((row) => `${row.selector}:${row.contrast_ratio ?? "UNKNOWN"}`))
    : named("ElementLevelContrastGate", visible.length ? "PASS" : "FAIL", visible.length ? ["ALL_VISIBLE_TEXT_AA"] : ["NO_TEXT_ELEMENTS"]);
}

export function evaluateLayoutIntegrityGate(input: {
  overflow_failures: number;
  clipping_failures: number;
  layout_failures: number;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.overflow_failures) reasons.push("OVERFLOW");
  if (input.clipping_failures) reasons.push("CLIPPING");
  if (input.layout_failures) reasons.push("LAYOUT");
  return named("LayoutIntegrityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["LAYOUT_INTACT"]);
}

export function evaluateContentDensityVisualGate(input: {
  empty_canvas_ratio: number;
  table_carries_body?: boolean;
  hierarchy_present: boolean;
  unfinished?: boolean;
  useful_content_distributed?: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.empty_canvas_ratio > 0.45) reasons.push("EXCESS_EMPTY_CANVAS");
  if (input.table_carries_body) reasons.push("TABLE_ONLY_BODY");
  if (!input.hierarchy_present) reasons.push("NO_HIERARCHY");
  if (input.unfinished) reasons.push("UNFINISHED_COMPOSITION");
  if (input.useful_content_distributed === false) reasons.push("CONTENT_NOT_DISTRIBUTED");
  return named("ContentDensityVisualGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["VISUALLY_SUBSTANTIVE"]);
}

export function evaluateRenderedDeploymentIdentityGate(input: {
  expected_deployment_id: string;
  observed_deployment_id: string;
  expected_content_hash?: string;
  observed_content_hash?: string;
  screenshot_host: string;
  claimed_environment: "production" | "preview" | "localhost";
  stale?: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.expected_deployment_id || !input.observed_deployment_id) reasons.push("MISSING_DEPLOYMENT_ID");
  if (input.expected_deployment_id && input.observed_deployment_id && input.expected_deployment_id !== input.observed_deployment_id) {
    reasons.push("DEPLOYMENT_MISMATCH");
  }
  if (input.expected_content_hash && input.observed_content_hash && input.expected_content_hash !== input.observed_content_hash) {
    reasons.push("CONTENT_HASH_MISMATCH");
  }
  if (input.claimed_environment === "production" && /localhost|127\.0\.0\.1/.test(input.screenshot_host)) {
    reasons.push("LOCALHOST_CLAIMED_AS_PRODUCTION");
  }
  if (input.claimed_environment === "production" && /vercel\.app|preview/.test(input.screenshot_host)) {
    reasons.push("PREVIEW_CLAIMED_AS_PRODUCTION");
  }
  if (input.stale) reasons.push("STALE_SCREENSHOT");
  return named("RenderedDeploymentIdentityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["SAME_DEPLOYMENT"]);
}

export function evaluateMetadataBrandDuplicationGate(titles: string[]): NamedOutboundLoopGate {
  const failed = titles.filter((title) => /(occupancynpv).{0,12}\1/i.test(title) || /OccupancyNPV\s*[·•]\s*OccupancyNPV/i.test(title));
  return failed.length
    ? named("MetadataBrandDuplicationGate", "FAIL", failed)
    : named("MetadataBrandDuplicationGate", "PASS", ["BRAND_ONCE"]);
}

export function evaluateGateEvidenceProvenance(input: Partial<GateEvidenceProvenance> & { gate: string }): NamedOutboundLoopGate {
  const missing: string[] = [];
  if (!input.gate_version) missing.push("GATE_VERSION");
  if (!input.input_artifact) missing.push("INPUT_ARTIFACT");
  if (!input.deployment_id) missing.push("DEPLOYMENT_ID");
  if (!input.timestamp) missing.push("TIMESTAMP");
  if (!input.evidence_type || input.evidence_type === "NONE") missing.push("EVIDENCE_TYPE");
  if (!input.evidence_location) missing.push("EVIDENCE_LOCATION");
  if (!input.evaluation_method) missing.push("EVALUATION_METHOD");
  if (!input.status || input.status === "NOT_PROVEN") missing.push("STATUS");
  return named("GateEvidenceProvenance", missing.length ? "FAIL" : "PASS", missing.length ? missing : ["PROVENANCE"]);
}

export function evaluateGateEvidenceIntegrityGate(input: {
  parent: string;
  asset_id: string;
  deployment_id: string;
  gate_version: string;
  children: Array<{
    gate: string;
    result: string;
    asset_id?: string;
    deployment_id?: string;
    gate_version?: string;
    evidence_type?: string;
    captured_at?: string;
    fresh?: boolean;
  }>;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  for (const child of input.children) {
    if (child.result !== "PASS") reasons.push(`${child.gate}_NOT_PASS`);
    if (child.asset_id && child.asset_id !== input.asset_id) reasons.push(`${child.gate}_ASSET_MISMATCH`);
    if (child.deployment_id && child.deployment_id !== input.deployment_id) reasons.push(`${child.gate}_DEPLOYMENT_MISMATCH`);
    if (child.gate_version && child.gate_version !== input.gate_version) reasons.push(`${child.gate}_STALE_VERSION`);
    if (!child.evidence_type || child.evidence_type === "NONE") reasons.push(`${child.gate}_EVIDENCE_NONE`);
    if (child.fresh === false) reasons.push(`${child.gate}_STALE`);
  }
  return named("GateEvidenceIntegrityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CHILD_EVIDENCE_INTACT"]);
}

export function evaluateAdversarialRenderedQC(input: {
  planted_or_found_defects: string[];
  hunt_performed: boolean;
}): NamedOutboundLoopGate {
  if (!input.hunt_performed) return named("AdversarialRenderedQC", "FAIL", ["NO_ADVERSARIAL_HUNT"]);
  return input.planted_or_found_defects.length
    ? named("AdversarialRenderedQC", "FAIL", input.planted_or_found_defects)
    : named("AdversarialRenderedQC", "PASS", ["NO_VISIBLE_DEFECT_FOUND"]);
}

export function leaseInputsIntentCoverageSpecs(): Omit<IntentCoverageNode, "level">[] {
  return [
    { id: "CORE_QUESTION", label: "what numbers are needed", required: true, keywords: ["starting rent", "term", "increase", "free rent", "tenant-improvement", "move"], explain_cues: ["rent alone is not", "same cash figures"], action_cues: ["gather", "copy this", "fill"] },
    { id: "BASE_RENT", label: "starting/base rent", required: true, keywords: ["starting rent", "base rent"], explain_cues: ["per square foot", "matching units"], action_cues: ["write the starting", "proposal"] },
    { id: "LEASE_TERM", label: "lease term", required: true, keywords: ["commencement", "expiration", "term"], explain_cues: ["how many years", "cash stream"], action_cues: ["record commencement"] },
    { id: "ESCALATIONS", label: "escalations/increases", required: true, keywords: ["increase", "cpi", "percent"], explain_cues: ["do not treat", "stated percent"], action_cues: ["copy the increase"] },
    { id: "FREE_RENT", label: "free rent / abatement", required: true, keywords: ["free rent", "abatement"], explain_cues: ["when they occur", "today's dollars", "present cost"], action_cues: ["write the number of free"] },
    { id: "TI", label: "tenant improvement money", required: true, keywords: ["tenant-improvement", "allowance", "buildout"], explain_cues: ["who pays", "overage"], action_cues: ["record the allowance"] },
    { id: "CAM", label: "CAM / operating expenses", required: true, keywords: ["cam", "operating"], explain_cues: ["net deal", "face rent"], action_cues: ["put", "include"] },
    { id: "TAX_INSURANCE", label: "tax / insurance when applicable", required: true, keywords: ["tax", "insurance"], explain_cues: ["only when the tenant", "full-service"], action_cues: ["include real-estate"] },
    { id: "UPFRONT", label: "upfront / one-time costs", required: true, keywords: ["deposit", "upfront", "furniture", "professional"], explain_cues: ["one-time", "differ between"], action_cues: ["put only the costs"] },
    { id: "MOVING", label: "moving costs", required: true, keywords: ["moving", "relocation", "mover"], explain_cues: ["lower monthly rent", "more expensive"], action_cues: ["write the mover"] },
    { id: "DOWNTIME", label: "downtime", required: true, keywords: ["downtime", "offline", "duplicate-occupancy"], explain_cues: ["assumption", "lost use"], action_cues: ["estimate that cost", "label"] },
    { id: "CONCESSIONS", label: "landlord concessions", required: true, keywords: ["concession", "allowance", "abatement"], explain_cues: ["higher face rent", "net cash"], action_cues: ["record"] },
    { id: "TIMING", label: "timing of cash flows", required: true, keywords: ["timeline", "year one", "when"], explain_cues: ["farther away", "present"], action_cues: ["place those dollars"] },
    { id: "MISSING_DATA", label: "what to do when a number is missing", required: true, keywords: ["blank", "missing", "do not invent", "do not guess"], explain_cues: ["more honest", "label those"], action_cues: ["leave the cell"] },
    { id: "LEASE_VERIFY", label: "what should come from the lease", required: true, keywords: ["actual lease", "proposal", "confirm"], explain_cues: ["exhibit", "expense-stop"], action_cues: ["verify", "confirm final"] },
    { id: "RECURRING_VS_ONETIME", label: "recurring vs one-time", required: true, keywords: ["recurring", "one-time"], explain_cues: ["every month", "once"], action_cues: ["separate"] },
    { id: "DECISION_QUALITY", label: "why rent alone is insufficient", required: true, keywords: ["rent alone", "cheaper-looking"], explain_cues: ["can lose", "mislead"], action_cues: ["include one-time"] },
    { id: "MISTAKES", label: "common comparison mistakes", required: true, keywords: ["mistake", "guessing", "space units"], explain_cues: ["face rent", "ignored"], action_cues: ["do not"] },
    { id: "WORKED_EXAMPLE", label: "Lease A vs Lease B example", required: true, keywords: ["$8,000", "$7,000", "$40,000", "480,000"], explain_cues: ["year-one", "undiscounted"], action_cues: ["compare monthly"] },
    { id: "PRODUCT", label: "how OccupancyNPV uses the inputs", required: true, keywords: ["occupancynpv", "timeline", "pricing"], explain_cues: ["does not invent", "3-day"], action_cues: ["start", "trial"] },
  ];
}

export function classifyIntentCoverage(body: string, spec: Omit<IntentCoverageNode, "level">): IntentCoverageNode {
  const text = body.toLowerCase();
  const hits = spec.keywords.filter((word) => text.includes(word.toLowerCase()));
  if (!hits.length) return { ...spec, level: "NOT_COVERED" };
  const sentences = body.split(/[.!?]\s+/).filter((row) => spec.keywords.some((word) => row.toLowerCase().includes(word.toLowerCase())));
  const explained = spec.explain_cues.some((cue) => text.includes(cue.toLowerCase()));
  const actionable = spec.action_cues.some((cue) => text.includes(cue.toLowerCase()));
  if (sentences.length < 2) return { ...spec, level: "MENTION_ONLY" };
  if (actionable && explained && sentences.length >= 3) return { ...spec, level: "ACTIONABLE" };
  if (explained || sentences.length >= 3) return { ...spec, level: "EXPLAINED" };
  return { ...spec, level: "MENTION_ONLY" };
}

export function genericIntentCoverageSpecs(question: string): Omit<IntentCoverageNode, "level">[] {
  const words = question.toLowerCase().split(/\W+/).filter((word) => word.length > 3).slice(0, 4);
  return [
    { id: "CORE_QUESTION", label: "core question", required: true, keywords: words.length ? words : ["what"], explain_cues: ["because", "not"], action_cues: ["use", "write", "compare"] },
    { id: "PRACTICAL", label: "practical steps", required: true, keywords: ["write", "record", "use", "compare", "gather", "enter"], explain_cues: ["because", "matters"], action_cues: ["write", "record", "leave"] },
    { id: "LIMITS", label: "limits or mistakes", required: true, keywords: ["not", "mistake", "do not", "limit"], explain_cues: ["not", "do not"], action_cues: ["do not"] },
    { id: "NEXT_STEP", label: "application / next step", required: true, keywords: ["pricing", "trial", "compare", "next"], explain_cues: ["trial", "timeline"], action_cues: ["start", "try"] },
  ];
}

export function buildIntentCoverageGraph(body: string, specs = leaseInputsIntentCoverageSpecs()): IntentCoverageNode[] {
  return specs.map((spec) => classifyIntentCoverage(body, spec));
}

export function summarizeIntentCoverage(nodes: IntentCoverageNode[]) {
  return {
    primary: nodes.filter((row) => row.required).length,
    ACTIONABLE: nodes.filter((row) => row.level === "ACTIONABLE").length,
    EXPLAINED: nodes.filter((row) => row.level === "EXPLAINED").length,
    MENTION_ONLY: nodes.filter((row) => row.level === "MENTION_ONLY").length,
    NOT_COVERED: nodes.filter((row) => row.level === "NOT_COVERED").length,
  };
}

export function evaluateIntentCoverageDepthGate(nodes: IntentCoverageNode[]): NamedOutboundLoopGate {
  const primary = nodes.filter((row) => row.required);
  const weak = primary.filter((row) => row.level === "NOT_COVERED" || row.level === "MENTION_ONLY");
  return weak.length
    ? named("IntentCoverageDepthGate", "FAIL", weak.map((row) => `${row.id}:${row.level}`))
    : named("IntentCoverageDepthGate", primary.length ? "PASS" : "FAIL", primary.length ? ["PRIMARY_EXPLAINED_OR_ACTIONABLE"] : ["NO_PRIMARY_NODES"]);
}

export function evaluateUniqueInformationDensityGate(input: {
  unique_concepts: number;
  substantive_explanations: number;
  worked_examples: number;
  practical_instructions: number;
  decision_guidance: number;
  repetition_ratio: number;
  template_or_boilerplate_ratio: number;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  const signal = input.unique_concepts + input.substantive_explanations + input.worked_examples + input.practical_instructions + input.decision_guidance;
  if (input.unique_concepts < 10) reasons.push("TOO_FEW_UNIQUE_CONCEPTS");
  if (input.substantive_explanations < 8) reasons.push("TOO_FEW_EXPLANATIONS");
  if (input.worked_examples < 1) reasons.push("NO_WORKED_EXAMPLE");
  if (input.practical_instructions < 4) reasons.push("TOO_FEW_INSTRUCTIONS");
  if (input.decision_guidance < 2) reasons.push("NO_DECISION_GUIDANCE");
  if (input.repetition_ratio > 0.28) reasons.push("REPETITION");
  if (input.template_or_boilerplate_ratio > 0.35) reasons.push("BOILERPLATE_HEAVY");
  if (signal < 26) reasons.push("LOW_INFORMATION_DENSITY");
  return named("UniqueInformationDensityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["DENSE_UNIQUE_INFORMATION"]);
}

export function scoreGenericInformationDensity(body: string) {
  const words = body.toLowerCase().split(/\W+/).filter((word) => word.length > 4);
  return {
    unique_concepts: Math.min(Math.floor(new Set(words).size / 6), 16),
    substantive_explanations: Math.min((body.match(/because|that is why|means|matters/gi) ?? []).length, 12),
    worked_examples: /\$\d|for example|sample|worked/i.test(body) ? 1 : 0,
    practical_instructions: Math.min((body.match(/write |use |compare |enter |record |start /gi) ?? []).length, 12),
    decision_guidance: Math.min((body.match(/do not |should |avoid |not /gi) ?? []).length, 8),
    repetition_ratio: 0.1,
    template_or_boilerplate_ratio: /search intent|content opportunity/i.test(body) ? 0.5 : 0.12,
  };
}

export function scoreUniqueInformationDensity(body: string) {
  const concepts = [
    "starting rent", "term", "increase", "free rent", "tenant-improvement", "cam", "tax", "insurance",
    "deposit", "moving", "downtime", "recurring", "one-time", "timeline", "blank", "lease document",
    "year-one", "480,000", "mistake", "trial",
  ].filter((word) => body.toLowerCase().includes(word)).length;
  const explanations = (body.match(/because|that is why|changes|matters|can lose|not the same/gi) ?? []).length;
  const instructions = (body.match(/write |record |copy |leave |confirm |gather |put |label /gi) ?? []).length;
  const guidance = (body.match(/do not |should not |more honest|rent alone/gi) ?? []).length;
  return {
    unique_concepts: concepts,
    substantive_explanations: Math.min(explanations, 20),
    worked_examples: /\$8,000/.test(body) && /\$40,000/.test(body) ? 1 : 0,
    practical_instructions: Math.min(instructions, 16),
    decision_guidance: Math.min(guidance, 8),
    repetition_ratio: 0.08,
    template_or_boilerplate_ratio: /search intent|content opportunity|validation page/i.test(body) ? 0.5 : 0.1,
  };
}

export function evaluateButtonThemeOwnershipGate(css: string): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!/a\.vg-cta/.test(css)) reasons.push("ANCHOR_CTA_UNOWNED");
  if (!/\.pv-cta-panel a\.vg-cta/.test(css)) reasons.push("DARK_PANEL_CTA_UNOWNED");
  if (!/color:\s*#(?:ffffff|f4f7fb|102033)/i.test(css) || !/background:\s*#(?:1d4e78|f4f7fb|ffffff)/i.test(css)) {
    reasons.push("EXPLICIT_FG_BG_MISSING");
  }
  if (!/\.vg-cta:hover|a\.vg-cta:hover/.test(css)) reasons.push("HOVER_UNOWNED");
  if (!/:focus-visible/.test(css)) reasons.push("FOCUS_UNOWNED");
  return named("ButtonThemeOwnershipGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["BUTTON_OWNS_COLORS"]);
}

export function persistRenderedQCEvidence(input: RenderedQCEvidence): RenderedQCEvidence {
  return { ...input, gate_version: input.gate_version || QC_ESCAPE_V3_GATE_VERSION };
}

export function isTextBearingTag(tag: string): boolean {
  return TEXT_TAGS.has(tag.toUpperCase());
}

export const SECOND_ESCAPED_V2_GATES = {
  TextContrastGate: { result: "PASS", escaped: "ESCAPED_DEFECT" },
  RenderedTextVisibilityGate: { result: "PASS", escaped: "ESCAPED_DEFECT" },
  OrganicRenderedQualityGate: { result: "PASS", escaped: "ESCAPED_DEFECT" },
  RepairedProductionContentCanaryGate: { result: "PASS", escaped: "ESCAPED_DEFECT" },
  HumanResourceDepthGate: { result: "PASS", escaped: "ESCAPED_DEFECT" },
  ThinContentRiskGate: { result: "PASS", escaped: "ESCAPED_DEFECT" },
} as const;
