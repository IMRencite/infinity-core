import {
  evaluateBuyerDecisionSupportGate,
  evaluateCustomerPageThinnessGate,
  evaluateMaterialQuestionCoverageGate,
  evaluatePageInformationGainGate,
  evaluateProductUnderstandingGate,
} from "@/lib/infinity/customer-page-depth/gates";
import { evaluateFAQCompletenessGate } from "@/lib/infinity/customer-page-depth/faq-completeness";
import {
  evaluateCardTextContainmentGate,
  evaluateHorizontalOverflowGate,
} from "@/lib/infinity/financial-truth/financial-pulse-gates";
import {
  evaluateMachineStateReadabilityGate,
  evaluateResponsiveCardLayoutGate,
} from "@/lib/infinity/hq-information-architecture/secondary-status-gates";
import { evaluateHQLiveWorkSurfaceConsistencyGate } from "@/lib/infinity/canonical-work/gates";
import {
  BROWSER_RUNTIME_HEALTH_GATE,
  RENDERED_ARTIFACT_PROOF_GATE,
  type NamedArtifactGate,
  type QcLayerId,
  type QcLayerResult,
} from "./contract";
import type { ArtifactQcEvidenceBundle } from "./evidence";

function named(gate: string, result: "PASS" | "FAIL" | "N/A", reasons: string[]): NamedArtifactGate {
  return { gate, result, reasons };
}

function asLayerResult(result: string): "PASS" | "FAIL" | "N/A" {
  if (result === "N/A") return "N/A";
  if (result === "PASS" || result === "PASS_WITH_UNCONNECTED_SETTLEMENT_DESTINATION") return "PASS";
  return "FAIL";
}

function layer(
  id: QcLayerId,
  required: boolean,
  inherited: NamedArtifactGate[],
): QcLayerResult {
  if (!required) {
    return { layer: id, required: false, result: "N/A", reasons: ["LAYER_NOT_APPLICABLE"], inherited_gates: [] };
  }
  const material = inherited.filter((row) => row.result !== "N/A");
  const failed = material.filter((row) => row.result === "FAIL");
  return {
    layer: id,
    required: true,
    result: failed.length === 0 ? "PASS" : "FAIL",
    reasons: failed.flatMap((row) => row.reasons),
    inherited_gates: inherited,
  };
}

export function evaluateStructuralLayer(evidence: ArtifactQcEvidenceBundle["structural"]): NamedArtifactGate[] {
  if (!evidence) return [named("StructuralQc", "FAIL", ["STRUCTURAL_EVIDENCE_MISSING"])];
  const reasons: string[] = [];
  if (evidence.typecheck !== "PASS") reasons.push("TYPECHECK_FAIL");
  if (evidence.build !== "PASS") reasons.push("BUILD_FAIL");
  if (evidence.schema !== "PASS") reasons.push("SCHEMA_FAIL");
  if (evidence.tests !== "PASS") reasons.push("TESTS_FAIL");
  if (evidence.routes_exist === false) reasons.push("ROUTE_MISSING");
  return [named("StructuralQc", reasons.length === 0 ? "PASS" : "FAIL", reasons)];
}

