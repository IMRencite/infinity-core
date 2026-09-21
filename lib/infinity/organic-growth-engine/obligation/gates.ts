import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import {
  evaluateCrossSystemRuntimeIsolationGate,
  COMMUNICATION_HEALTH_SCOPE,
  COMMUNICATION_LEASE_NAMESPACE,
  ORGANIC_HEALTH_SCOPE,
  ORGANIC_LEASE_NAMESPACE,
  communicationWorkerMayClaim,
  organicWorkerMayClaim,
} from "@/lib/infinity/runtime-isolation/cross-system";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateOrganicProductionPublishGate(input: {
  decision: NamedOutboundLoopGate;
  cannibalization: NamedOutboundLoopGate;
  human_value: NamedOutboundLoopGate;
  evidence: NamedOutboundLoopGate;
  freshness: NamedOutboundLoopGate;
  product_truth: NamedOutboundLoopGate;
  commercial_integrity: NamedOutboundLoopGate;
  seo: NamedOutboundLoopGate;
  geo: NamedOutboundLoopGate;
  internal_links: NamedOutboundLoopGate;
  schema: NamedOutboundLoopGate;
  visual: NamedOutboundLoopGate;
  rendered_quality: NamedOutboundLoopGate;
  publish_safety: NamedOutboundLoopGate;
  substantial_informational?: boolean;
  question_cluster?: NamedOutboundLoopGate[];
}): NamedOutboundLoopGate {
  const required = [
    input.decision,
    input.human_value,
    input.evidence,
    input.commercial_integrity,
    input.seo,
    input.geo,
    input.internal_links,
    input.schema,
    input.rendered_quality,
    input.publish_safety,
  ];
  if (input.substantial_informational) {
    if (!input.question_cluster?.length) {
      return named("OrganicProductionPublishGate", "FAIL", ["MISSING_QUESTION_CLUSTER_GATES"]);
    }
    required.push(...input.question_cluster);
  }
  const optional = [input.cannibalization, input.freshness, input.product_truth, input.visual];
  const failed = [...required, ...optional].filter((row) => row.result === "FAIL");
  return named("OrganicProductionPublishGate", failed.length ? "FAIL" : "PASS", failed.length ? failed.map((row) => row.gate) : ["ALL_REQUIRED_GATES"]);
}

export function evaluateProductionContentCanaryGate(input: {
  http_status: number;
  production_host: boolean;
  canonical_ok: boolean;
  title_ok: boolean;
  h1_ok: boolean;
  body_ok: boolean;
  schema_ok: boolean;
  robots_ok: boolean;
  indexable: boolean;
  sitemap_ok: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.http_status !== 200) reasons.push("HTTP_NOT_200");
  if (!input.production_host) reasons.push("NOT_PRODUCTION_HOST");
  if (!input.canonical_ok) reasons.push("CANONICAL");
  if (!input.title_ok) reasons.push("TITLE");
  if (!input.h1_ok) reasons.push("H1");
  if (!input.body_ok) reasons.push("BODY");
  if (!input.schema_ok) reasons.push("SCHEMA");
  if (!input.robots_ok) reasons.push("ROBOTS");
  if (!input.indexable) reasons.push("NOT_INDEXABLE");
  if (!input.sitemap_ok) reasons.push("SITEMAP");
  return named("ProductionContentCanaryGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["LIVE_PRODUCTION_EVIDENCE"]);
}

export function evaluateOrganicPublishSafetyGate(input: {
  canonical: string;
  slug_unique: boolean;
  url_collision: boolean;
  redirect_conflict: boolean;
  overwrite: boolean;
  production_host: boolean;
  staging_url: boolean;
  noindex: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.canonical.startsWith("https://occupancynpv.com/")) reasons.push("CANONICAL_HOST");
  if (!input.slug_unique) reasons.push("SLUG_COLLISION");
  if (input.url_collision) reasons.push("URL_COLLISION");
  if (input.redirect_conflict) reasons.push("REDIRECT_CONFLICT");
  if (input.overwrite) reasons.push("ACCIDENTAL_OVERWRITE");
  if (!input.production_host) reasons.push("NOT_PRODUCTION_HOST");
  if (input.staging_url) reasons.push("STAGING_URL");
  if (input.noindex) reasons.push("NOINDEX");
  return named("OrganicPublishSafetyGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["PUBLISH_SAFE"]);
}

export function evaluateOrganicPublishRollbackGate(input: {
  verification_failed: boolean;
  rolled_back: boolean;
}): NamedOutboundLoopGate {
  if (input.verification_failed && !input.rolled_back) {
    return named("OrganicPublishRollbackGate", "FAIL", ["BROKEN_CONTENT_LEFT_LIVE"]);
  }
  return named("OrganicPublishRollbackGate", "PASS", ["SAFE"]);
}

export function productionCrossSystemIsolationEvidence(): NamedOutboundLoopGate {
  return evaluateCrossSystemRuntimeIsolationGate({
    communication_lease_scope: COMMUNICATION_LEASE_NAMESPACE,
    organic_lease_scope: ORGANIC_LEASE_NAMESPACE,
    communication_health_scope: COMMUNICATION_HEALTH_SCOPE,
    organic_health_scope: ORGANIC_HEALTH_SCOPE,
    communication_worker_can_claim_organic: communicationWorkerMayClaim(ORGANIC_LEASE_NAMESPACE),
    organic_worker_can_claim_communication: organicWorkerMayClaim(COMMUNICATION_LEASE_NAMESPACE),
    shared_mutable_lifecycle: false,
    organic_deploy_resets_communication: false,
    organic_can_starve_communication: false,
    communication_failure_stops_organic: false,
  });
}
