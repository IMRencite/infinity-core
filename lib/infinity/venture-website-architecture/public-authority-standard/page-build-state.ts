import {
  PAGE_BUILD_STATES,
  PAGE_FAILURE_FAMILIES,
  PAGE_REPAIR_ITERATION_CEILING,
} from "../constants";
import type { Gate } from "../types";

export type PageBuildState = (typeof PAGE_BUILD_STATES)[number];
export type PageFailureFamily = (typeof PAGE_FAILURE_FAMILIES)[number];

export type PageRepairTrace = {
  route: string;
  iteration: number;
  family: PageFailureFamily;
  rootCause: string;
  scope: "component" | "section" | "page" | "shared" | "global";
  result: Gate;
};

export type PageAdmissionRecord = {
  route: string;
  state: PageBuildState;
  renderEvidence: boolean;
  viewportEvidence: string[];
  gateResults: Record<string, Gate>;
  failures: string[];
  families: PageFailureFamily[];
  repairHistory: PageRepairTrace[];
  repairIterations: number;
  missingEvidence: number;
  finalState: PageBuildState;
};

export function initialPageState(): PageBuildState {
  return "GENERATED";
}

export function transitionPageState(current: PageBuildState, event: "render" | "validate" | "fail" | "repair" | "retry" | "pass" | "exhaust"): PageBuildState {
  if (event === "render" && (current === "GENERATED" || current === "RENDER_RETRY" || current === "REPAIRING")) return "RENDER_PENDING";
  if (event === "validate" && (current === "RENDER_PENDING" || current === "GENERATED")) return "VALIDATING";
  if (event === "fail" && current === "VALIDATING") return "REPAIR_REQUIRED";
  if (event === "repair" && current === "REPAIR_REQUIRED") return "REPAIRING";
  if (event === "retry" && current === "REPAIRING") return "RENDER_RETRY";
  if (event === "pass" && (current === "VALIDATING" || current === "RENDER_RETRY")) return "VALIDATED";
  if (event === "pass" && current === "VALIDATED") return "READY_FOR_ARTIFACT";
  if (event === "exhaust") return "FAILED_BOUNDED_REPAIR";
  return current;
}

export function canAdmitPage(state: PageBuildState): boolean {
  return state === "READY_FOR_ARTIFACT";
}

export function repairCeilingExceeded(iterations: number, ceiling = PAGE_REPAIR_ITERATION_CEILING): boolean {
  return iterations >= ceiling;
}

export function classifyFailureFamily(failure: string): PageFailureFamily {
  const text = failure.toLowerCase();
  if (/contrast|ink|pale|foreground|background|spoke|link color/.test(text)) return "CONTRAST";
  if (/overlap|hero|intersection/.test(text)) return "OVERLAP";
  if (/width|shell|narrow/.test(text)) return "WIDTH";
  if (/grid|card balance|balanced|hub_discovery/.test(text)) return "GRID";
  if (/typograph|heading|paragraph|rhythm/.test(text)) return "TYPOGRAPHY";
  if (/human-first|authoring|factory|answerchunk|hide the engine/.test(text)) return "CONTENT_VOICE";
  if (/redundan/.test(text)) return "REDUNDANCY";
  if (/overflow/.test(text)) return "OVERFLOW";
  if (/source|trusted/.test(text)) return "SOURCE_PRESENTATION";
  if (/nav|semantic/.test(text)) return "NAVIGATION";
  if (/table/.test(text)) return "TABLE";
  if (/cta|spoke/.test(text)) return "CTA";
  if (/title|canonical|h1|meta|schema|sitemap/.test(text)) return "SEO";
  if (/question.?cluster|must.answer|citation.ready|faq.stuff|geo|answerchunk|citation/.test(text)) return "GEO";
  if (/focus|alt|accessib/.test(text)) return "ACCESSIBILITY";
  return "CONTRAST";
}
