import type { ProfitLabHqView } from "@/lib/infinity/venture-economics/types";
import { evaluateHQVentureEconomicsVisibilityGate, evaluateProfitLabCompletenessGate } from "@/lib/infinity/venture-economics/gates";
import {
  CANONICAL_ECONOMICS_UNAVAILABLE,
  CANONICAL_PROJECTION_FALLBACK_MASKING_GATE,
  GENERIC_AUTONOMOUS_VENTURE_CYCLE,
  GENERIC_NO_RELIABLE_ESTIMATE,
  HQ_CANONICAL_VENTURE_IDENTITY_GATE,
  HQ_VENTURE_INSPECTION_CONTEXT_GATE,
  HQ_VENTURE_LIFECYCLE_PROJECTION_GATE,
  RENDERED_PROFIT_LAB_COMPLETENESS_GATE,
  type HqInspectionIdentity,
  type HqInspectionSurfaceIds,
  type NamedIdentityGateResult,
  type RenderedHqInspectionProjection,
} from "./types";
import { hqVentureIdentitiesMatch, isAskReviewIdentity, isOccupancynpvIdentity } from "./aliases";
import { presentPartialEconomics } from "./overlay";

function fail(gate: string, reasons: string[]): NamedIdentityGateResult {
  return { gate, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

function sameVenture(ids: Array<string | null | undefined>): boolean {
  const present = ids.filter((id): id is string => Boolean(id));
  if (present.length < 2) return false;
  return present.every((id) => hqVentureIdentitiesMatch(id, present[0]));
}

export function evaluateHQVentureInspectionContextGate(input: {
  identity: HqInspectionIdentity;
  surfaces: HqInspectionSurfaceIds;
}): NamedIdentityGateResult {
  const reasons: string[] = [];
  if (input.identity.source !== "canonical_venture" || !input.identity.canonicalVentureId) {
    reasons.push("CANONICAL_VENTURE_UNRESOLVED");
  }
  const ids = [
    input.identity.canonicalVentureId,
    input.surfaces.route,
    input.surfaces.header,
    input.surfaces.selector,
    input.surfaces.intelligence,
    input.surfaces.economics,
    input.surfaces.evidence,
    input.surfaces.systemView,
  ];
  if (!sameVenture(ids)) reasons.push("MIXED_VENTURE_INSPECTION_CONTEXT");
  if (
    input.identity.mappedFromCandidate &&
    input.surfaces.selector &&
    input.identity.canonicalVentureId &&
    !hqVentureIdentitiesMatch(input.surfaces.selector, input.identity.canonicalVentureId)
  ) {
    reasons.push("SELECTOR_ROUTE_MISMATCH");
  }
  return fail(HQ_VENTURE_INSPECTION_CONTEXT_GATE, reasons);
}

export function evaluateHQCanonicalVentureIdentityGate(input: {
  candidateId: string | null;
  ventureId: string | null;
  ventureName: string | null;
  economicsVentureId: string | null;
  lifecycle: string | null;
  selectorVentureId: string | null;
  inspectRoute: string | null;
}): NamedIdentityGateResult {
  const reasons: string[] = [];
  if (!input.candidateId) reasons.push("CANDIDATE_ID_MISSING");
  if (!input.ventureId) reasons.push("VENTURE_ID_MISSING");
  if (!input.ventureName) reasons.push("VENTURE_NAME_MISSING");
  if (!input.economicsVentureId) reasons.push("ECONOMICS_RECORD_MISSING");
  if (!input.lifecycle) reasons.push("LIFECYCLE_RECORD_MISSING");
  if (!input.selectorVentureId) reasons.push("SELECTOR_STATE_MISSING");
  if (!input.inspectRoute) reasons.push("INSPECT_ROUTE_MISSING");
  if (!sameVenture([input.ventureId, input.economicsVentureId, input.selectorVentureId, input.inspectRoute])) {
    reasons.push("IDENTITY_TRACE_BROKEN");
  }
  return fail(HQ_CANONICAL_VENTURE_IDENTITY_GATE, reasons);
}

export function evaluateHQVentureLifecycleProjectionGate(input: {
  canonicalLifecycle: string | null;
  renderedLifecycle: string | null;
  ventureId?: string | null;
}): NamedIdentityGateResult {
  const reasons: string[] = [];
  if (!input.canonicalLifecycle) reasons.push("CANONICAL_LIFECYCLE_MISSING");
  if (!input.renderedLifecycle) reasons.push("RENDERED_LIFECYCLE_MISSING");
  if (input.canonicalLifecycle === "PUBLICLY_LAUNCHED") {
    if (input.renderedLifecycle !== "PUBLICLY_LAUNCHED" && !input.renderedLifecycle?.includes("PUBLICLY_LAUNCHED")) {
      reasons.push("STALE_LOWER_STAGE_USED");
    }
    if (/idea/i.test(input.renderedLifecycle ?? "")) reasons.push("LAUNCHED_VENTURE_RENDERED_AS_IDEA");
  }
  if (isAskReviewIdentity(input.ventureId) && !/SELECTION_UNDER_REVIEW|PAUSED/i.test(input.renderedLifecycle ?? "")) {
    reasons.push("ASKREVIEW_LIFECYCLE_MISPROJECTED");
  }
  return fail(HQ_VENTURE_LIFECYCLE_PROJECTION_GATE, reasons);
}

export function evaluateRenderedProfitLabCompletenessGate(input: {
  rendered: RenderedHqInspectionProjection;
  view?: ProfitLabHqView | null;
}): NamedIdentityGateResult {
  const rendered = input.rendered;
  const reasons: string[] = [];
  if (rendered.genericFallback) reasons.push("GENERIC_PLACEHOLDER_RENDERED");
  if (rendered.canonicalEconomicsExisted && rendered.projectionError) reasons.push(rendered.projectionError);
  if (rendered.canonicalEconomicsExisted && rendered.genericFallback) reasons.push("ECONOMICS_EXIST_BUT_GENERIC_EMPTY");
  if (!hqVentureIdentitiesMatch(rendered.routeVentureId, rendered.selectorVentureId)) {
    reasons.push("WRONG_VENTURE_RENDERED");
  }
  if (isOccupancynpvIdentity(rendered.routeVentureId)) {
    if (/idea/i.test(rendered.lifecycle ?? "")) reasons.push("WRONG_LIFECYCLE");
    if (!rendered.competitors.length) reasons.push("COMPETITORS_MISSING");
    if (!rendered.pricingBenchmarks.length) reasons.push("PRICING_MISSING");
    if (!rendered.scenarios.includes("LOW") || !rendered.scenarios.includes("BASE") || !rendered.scenarios.includes("HIGH")) {
      reasons.push("SCENARIOS_MISSING");
    }
    if (!rendered.evidence.length) reasons.push("EVIDENCE_MISSING");
    if (rendered.currentPrice && /no reliable estimate/i.test(rendered.currentPrice)) {
      reasons.push("KNOWN_PRICE_GENERIC_UNKNOWN");
    }
  }
  if (input.view) {
    const completeness = evaluateProfitLabCompletenessGate(input.view);
    if (completeness.result === "FAIL") reasons.push(...completeness.reasons);
  }
  return fail(RENDERED_PROFIT_LAB_COMPLETENESS_GATE, reasons);
}

export function evaluateCanonicalProjectionFallbackMaskingGate(input: {
  canonicalRecordExists: boolean;
  projectionLoadFailed: boolean;
  renderedGenericEmpty: boolean;
  renderedProjectionError: string | null;
}): NamedIdentityGateResult {
  const reasons: string[] = [];
  if (input.canonicalRecordExists && input.projectionLoadFailed && input.renderedGenericEmpty && !input.renderedProjectionError) {
    reasons.push("SILENT_GENERIC_FALLBACK");
  }
  if (input.canonicalRecordExists && input.renderedGenericEmpty && !input.renderedProjectionError) {
    reasons.push("CANONICAL_DATA_MASKED_AS_EMPTY");
  }
  if (input.projectionLoadFailed && input.renderedProjectionError !== CANONICAL_ECONOMICS_UNAVAILABLE && !input.renderedProjectionError?.includes("PROJECTION ERROR")) {
    reasons.push("PROJECTION_ERROR_NOT_SURFACED");
  }
  return fail(CANONICAL_PROJECTION_FALLBACK_MASKING_GATE, reasons);
}

export function evaluateRenderedHQVentureEconomicsVisibilityGate(input: {
  view: ProfitLabHqView;
  rendered: RenderedHqInspectionProjection;
  artifactsVisible: boolean;
}): NamedIdentityGateResult {
  const backend = evaluateHQVentureEconomicsVisibilityGate({
    view: input.view,
    artifactsVisible: input.artifactsVisible,
  });
  const rendered = evaluateRenderedProfitLabCompletenessGate({ rendered: input.rendered, view: input.view });
  const reasons = [...backend.reasons];
  if (!hqVentureIdentitiesMatch(input.rendered.routeVentureId, input.rendered.economicsVentureId)) {
    reasons.push("RENDERED_IDENTITY_MISMATCH");
  }
  if (!input.rendered.competitors.length) reasons.push("COMPETITORS_NOT_VISIBLE");
  if (!input.rendered.currentPrice || /no reliable estimate/i.test(input.rendered.currentPrice)) {
    reasons.push("PRICING_NOT_VISIBLE");
  }
  if (input.rendered.scenarios.length < 3) reasons.push("SCENARIOS_NOT_VISIBLE");
  if (!input.rendered.unknowns.length) reasons.push("UNKNOWNS_NOT_VISIBLE");
  if (!input.rendered.evidence.length) reasons.push("EVIDENCE_NOT_VISIBLE");
  if (!input.rendered.confidence) reasons.push("CONFIDENCE_NOT_VISIBLE");
  if (!input.rendered.lifecycle) reasons.push("LIFECYCLE_NOT_VISIBLE");
  reasons.push(...rendered.reasons.filter((reason) => !reasons.includes(reason)));
  return fail("HQVentureEconomicsVisibilityGate", reasons);
}

export function evaluateInspectionFixture(input: {
  routeVentureId: string | null;
  selectorVentureId: string | null;
  canonicalEconomicsPopulated: boolean;
  renderedGenericEmpty: boolean;
  canonicalLifecycle: string | null;
  renderedLifecycle: string | null;
  knownPriceRendered: string | null;
  renderedCac: string | null;
  selectedVentureId: string | null;
  displayedEconomicsVentureId: string | null;
}): { fixture: number; result: "PASS" | "FAIL"; reasons: string[] }[] {
  return [
    {
      fixture: 1,
      ...fail(
        "FIXTURE_1_ROUTE_SELECTOR",
        hqVentureIdentitiesMatch(input.routeVentureId, input.selectorVentureId) ? [] : ["ROUTE_SELECTOR_MISMATCH"],
      ),
    },
    {
      fixture: 2,
      ...fail(
        "FIXTURE_2_GENERIC_EMPTY",
        input.canonicalEconomicsPopulated && input.renderedGenericEmpty ? ["ECONOMICS_EXIST_BUT_GENERIC_EMPTY"] : [],
      ),
    },
    {
      fixture: 3,
      ...fail(
        "FIXTURE_3_LAUNCHED_AS_IDEA",
        input.canonicalLifecycle === "PUBLICLY_LAUNCHED" && /idea/i.test(input.renderedLifecycle ?? "")
          ? ["LAUNCHED_VENTURE_RENDERED_AS_IDEA"]
          : [],
      ),
    },
    {
      fixture: 4,
      ...fail(
        "FIXTURE_4_PARTIAL_COLLAPSE",
        presentPartialEconomics({
          economics: input.canonicalEconomicsPopulated
            ? ({
                research_ran: true,
                unit_economics: { price: { display: "$290/year", classification: "OBSERVED" } },
                recommended_monetization_model: "subscription",
                customer_acquisition_model: { classification: "UNKNOWN" },
                lifetime_value_model: { classification: "UNKNOWN" },
              } as never)
            : null,
          renderedCac: input.renderedCac,
          renderedLtv: GENERIC_NO_RELIABLE_ESTIMATE,
          renderedPrice: input.knownPriceRendered,
          renderedMonetization: GENERIC_NO_RELIABLE_ESTIMATE,
        }).collapsedToGenericUnknown
          ? ["PARTIAL_ECONOMICS_COLLAPSED"]
          : [],
      ),
    },
    {
      fixture: 5,
      ...fail(
        "FIXTURE_5_CROSS_VENTURE",
        isAskReviewIdentity(input.selectedVentureId) && isOccupancynpvIdentity(input.displayedEconomicsVentureId)
          ? ["OCCUPANCYNPV_LEAKED_INTO_ASKREVIEW"]
          : [],
      ),
    },
  ];
}

export function renderedUsesGenericFallback(input: {
  headerName?: string | null;
  selectorName?: string | null;
  customer?: string | null;
  cac?: string | null;
  ltv?: string | null;
}): boolean {
  if (input.headerName === GENERIC_AUTONOMOUS_VENTURE_CYCLE || input.selectorName === GENERIC_AUTONOMOUS_VENTURE_CYCLE) {
    return true;
  }
  return (
    /not (evidenced|named|specified) yet/i.test(input.customer ?? "") &&
    (input.cac === GENERIC_NO_RELIABLE_ESTIMATE || input.ltv === GENERIC_NO_RELIABLE_ESTIMATE)
  );
}
