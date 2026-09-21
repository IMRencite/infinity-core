import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NamedPublicGate } from "@/lib/infinity/public-operations-projection/types";

function pass(gate: string, reason: string): NamedPublicGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedPublicGate {
  return { gate, result: "FAIL", reasons };
}

export const LEGAL_PAGE_SUBSTANTIVE_COVERAGE_GATE = "LegalPageSubstantiveCoverageGate" as const;
export const PRIVACY_POLICY_COMPLETENESS_GATE = "PrivacyPolicyCompletenessGate" as const;
export const TERMS_OF_SERVICE_COMPLETENESS_GATE = "TermsOfServiceCompletenessGate" as const;
export const VENTURE_LEGAL_BOUNDARY_GATE = "VentureLegalBoundaryGate" as const;
export const LEGAL_PAGE_THINNESS_GATE = "LegalPageThinnessGate" as const;

const PRIVACY_TOPICS = [
  "who operates",
  "information users provide",
  "technical and browser",
  "cookies",
  "analytics",
  "contact forms",
  "communications",
  "linked venture",
  "how information is used",
  "service providers",
  "security",
  "retention",
  "privacy choices",
  "children",
  "u.s. privacy",
  "international",
  "policy updates",
  "contact",
];

const TERMS_TOPICS = [
  "site use",
  "informational purpose",
  "acceptable use",
  "intellectual property",
  "third-party",
  "portfolio ventures",
  "availability",
  "prohibited",
  "disclaimers",
  "limitation of liability",
  "indemnification",
  "termination",
  "governing law",
  "changes",
  "contact",
];

export function publicLegalPagePaths(cwd = process.cwd()) {
  return {
    privacy: join(cwd, "app/public/privacy/page.tsx"),
    terms: join(cwd, "app/public/terms/page.tsx"),
  };
}

export function readPublicLegalSources(cwd = process.cwd()) {
  const paths = publicLegalPagePaths(cwd);
  return {
    privacy: existsSync(paths.privacy) ? readFileSync(paths.privacy, "utf8") : "",
    terms: existsSync(paths.terms) ? readFileSync(paths.terms, "utf8") : "",
  };
}

export function legalPlainText(source: string): string {
  return source
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function legalWordCount(source: string): number {
  return legalPlainText(source).split(" ").filter(Boolean).length;
}

export function legalSentenceCount(source: string): number {
  return legalPlainText(source).split(/[.!?]+/).map((row) => row.trim()).filter((row) => row.length > 20).length;
}

function missingTopics(source: string, topics: string[]): string[] {
  const text = source.toLowerCase();
  return topics.filter((topic) => !text.includes(topic));
}

export function evaluateLegalPageThinnessGate(cwd = process.cwd()): NamedPublicGate {
  const { privacy, terms } = readPublicLegalSources(cwd);
  const reasons: string[] = [];
  if (legalWordCount(privacy) < 400) reasons.push("PRIVACY_TOO_THIN");
  if (legalWordCount(terms) < 400) reasons.push("TERMS_TOO_THIN");
  if (legalSentenceCount(privacy) < 8) reasons.push("PRIVACY_ONE_SENTENCE_CLASS");
  if (legalSentenceCount(terms) < 8) reasons.push("TERMS_ONE_SENTENCE_CLASS");
  return reasons.length
    ? fail(LEGAL_PAGE_THINNESS_GATE, reasons)
    : pass(LEGAL_PAGE_THINNESS_GATE, "SUBSTANTIVE_LENGTH");
}

export function evaluatePrivacyPolicyCompletenessGate(cwd = process.cwd()): NamedPublicGate {
  const missing = missingTopics(readPublicLegalSources(cwd).privacy, PRIVACY_TOPICS);
  return missing.length
    ? fail(PRIVACY_POLICY_COMPLETENESS_GATE, missing.map((row) => `MISSING:${row}`))
    : pass(PRIVACY_POLICY_COMPLETENESS_GATE, "PRIVACY_TOPICS_PRESENT");
}

export function evaluateTermsOfServiceCompletenessGate(cwd = process.cwd()): NamedPublicGate {
  const missing = missingTopics(readPublicLegalSources(cwd).terms, TERMS_TOPICS);
  return missing.length
    ? fail(TERMS_OF_SERVICE_COMPLETENESS_GATE, missing.map((row) => `MISSING:${row}`))
    : pass(TERMS_OF_SERVICE_COMPLETENESS_GATE, "TERMS_TOPICS_PRESENT");
}

export function evaluateVentureLegalBoundaryGate(cwd = process.cwd()): NamedPublicGate {
  const { privacy, terms } = readPublicLegalSources(cwd);
  const joined = `${privacy}\n${terms}`.toLowerCase();
  const reasons: string[] = [];
  if (!joined.includes("does not replace") && !joined.includes("not a substitute")) {
    reasons.push("REPLACEMENT_CLAIM_UNCLEAR");
  }
  if (!joined.includes("venture-specific") && !joined.includes("own required legal stack")) {
    reasons.push("VENTURE_STACK_UNSTATED");
  }
  if (joined.includes("covers every venture identically") || joined.includes("identical data practices")) {
    reasons.push("FALSE_UNIFORM_VENTURE_CLAIM");
  }
  return reasons.length
    ? fail(VENTURE_LEGAL_BOUNDARY_GATE, reasons)
    : pass(VENTURE_LEGAL_BOUNDARY_GATE, "IMROS_NOT_VENTURE_REPLACEMENT");
}

export function evaluateLegalPageSubstantiveCoverageGate(cwd = process.cwd()): NamedPublicGate {
  const bundle = [
    evaluateLegalPageThinnessGate(cwd),
    evaluatePrivacyPolicyCompletenessGate(cwd),
    evaluateTermsOfServiceCompletenessGate(cwd),
    evaluateVentureLegalBoundaryGate(cwd),
  ];
  const failed = bundle.filter((row) => row.result !== "PASS");
  return failed.length
    ? fail(LEGAL_PAGE_SUBSTANTIVE_COVERAGE_GATE, failed.flatMap((row) => row.reasons))
    : pass(LEGAL_PAGE_SUBSTANTIVE_COVERAGE_GATE, "PRIVACY_AND_TERMS_SUBSTANTIVE");
}
