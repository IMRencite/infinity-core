import {
  CHANGE_IMPACT_QC_PLANNER,
  MANDATORY_VENTURE_SMOKE_SUITE,
  SMOKE_REQUIRED_SURFACES,
  type NamedSystemGate,
  type QcMode,
  type VentureSystemId,
} from "./contract";
import { commercialOfferSmokeSurfaces, type RenderedOfferObservation } from "./commercial-offer";

export type SmokeSurfaceResult = {
  surface: (typeof SMOKE_REQUIRED_SURFACES)[number];
  applicable: boolean;
  result: "PASS" | "FAIL" | "UNKNOWN";
  reason?: string;
};

export function evaluateMandatoryVentureSmokeSuite(surfaces: readonly SmokeSurfaceResult[]): NamedSystemGate & {
  mode: "SMOKE";
} {
  const reasons: string[] = [];
  for (const surface of SMOKE_REQUIRED_SURFACES) {
    const row = surfaces.find((item) => item.surface === surface);
    if (!row) {
      reasons.push(`SMOKE_SURFACE_UNCHECKED:${surface}`);
      continue;
    }
    if (!row.applicable) continue;
    if (row.result !== "PASS") reasons.push(`SMOKE_${row.result}:${surface}${row.reason ? `:${row.reason}` : ""}`);
  }
  return {
    gate: MANDATORY_VENTURE_SMOKE_SUITE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    mode: "SMOKE",
  };
}

export type ChangeImpactPlan = {
  planner: typeof CHANGE_IMPACT_QC_PLANNER;
  changed_paths: string[];
  targeted_systems: VentureSystemId[];
  targeted_journeys: string[];
  mandatory_smoke: true;
  full_required: boolean;
  full_limited_to_changed_feature: false;
  mode: QcMode;
};

export function planChangeImpactQc(input: {
  changed_paths: readonly string[];
  major_change?: boolean;
  new_venture?: boolean;
  prelaunch?: boolean;
  material_incident_recovery?: boolean;
}): ChangeImpactPlan {
  const targeted = new Set<VentureSystemId>();
  const journeys = new Set<string>();
  for (const path of input.changed_paths) {
    const lower = path.toLowerCase();
    if (lower.includes("nav") || lower.includes("header") || lower.includes("footer") || lower.includes("chrome")) {
      targeted.add("NAVIGATION");
      targeted.add("PUBLIC_SITE");
      targeted.add("LEGAL");
      journeys.add("navigation");
    }
    if (lower.includes("checkout") || lower.includes("payment") || lower.includes("stripe") || lower.includes("price") || lower.includes("offer") || lower.includes("deal") || lower.includes("pricing")) {
      targeted.add("PAYMENT");
      targeted.add("CHECKOUT");
      targeted.add("SUBSCRIPTION");
      targeted.add("COMMERCIAL_OFFER");
      journeys.add("purchase");
      journeys.add("commercial_offer");
    }
    if (lower.includes("fulfill")) {
      targeted.add("FULFILLMENT");
      journeys.add("fulfillment");
    }
    if (lower.includes("login") || lower.includes("auth") || lower.includes("account")) {
      targeted.add("AUTH");
      targeted.add("ACCOUNT");
      journeys.add("signup_login");
    }
    if (lower.includes("improvement") || lower.includes("feedback") || lower.includes("suggest")) {
      targeted.add("IMPROVEMENT_INTAKE");
      journeys.add("suggest_improvement");
    }
    if (lower.includes("growth") || lower.includes("gmail") || lower.includes("gemini") || lower.includes("outreach")) {
      targeted.add("GROWTH");
      targeted.add("GROWTH_GMAIL");
      targeted.add("GROWTH_GEMINI");
      targeted.add("GROWTH_DURABLE_QUEUE");
      targeted.add("GROWTH_REPLY_HANDLING");
    }
    if (lower.includes("calc") || lower.includes("result") || lower.includes("product")) {
      targeted.add("PRODUCT_WORKFLOW");
      targeted.add("RESULTS");
      journeys.add("use_product");
    }
  }
  if (targeted.size === 0) targeted.add("PUBLIC_SITE");
  const full_required = Boolean(
    input.major_change || input.new_venture || input.prelaunch || input.material_incident_recovery,
  );
  return {
    planner: CHANGE_IMPACT_QC_PLANNER,
    changed_paths: [...input.changed_paths],
    targeted_systems: [...targeted],
    targeted_journeys: [...journeys],
    mandatory_smoke: true,
    full_required,
    full_limited_to_changed_feature: false,
    mode: full_required ? "FULL" : "TARGETED",
  };
}

export function fullQcLimitedToChangedFeature(): false {
  return false;
}

export function evaluateFullQcCoverageScope(input: {
  mode: QcMode;
  applicable_system_count: number;
  systems_tested: number;
  only_changed_feature_tested: boolean;
}): NamedSystemGate {
  if (input.mode === "FULL" && (input.only_changed_feature_tested || input.systems_tested < input.applicable_system_count)) {
    return {
      gate: "VentureQCCoverageContract",
      result: "FAIL",
      reasons: ["FULL_QC_MUST_NOT_BE_FEATURE_LIMITED"],
    };
  }
  return { gate: "VentureQCCoverageContract", result: "PASS", reasons: [] };
}

export function deploymentQualityFromSmoke(smoke: NamedSystemGate): "PASS" | "FAIL" {
  return smoke.result;
}

export function evaluateCommercialDeploymentSmoke(input: {
  surfaces: readonly SmokeSurfaceResult[];
  commercial: boolean;
  completeness: Parameters<typeof commercialOfferSmokeSurfaces>[0]["completeness"];
  rendered: RenderedOfferObservation;
}) {
  const offer = commercialOfferSmokeSurfaces({
    commercial: input.commercial,
    completeness: input.completeness,
    rendered: input.rendered,
  });
  const merged = [
    ...input.surfaces.filter((row) => !offer.some((item) => item.surface === row.surface)),
    ...offer,
  ];
  return evaluateMandatoryVentureSmokeSuite(merged);
}
