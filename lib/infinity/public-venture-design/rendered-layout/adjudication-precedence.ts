import {
  LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
  OPTIONAL_DEFENSIVE_HARDENING,
  RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
  REQUIRED_FOR_CORRECTNESS,
  VERIFICATION_ENGINE_FALSE_NEGATIVE,
} from "./constants";

export const RENDERED_LAYOUT_ADJUDICATION_PRECEDENCE = [
  "SERVED_PRODUCTION_BROWSER_GEOMETRY",
  "COMPILED_CSS_TEXT_INFERENCE",
  "SOURCE_CSS_INSPECTION",
] as const;

export const TEXTUAL_CSS_PARSER_CANNOT_OVERRIDE_BROWSER_GEOMETRY = true as const;

export type RenderedLayoutEvidenceLane = (typeof RENDERED_LAYOUT_ADJUDICATION_PRECEDENCE)[number];

export function textualCssParserCannotOverrideBrowserGeometry(): typeof TEXTUAL_CSS_PARSER_CANNOT_OVERRIDE_BROWSER_GEOMETRY {
  return TEXTUAL_CSS_PARSER_CANNOT_OVERRIDE_BROWSER_GEOMETRY;
}

export function adjudicateRenderedLayout(input: {
  servedBrowserGeometry?: "PASS" | "FAIL" | null;
  compiledCssText?: "PASS" | "FAIL" | null;
  sourceCss?: "PASS" | "FAIL" | null;
}): {
  status: "PASS" | "FAIL" | "INSUFFICIENT";
  source: RenderedLayoutEvidenceLane | "NONE";
  textualParserOverridden: false;
  classification:
    | typeof LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE
    | typeof VERIFICATION_ENGINE_FALSE_NEGATIVE
    | "ACTUAL_ARTIFACT_LAYOUT_FAIL"
    | "INSUFFICIENT_BROWSER_EVIDENCE";
} {
  if (input.servedBrowserGeometry === "PASS" || input.servedBrowserGeometry === "FAIL") {
    const parserDisagreed = input.compiledCssText === "FAIL" || input.sourceCss === "FAIL";
    return {
      status: input.servedBrowserGeometry,
      source: "SERVED_PRODUCTION_BROWSER_GEOMETRY",
      textualParserOverridden: false,
      classification:
        input.servedBrowserGeometry === "PASS" && parserDisagreed
          ? LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE
          : input.servedBrowserGeometry === "FAIL"
            ? "ACTUAL_ARTIFACT_LAYOUT_FAIL"
            : LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
    };
  }
  return {
    status: "INSUFFICIENT",
    source: "NONE",
    textualParserOverridden: false,
    classification: "INSUFFICIENT_BROWSER_EVIDENCE",
  };
}

export function classifyUnpublishedLayoutSuccessor(input: {
  deployedServedGeometry: "PASS" | "FAIL";
  deterministicLayoutDefect: boolean;
}): typeof OPTIONAL_DEFENSIVE_HARDENING | typeof REQUIRED_FOR_CORRECTNESS {
  if (input.deployedServedGeometry === "PASS" && !input.deterministicLayoutDefect) {
    return OPTIONAL_DEFENSIVE_HARDENING;
  }
  return REQUIRED_FOR_CORRECTNESS;
}

void VERIFICATION_ENGINE_FALSE_NEGATIVE;
void RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY;