export function evaluateRenderedLayer(evidence: ArtifactQcEvidenceBundle["rendered"]): NamedArtifactGate[] {
  if (!evidence) return [named("RenderedQc", "FAIL", ["RENDERED_EVIDENCE_MISSING"])];
  if (evidence.evidence_level === "SOURCE" || evidence.evidence_level === "BUILD_ARTIFACT") {
    return [named("RenderedQc", "FAIL", ["SOURCE_ONLY_CANNOT_CERTIFY_RENDERED"])];
  }
  const visibleDisplay = evidence.visible_display ?? evidence.visible_machine_state ?? "";
  const rawMachineStateOnCard = visibleDisplay.includes("PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED");
  const escaped =
    rawMachineStateOnCard ||
    (evidence.visible_machine_state === "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED" &&
      (!evidence.overflow_hidden || !evidence.text_contained) &&
      !evidence.visible_display);
  const containment = evaluateCardTextContainmentGate({
    overflowHidden: evidence.overflow_hidden,
    ellipsis: evidence.text_contained,
    noTimestampWrap: true,
  });
  const overflow = evaluateHorizontalOverflowGate({
    pageOverflowHidden: evidence.page_overflow_hidden,
    pulseNoForcedScroll: evidence.page_overflow_hidden && !evidence.colliding,
  });
  const machine = evaluateMachineStateReadabilityGate({
    longValuesContained: evidence.machine_state_readable && !escaped,
    noRawErrorDump: evidence.machine_state_readable,
    noTimestampWrap: true,
  });
  const hard: NamedArtifactGate[] = [];
  if (rawMachineStateOnCard) {
    hard.push(named("MachineStateReadabilityGate", "FAIL", ["RAW_MACHINE_STATE_ON_CARD"]));
  }
  if (!evidence.text_contained || escaped || rawMachineStateOnCard) {
    hard.push(named("CardTextContainmentGate", "FAIL", ["TEXT_ESCAPING_CONTAINER"]));
  } else {
    hard.push(named(containment.gate, asLayerResult(containment.result), containment.reasons));
  }
  if (evidence.colliding) hard.push(named("CardTextContainmentGate", "FAIL", ["TEXT_COLLIDING_ADJACENT_UI"]));
  if (!evidence.page_overflow_hidden) {
    hard.push(named(overflow.gate, "FAIL", ["PAGE_LEVEL_HORIZONTAL_OVERFLOW"]));
  } else {
    hard.push(named(overflow.gate, asLayerResult(overflow.result), overflow.reasons));
  }
  if (!evidence.machine_state_readable || escaped) {
    hard.push(named(machine.gate, "FAIL", ["MACHINE_STATE_UNREADABLE"]));
  } else {
    hard.push(named(machine.gate, asLayerResult(machine.result), machine.reasons));
  }
  if (!evidence.layout_ok) hard.push(named("RenderedLayout", "FAIL", ["LAYOUT_BROKEN"]));
  return hard;
}

export function evaluateFunctionalLayer(evidence: ArtifactQcEvidenceBundle["functional"]): NamedArtifactGate[] {
  if (!evidence) return [named("FunctionalQc", "FAIL", ["FUNCTIONAL_EVIDENCE_MISSING"])];
  const reasons: string[] = [];
  if (!evidence.buttons_clickable) reasons.push("BUTTON_NOT_CLICKABLE");
  if (!evidence.forms_submit) reasons.push("FORM_DOES_NOT_SUBMIT");
  if (!evidence.routes_navigate) reasons.push("ROUTE_NOT_NAVIGABLE");
  if (!evidence.primary_action_obvious) reasons.push("PRIMARY_ACTION_NOT_DISCOVERABLE");
  if (evidence.dead_interactions) reasons.push("DEAD_INTERACTION");
  return [named("FunctionalQc", reasons.length === 0 ? "PASS" : "FAIL", reasons)];
}

export function evaluateDataStateLayer(evidence: ArtifactQcEvidenceBundle["data_state"]): NamedArtifactGate[] {
  if (!evidence) return [named("DataStateQc", "FAIL", ["DATA_STATE_EVIDENCE_MISSING"])];
  const reasons: string[] = [];
  if (!evidence.canonical_source) reasons.push("NON_CANONICAL_SOURCE");
  if (!evidence.current_state) reasons.push("STATE_NOT_CURRENT");
  if (!evidence.no_stale_projection) reasons.push("STALE_PROJECTION");
  if (!evidence.no_fabricated_values) reasons.push("FABRICATED_VALUES");
  if (!evidence.venture_identity_correct) reasons.push("VENTURE_IDENTITY_INCORRECT");
  if (!evidence.current_work_consistent) reasons.push("CURRENT_WORK_INCONSISTENT");
  const completedShownActive =
    (evidence.canonical_status === "COMPLETED" || evidence.canonical_status === "IDLE") &&
    (evidence.command_status === "ACTIVE_WORK" ||
      evidence.floor_status === "ACTIVE_WORK" ||
      evidence.rooms_status === "ACTIVE_WORK");
  if (completedShownActive) reasons.push("STALE_ACTIVE_STATE");
  const consistency = evaluateHQLiveWorkSurfaceConsistencyGate({
    command: {
      work_id: "current",
      status: evidence.command_status ?? evidence.canonical_status ?? null,
      mission: evidence.command_mission ?? null,
    },
    floor: {
      work_id: "current",
      status: evidence.floor_status ?? evidence.canonical_status ?? null,
      mission: evidence.floor_mission ?? evidence.command_mission ?? null,
    },
  });
  return [
    named("DataStateQc", reasons.length === 0 ? "PASS" : "FAIL", reasons),
    named(consistency.gate, asLayerResult(consistency.result), consistency.reasons),
  ];
}

