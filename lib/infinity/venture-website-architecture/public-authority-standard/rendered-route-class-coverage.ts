import type { Gate } from "./types";

export const RENDERED_ROUTE_CLASS_COVERAGE_GATE = "RenderedRouteClassCoverageGate" as const;

export const REQUIRED_RENDERED_ROUTE_CLASSES = [
  "homepage",
  "how_to",
  "topic_hub",
  "question_authority",
  "comparison",
  "pricing",
  "resource_library",
  "persona",
  "legal",
] as const;

export type RenderedRouteClass = (typeof REQUIRED_RENDERED_ROUTE_CLASSES)[number];

export function classifySampledRoute(route: string): RenderedRouteClass | "other" {
  const clean = route.replace(/\/+$/, "") || "/";
  if (clean === "/") return "homepage";
  if (clean === "/how-it-works") return "how_to";
  if (clean === "/pricing") return "pricing";
  if (clean === "/resources") return "resource_library";
  if (clean.startsWith("/for/")) return "persona";
  if (clean === "/privacy-policy" || clean === "/terms-of-service" || clean === "/sitemap.xml") return "legal";
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 1) {
    if (clean.includes("compare") || clean.includes("vs")) return "comparison";
    return "topic_hub";
  }
  if (parts.length >= 2) {
    if (/compare|vs-/.test(clean)) return "comparison";
    return "question_authority";
  }
  return "other";
}

export function evaluateRenderedRouteClassCoverage(input: {
  sampledRoutes: readonly string[];
  requiredRoutes?: readonly string[];
}): {
  gate: typeof RENDERED_ROUTE_CLASS_COVERAGE_GATE;
  howItWorksSampled: boolean;
  classesCovered: RenderedRouteClass[];
  missingClasses: RenderedRouteClass[];
  missingRequiredRoutes: string[];
  overall: Gate;
  failures: string[];
} {
  const sampled = input.sampledRoutes.map((route) => route.replace(/\/+$/, "") || "/");
  const sampleSet = new Set(sampled);
  const failures: string[] = [];
  const howItWorksSampled = sampleSet.has("/how-it-works");
  if (!howItWorksSampled) failures.push("how_it_works_not_in_visual_sample");
  const classesCovered = REQUIRED_RENDERED_ROUTE_CLASSES.filter((item) =>
    sampled.some((route) => classifySampledRoute(route) === item),
  );
  const missingClasses = REQUIRED_RENDERED_ROUTE_CLASSES.filter((item) => !classesCovered.includes(item));
  if (missingClasses.length) failures.push("missing_layout_archetype_sample");
  const missingRequiredRoutes = (input.requiredRoutes ?? []).filter((route) => !sampleSet.has(route.replace(/\/+$/, "") || "/"));
  if (missingRequiredRoutes.length) failures.push("missing_required_route_sample");
  return {
    gate: RENDERED_ROUTE_CLASS_COVERAGE_GATE,
    howItWorksSampled,
    classesCovered,
    missingClasses,
    missingRequiredRoutes,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}
