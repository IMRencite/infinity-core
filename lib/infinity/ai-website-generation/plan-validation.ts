import {
  ALLOWED_COMPONENT_TYPES,
  ALLOWED_PAGE_TYPES,
  HONEST_CONTENT_MARKERS,
  SECRET_PATTERNS,
} from "./constants";
import type { WebsiteGenerationPlanPayload } from "./types";

const PROHIBITED_CLAIM_PATTERNS = [
  /\b(guaranteed|money-back)\b/i,
  /\b(five-star|5-star)\b/i,
  /\b(fortune\s*500)\b/i,
  /\btestimonial\b/i,
  /\$\d+/,
];

const DEPLOY_PATTERNS = [
  /\bdeploy\b/i,
  /\bvercel\b/i,
  /\bnpm install\b/i,
  /\bcurl\b/i,
  /\beval\s*\(/i,
];

export type PlanValidationResult = {
  valid: boolean;
  permanent: boolean;
  issues: string[];
};

export function validateWebsiteGenerationPlanPayload(
  payload: WebsiteGenerationPlanPayload,
  input: {
    allowedEvidenceReferenceIds: string[];
    allowedSlugs?: Set<string>;
  },
): PlanValidationResult {
  const issues: string[] = [];

  if (payload.schemaVersion !== "ai_website_generation_plan_v1") {
    issues.push("Invalid schemaVersion");
  }

  if (
    payload.recommendationConfidence < 0 ||
    payload.recommendationConfidence > 100
  ) {
    issues.push("recommendationConfidence out of range");
  }

  const slugs = new Set<string>();
  for (const page of payload.pagePlans ?? []) {
    if (!(ALLOWED_PAGE_TYPES as readonly string[]).includes(page.pageType)) {
      issues.push(`Unsupported page type: ${page.pageType}`);
    }
    if (slugs.has(page.slug)) {
      issues.push(`Duplicate slug: ${page.slug}`);
    }
    slugs.add(page.slug);

    for (const comp of page.requiredComponents ?? []) {
      if (!(ALLOWED_COMPONENT_TYPES as readonly string[]).includes(comp)) {
        issues.push(`Unsupported component: ${comp}`);
      }
    }

    for (const section of page.sectionPlan ?? []) {
      if (!(ALLOWED_COMPONENT_TYPES as readonly string[]).includes(section.componentType)) {
        issues.push(`Unsupported section componentType: ${section.componentType}`);
      }
      for (const ref of section.approvedEvidenceReferenceIds ?? []) {
        if (!input.allowedEvidenceReferenceIds.includes(ref)) {
          issues.push(`Unsupported evidence reference: ${ref}`);
        }
        if (/^[0-9a-f-]{36}$/i.test(ref) && !ref.includes(":")) {
          issues.push(`Invented evidence ID format: ${ref}`);
        }
      }
    }
  }

  for (const record of payload.contentPlan ?? []) {
    for (const ref of record.evidenceReferenceIds ?? []) {
      if (!input.allowedEvidenceReferenceIds.includes(ref)) {
        issues.push(`Content record unsupported evidence: ${ref}`);
      }
    }
    if (record.confidence < 0 || record.confidence > 100) {
      issues.push(`Content confidence out of range: ${record.contentKey}`);
    }
  }

  const serialized = JSON.stringify(payload);
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(serialized)) {
      issues.push("Secret-like content in plan");
    }
  }
  for (const pattern of DEPLOY_PATTERNS) {
    if (pattern.test(serialized)) {
      issues.push(`Deployment or shell instruction detected: ${pattern.source}`);
    }
  }
  for (const pattern of PROHIBITED_CLAIM_PATTERNS) {
    if (pattern.test(serialized)) {
      issues.push(`Prohibited claim pattern: ${pattern.source}`);
    }
  }

  const hasMarker = HONEST_CONTENT_MARKERS.some((m) => serialized.includes(m));
  if (!hasMarker && payload.missingInformation.length === 0) {
    issues.push("Required honest-content markers or missingInformation required");
  }

  return {
    valid: issues.length === 0,
    permanent: issues.some((i) =>
      i.includes("Unsupported") ||
      i.includes("Duplicate") ||
      i.includes("Secret") ||
      i.includes("Prohibited"),
    ),
    issues,
  };
}

export function validateProhibitedClaimInjection(text: string): PlanValidationResult {
  const issues: string[] = [];
  for (const pattern of PROHIBITED_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Prohibited claim: ${pattern.source}`);
    }
  }
  return { valid: issues.length === 0, permanent: true, issues };
}