export function evaluateResponsiveLayer(evidence: ArtifactQcEvidenceBundle["responsive"]): NamedArtifactGate[] {
  if (!evidence) return [named("ResponsiveQc", "FAIL", ["RESPONSIVE_EVIDENCE_MISSING"])];
  const card = evaluateResponsiveCardLayoutGate({
    desktopSplit: evidence.desktop,
    mobileStacks: evidence.mobile,
    overflowHidden: evidence.no_horizontal_overflow,
  });
  const reasons: string[] = [];
  if (!evidence.desktop) reasons.push("DESKTOP_BROKEN");
  if (!evidence.tablet) reasons.push("TABLET_BROKEN");
  if (!evidence.mobile) reasons.push("MOBILE_BROKEN");
  if (!evidence.no_horizontal_overflow) reasons.push("RESPONSIVE_HORIZONTAL_OVERFLOW");
  return [
    named("ResponsiveQc", reasons.length === 0 ? "PASS" : "FAIL", reasons),
    named(card.gate, asLayerResult(card.result), card.reasons),
  ];
}

export function evaluateContentLayer(evidence: ArtifactQcEvidenceBundle["content"]): NamedArtifactGate[] {
  if (!evidence) return [named("ContentQc", "FAIL", ["CONTENT_EVIDENCE_MISSING"])];
  const coverage = evaluateMaterialQuestionCoverageGate({ html: evidence.html, pageType: evidence.page_type });
  const gain = evaluatePageInformationGainGate(evidence.html, evidence.page_type);
  const decision = evaluateBuyerDecisionSupportGate(evidence.html, evidence.page_type);
  const understanding = evaluateProductUnderstandingGate(evidence.html, evidence.page_type);
  const thinness = evaluateCustomerPageThinnessGate({
    html: evidence.html,
    pageType: evidence.page_type,
    coverage,
    understanding,
    decision,
  });
  const faq = evaluateFAQCompletenessGate(evidence.html);
  return [coverage, gain, decision, understanding, thinness, faq].map((gate) =>
    named(gate.gate, asLayerResult(gate.result), gate.reasons),
  );
}

export function evaluateAccessibilityLayer(
  evidence: ArtifactQcEvidenceBundle["accessibility"],
): NamedArtifactGate[] {
  if (!evidence) return [named("AccessibilityQc", "FAIL", ["ACCESSIBILITY_EVIDENCE_MISSING"])];
  const reasons: string[] = [];
  if (!evidence.contrast) reasons.push("CONTRAST_FAIL");
  if (!evidence.focus) reasons.push("FOCUS_FAIL");
  if (!evidence.labels) reasons.push("LABELS_FAIL");
  if (!evidence.keyboard) reasons.push("KEYBOARD_FAIL");
  return [named("AccessibilityQc", reasons.length === 0 ? "PASS" : "FAIL", reasons)];
}

