import { HARD_PUBLISHABILITY_GATES, LOCKED_QUALITY_FLOORS, VISUAL_EVIDENCE_PRECEDENCE } from "./constants";
import type { Gate, SearchIntent, VisualEvidenceLayer } from "./types";

export { evaluateSemanticContentRedundancy } from "./semantic-content-redundancy";
export { evaluateEditorialHighlightQuality } from "./editorial-highlight-quality";
export { evaluateSemanticNavigationQuality } from "./semantic-navigation-quality";
export {
  evaluateHeroContentSeparation,
  evaluateSemanticNavigationRenderedQuality,
  evaluateCardTextRhythm,
} from "./hero-content-separation";
export { evaluateRenderedRouteClassCoverage } from "./rendered-route-class-coverage";
export { evaluateKickerTitleRedundancy } from "./semantic-navigation-rendered-quality";

export function resolveVisualEvidenceConflict(input: {
  founderPhysicalBrowser: Gate | null;
  servedScreenshot: Gate | null;
  computedGeometry: Gate | null;
  compiledCss: Gate | null;
  sourceCss: Gate | null;
}): { governingLayer: VisualEvidenceLayer; overall: Gate; automatedPassOverridden: boolean } {
  const layers: Array<{ layer: VisualEvidenceLayer; result: Gate | null }> = [
    { layer: "FOUNDER_PHYSICAL_BROWSER_EVIDENCE", result: input.founderPhysicalBrowser },
    { layer: "SERVED_SCREENSHOT_EVIDENCE", result: input.servedScreenshot },
    { layer: "COMPUTED_BROWSER_GEOMETRY", result: input.computedGeometry },
    { layer: "COMPILED_CSS", result: input.compiledCss },
    { layer: "SOURCE_CSS", result: input.sourceCss },
  ];
  const governing = layers.find((item) => item.result !== null);
  if (!governing || governing.result === null) {
    return { governingLayer: "SOURCE_CSS", overall: "FAIL", automatedPassOverridden: false };
  }
  const automated = input.computedGeometry ?? input.compiledCss ?? input.sourceCss;
  return {
    governingLayer: governing.layer,
    overall: governing.result,
    automatedPassOverridden:
      governing.layer === "FOUNDER_PHYSICAL_BROWSER_EVIDENCE" &&
      governing.result === "FAIL" &&
      automated === "PASS",
  };
}

export function evaluateCssOnlyVisual(input: { hasRealImage: boolean; hasGradientOnly: boolean; hasIconOnly: boolean }): Gate {
  if (input.hasRealImage) return "PASS";
  if (input.hasGradientOnly || input.hasIconOnly) return "FAIL";
  return "FAIL";
}

export function evaluateAboveFoldVisualRequirement(input: {
  qualifyingArchetype: boolean;
  meaningfulVisualIntersectsFirstViewport: boolean;
  cssOnly: boolean;
}): Gate {
  if (!input.qualifyingArchetype) return "PASS";
  if (input.cssOnly) return "FAIL";
  return input.meaningfulVisualIntersectsFirstViewport ? "PASS" : "FAIL";
}

export function evaluateLinkGraphRequirements(input: {
  orphans: number;
  deadEnds: number;
  hubToSpoke: number;
  spokeToHub: number;
  sameTopicLateral: number;
  crossTopic: number;
  commercialPath: number;
}): { overall: Gate; orphanRejection: Gate; deadEndRejection: Gate } {
  const orphanRejection = input.orphans === LOCKED_QUALITY_FLOORS.orphanAuthorityPages ? "PASS" : "FAIL";
  const deadEndRejection = input.deadEnds === LOCKED_QUALITY_FLOORS.deadEndAuthorityPages ? "PASS" : "FAIL";
  const connected =
    input.hubToSpoke > 0 &&
    input.spokeToHub > 0 &&
    input.sameTopicLateral > 0 &&
    input.crossTopic > 0 &&
    input.commercialPath > 0;
  return {
    overall: orphanRejection === "PASS" && deadEndRejection === "PASS" && connected ? "PASS" : "FAIL",
    orphanRejection,
    deadEndRejection,
  };
}

