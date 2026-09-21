import {
  COMPACT_DECISION_TOKENS,
  HQ_ACTION_CARD,
  HQ_CIRCULAR_OUTPUT_CARD,
  HQ_OPPORTUNITY_ORB,
  HQ_EVIDENCE_CARD,
  HQ_LONG_CONTENT_THRESHOLD,
  HQ_LONG_FORM_VALUE,
  HQ_METRIC_BADGE,
  HQ_OUTPUT_CARD,
  HQ_OUTPUT_DETAIL,
  HQ_STATUS_BADGE,
  type HqCircleEligibility,
  type HqPresentationKind,
} from "./contract";

const LONG_CONTENT_MARKERS =
  /UNKNOWN —|GROWTH_|LEARNING|enough qualified|entry offer|contact-sales|general-purpose|willingness to pay|qualified conversations/i;

export function isCompactDecisionToken(value: string | null | undefined): boolean {
  const token = value?.trim().toUpperCase() ?? "";
  return (COMPACT_DECISION_TOKENS as readonly string[]).includes(token);
}

export function hqPresentationKind(input: {
  semantic?: HqPresentationKind | null;
  value?: string | null;
  role?: "status" | "metric" | "output" | "evidence" | "action" | "explanation";
}): HqPresentationKind {
  if (input.semantic) return input.semantic;
  if (input.role === "status") return HQ_STATUS_BADGE;
  if (input.role === "metric") return HQ_METRIC_BADGE;
  if (input.role === "evidence") return HQ_EVIDENCE_CARD;
  if (input.role === "action") return HQ_ACTION_CARD;
  if (input.role === "explanation") return HQ_LONG_FORM_VALUE;
  if (input.role === "output") return HQ_OUTPUT_CARD;
  const value = input.value?.trim() ?? "";
  if (!value) return HQ_STATUS_BADGE;
  if (LONG_CONTENT_MARKERS.test(value) || value.length > HQ_LONG_CONTENT_THRESHOLD || value.includes(" — ")) {
    return HQ_OUTPUT_CARD;
  }
  if (/^(HIGH|MEDIUM|LOW|EMPTY|ACTIVE|READY|BLOCKED|WAITING|COMPLETE|IDLE)$/i.test(value)) {
    return HQ_STATUS_BADGE;
  }
  if (value.length <= 18) return HQ_METRIC_BADGE;
  return HQ_OUTPUT_CARD;
}

export function hqPresentationClassName(kind: HqPresentationKind): string {
  if (kind === HQ_STATUS_BADGE) return "hq-status-badge";
  if (kind === HQ_METRIC_BADGE) return "hq-metric-badge";
  if (kind === HQ_CIRCULAR_OUTPUT_CARD) return "hq-circular-orb";
  if (kind === HQ_OPPORTUNITY_ORB) return "hq-opportunity-orb";
  if (kind === HQ_OUTPUT_DETAIL) return "hq-circular-output-detail";
  if (kind === HQ_EVIDENCE_CARD) return "hq-evidence-card";
  if (kind === HQ_ACTION_CARD) return "hq-action-card";
  if (kind === HQ_LONG_FORM_VALUE) return "hq-long-form-value";
  return "hq-output-card";
}

export function usesCompactPillGeometry(kind: HqPresentationKind): boolean {
  return kind === HQ_STATUS_BADGE || kind === HQ_METRIC_BADGE;
}

export function hqCircleEligibility(value: string | null | undefined, role?: "status" | "metric" | "output" | "explanation"): HqCircleEligibility {
  const trimmed = value?.trim() ?? "";
  if (role === "explanation" || trimmed.length > HQ_LONG_CONTENT_THRESHOLD || / — |entry offer|willingness to pay|contact-sales|general-purpose/i.test(trimmed)) {
    return "LONG_EXPLANATION";
  }
  if (role === "status") return "STATUS_NODE";
  if (role === "metric") return "METRIC_NODE";
  if (trimmed.length <= 28) return "DECISION_SUMMARY_NODE";
  return "LONG_EXPLANATION";
}

export function circularNodeAllowed(eligibility: HqCircleEligibility): boolean {
  return eligibility === "STATUS_NODE" || eligibility === "METRIC_NODE" || eligibility === "DECISION_SUMMARY_NODE";
}

export function splitCircularOutput(
  title: string,
  subtitle?: string | null,
  preferredOrb?: string | null,
): { orb: string; detail: string | null } {
  const head = title.trim();
  const body = subtitle?.trim() || null;
  const preferred = preferredOrb?.trim() ?? "";
  if (preferred && circularNodeAllowed(hqCircleEligibility(preferred, "status"))) {
    const preferredLabel = preferred.replace(/_/g, " ");
    const sameAsTitle = head === preferred || head.replace(/_/g, " ") === preferredLabel;
    return { orb: preferredLabel, detail: sameAsTitle ? body : [head, body].filter(Boolean).join(" — ") || null };
  }
  if (circularNodeAllowed(hqCircleEligibility(head, "output")) && body) {
    return { orb: head.replace(/_/g, " "), detail: body };
  }
  const split = head.split(" — ");
  if (split.length > 1 && circularNodeAllowed(hqCircleEligibility(split[0], "status"))) {
    return { orb: split[0]!.replace(/_/g, " "), detail: [split.slice(1).join(" — "), body].filter(Boolean).join(" ") };
  }
  return { orb: head.replace(/_/g, " ").slice(0, 28), detail: body ?? (head.length > 28 ? head : null) };
}

export function preferredCircularOrb(input: {
  artifactType: string;
  title: string;
  status?: string | null;
  confidence?: string | null;
  typeLabel?: string | null;
}): string | null {
  if (input.status && circularNodeAllowed(hqCircleEligibility(input.status, "status"))) return input.status;
  if (input.confidence && circularNodeAllowed(hqCircleEligibility(input.confidence, "status"))) return input.confidence;
  if (input.typeLabel && circularNodeAllowed(hqCircleEligibility(input.typeLabel, "status"))) return input.typeLabel;
  if (input.artifactType === "venture_economics") return "ECONOMICS";
  if (input.artifactType === "competitor_intelligence") return "COMPETITOR";
  if (circularNodeAllowed(hqCircleEligibility(input.title, "output"))) return input.title;
  return null;
}

export function roomDeclaresCircularOutputNodes(roomId: string): boolean {
  return roomId === "strategy_finance" || roomId === "growth_department" || roomId === "opportunity_lab";
}

export function roomInheritsCircularQC(input: {
  roomId: string;
  usesCircularOutputs?: boolean;
  artifactTypes?: string[];
  sourceRecordTypes?: Array<string | null | undefined>;
}): boolean {
  if (input.usesCircularOutputs) return true;
  if (roomDeclaresCircularOutputNodes(input.roomId)) return true;
  if (input.artifactTypes?.some((type) => usesCircularFloorOutput(type))) return true;
  if (input.sourceRecordTypes?.some((type) => usesCircularFloorOutput("", type))) return true;
  return false;
}

export function usesCircularFloorOutput(
  artifactType: string,
  sourceRecordType?: string | null,
  metadata?: { universe?: unknown } | null,
): boolean {
  if (metadata?.universe === true || sourceRecordType === "opportunity_universe") return false;
  return (
    sourceRecordType === "growth_strategy" ||
    artifactType === "learning_decision" ||
    artifactType === "venture_economics" ||
    artifactType === "competitor_intelligence" ||
    artifactType === "opportunity_candidate"
  );
}