export function evaluateFinalBrowserLayer(
  evidence: ArtifactQcEvidenceBundle["final_browser"],
): NamedArtifactGate[] {
  if (!evidence) return [named(RENDERED_ARTIFACT_PROOF_GATE, "FAIL", ["BROWSER_PROOF_MISSING"])];
  if (evidence.evidence_level === "SOURCE" || evidence.evidence_level === "BUILD_ARTIFACT") {
    return [named(RENDERED_ARTIFACT_PROOF_GATE, "FAIL", ["SOURCE_ONLY_CANNOT_PRODUCE_RENDERED_PASS"])];
  }
  const reasons: string[] = [];
  if (!evidence.route_loads) reasons.push("ROUTE_DID_NOT_LOAD");
  if (!evidence.version_matches) reasons.push("ARTIFACT_VERSION_MISMATCH");
  if (!evidence.content_visible) reasons.push("EXPECTED_CONTENT_NOT_VISIBLE");
  if (!evidence.no_material_errors) reasons.push("MATERIAL_BROWSER_ERRORS");
  if (!evidence.no_overflow) reasons.push("RENDERED_OVERFLOW");
  if (!evidence.current_data) reasons.push("STALE_CANONICAL_DATA");
  return [named(RENDERED_ARTIFACT_PROOF_GATE, reasons.length === 0 ? "PASS" : "FAIL", reasons)];
}

export function evaluateBrowserRuntimeHealth(evidence: ArtifactQcEvidenceBundle["browser_runtime"]): NamedArtifactGate {
  if (!evidence) return named(BROWSER_RUNTIME_HEALTH_GATE, "FAIL", ["BROWSER_RUNTIME_EVIDENCE_MISSING"]);
  const reasons: string[] = [];
  if (evidence.console_errors) reasons.push("MATERIAL_CONSOLE_ERRORS");
  if (evidence.runtime_exceptions) reasons.push("RUNTIME_EXCEPTIONS");
  if (evidence.hydration_failures) reasons.push("HYDRATION_FAILURES");
  if (evidence.network_failures) reasons.push("NETWORK_FAILURES");
  if (evidence.broken_resources) reasons.push("BROKEN_RESOURCE_LOADS");
  if (evidence.uncaught_interaction_errors) reasons.push("UNCAUGHT_INTERACTION_ERRORS");
  return named(BROWSER_RUNTIME_HEALTH_GATE, reasons.length === 0 ? "PASS" : "FAIL", reasons);
}

export function evaluateSecurityGovernanceLayer(
  evidence: ArtifactQcEvidenceBundle["security"],
): NamedArtifactGate[] {
  if (!evidence) return [named("SecurityGovernanceQc", "FAIL", ["SECURITY_EVIDENCE_MISSING"])];
  const reasons: string[] = [];
  if (evidence.secret_exposure) reasons.push("SECRET_EXPOSURE");
  if (!evidence.write_scope_ok) reasons.push("WRITE_SCOPE_UNSAFE");
  if (!evidence.money_movement_ok) reasons.push("MONEY_MOVEMENT_UNSAFE");
  if (!evidence.capital_authority_ok) reasons.push("CAPITAL_AUTHORITY_UNSAFE");
  return [named("SecurityGovernanceQc", reasons.length === 0 ? "PASS" : "FAIL", reasons)];
}

export function evaluateRequiredLayers(
  required: QcLayerId[],
  evidence: ArtifactQcEvidenceBundle,
): QcLayerResult[] {
  const runtime = required.includes("FINAL_BROWSER") ? evaluateBrowserRuntimeHealth(evidence.browser_runtime) : null;
  const renderedExtra = runtime ? [runtime] : [];
  return required.map((id) => {
    if (id === "STRUCTURAL") return layer(id, true, evaluateStructuralLayer(evidence.structural));
    if (id === "RENDERED") return layer(id, true, evaluateRenderedLayer(evidence.rendered));
    if (id === "FUNCTIONAL") return layer(id, true, evaluateFunctionalLayer(evidence.functional));
    if (id === "DATA_STATE") return layer(id, true, evaluateDataStateLayer(evidence.data_state));
    if (id === "RESPONSIVE") return layer(id, true, evaluateResponsiveLayer(evidence.responsive));
    if (id === "CONTENT") return layer(id, true, evaluateContentLayer(evidence.content));
    if (id === "ACCESSIBILITY") return layer(id, true, evaluateAccessibilityLayer(evidence.accessibility));
    if (id === "FINAL_BROWSER") {
      return layer(id, true, [...evaluateFinalBrowserLayer(evidence.final_browser), ...renderedExtra]);
    }
    if (id === "SECURITY_GOVERNANCE") return layer(id, true, evaluateSecurityGovernanceLayer(evidence.security));
    return layer(id, false, []);
  });
}