export function evaluateBodyContextLinks(input: { bodyContextualCount: number; breadcrumbOnly: boolean }): Gate {
  if (input.breadcrumbOnly) return "FAIL";
  return input.bodyContextualCount > 0 ? "PASS" : "FAIL";
}

export function evaluateSemanticLinkDensity(input: {
  relevant: boolean;
  naturalPlacement: boolean;
  anchorNatural: boolean;
  stuffing: boolean;
}): Gate {
  if (input.stuffing || !input.relevant || !input.naturalPlacement || !input.anchorNatural) return "FAIL";
  return "PASS";
}

export function evaluateConversionPath(intent: SearchIntent, ctas: string[]): Gate {
  if (intent === "INFORMATIONAL") {
    const earlyTransaction = ctas.some((item) => /buy now|add to cart|checkout/i.test(item));
    return earlyTransaction ? "FAIL" : /learn|example|workflow|compare/i.test(ctas.join(" ")) ? "PASS" : "FAIL";
  }
  if (intent === "COMMERCIAL_INVESTIGATION") {
    return /workflow|compare|product|pricing|pilot/i.test(ctas.join(" ")) ? "PASS" : "FAIL";
  }
  if (intent === "TRANSACTIONAL") {
    return /pilot|request|start|pricing/i.test(ctas.join(" ")) ? "PASS" : "FAIL";
  }
  return "PASS";
}

export function evaluateSourcePolicy(input: {
  preferredUsed: boolean;
  competitorCitedAsAuthority: boolean;
  contextualPlacement: boolean;
  designedSourceSection: boolean;
}): Gate {
  if (input.competitorCitedAsAuthority) return "FAIL";
  if (!input.preferredUsed || !input.contextualPlacement || !input.designedSourceSection) return "FAIL";
  return "PASS";
}

export function evaluatePaddedWordCount(input: { usefulWords: number; repeatedFillerRatio: number }): Gate {
  if (input.usefulWords < 2000 && input.repeatedFillerRatio > 0.12) return "FAIL";
  if (input.repeatedFillerRatio > 0.2) return "FAIL";
  return "PASS";
}

export function evaluatePublicAuthorityPublishability(input: { gateResults: Record<string, Gate> }): {
  overall: Gate;
  ready: "PREMIUM_AUTHORITY_VALIDATION_READY" | "NOT_READY";
  failures: string[];
} {
  const failures = HARD_PUBLISHABILITY_GATES.filter((gate) => input.gateResults[gate] === "FAIL");
  const missing = HARD_PUBLISHABILITY_GATES.filter((gate) => input.gateResults[gate] == null);
  const all = [...failures, ...missing];
  return {
    overall: all.length ? "FAIL" : "PASS",
    ready: all.length ? "NOT_READY" : "PREMIUM_AUTHORITY_VALIDATION_READY",
    failures: all,
  };
}

export function visualEvidencePrecedence(): readonly VisualEvidenceLayer[] {
  return VISUAL_EVIDENCE_PRECEDENCE;
}

export function evaluateCrossRouteConsistency(input: {
  routeSignatures?: string[];
  widthBehaviors?: Array<{
    archetype: string;
    shellUtilization: number;
    proseInRange: boolean;
    modulesBreakOut: boolean;
  }>;
}): Gate {
  if (input.routeSignatures && input.routeSignatures.length >= 2) {
    const [first, ...rest] = input.routeSignatures;
    if (!rest.every((item) => item === first)) return "FAIL";
  }
  if (input.widthBehaviors && input.widthBehaviors.length >= 2) {
    const authority = input.widthBehaviors.filter((item) => item.archetype !== "LEGAL");
    if (authority.some((item) => !item.proseInRange || !item.modulesBreakOut)) return "FAIL";
    const utils = authority.map((item) => item.shellUtilization);
    if (Math.max(...utils) - Math.min(...utils) > 0.18) return "FAIL";
  }
  return "PASS";
}

export function evaluateResponsiveGeometry(input: { overflowByViewport: Record<string, number> }): Gate {
  return Object.values(input.overflowByViewport).every((value) => value === 0) ? "PASS" : "FAIL";
}
