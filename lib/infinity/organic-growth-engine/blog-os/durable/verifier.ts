import { CURRENT_BLOG_QC_VERSION, type CheckResult } from "./types";

export type VerifierMode = "PRE_PUBLISH" | "LIVE_POST_PUBLISH" | "CANARY";
export type VerifierOutcome =
  | "PASS"
  | "CONTENT_DEFECT"
  | "VISUAL_DEFECT"
  | "CANONICAL_DEFECT"
  | "LINK_DEFECT"
  | "LIVE_RENDER_DEFECT"
  | "PROPAGATION_PENDING"
  | "VERIFIER_INFRA_FAILURE"
  | "HUMAN_REVIEW_REQUIRED";

export type RenderedPageInput = {
  mode: VerifierMode;
  url: string;
  status: number;
  html: string;
  expected_h1?: string | null;
  expected_marker?: string | null;
  expected_canonical?: string | null;
  links?: Array<{ href: string; ok: boolean }>;
  overflow?: boolean;
  truncated?: boolean;
  background_kind?: "SOLID" | "IMAGE" | "GRADIENT" | "UNKNOWN";
  contrast_proven?: boolean;
  sitemap_includes?: boolean | null;
  catalog_includes?: boolean | null;
};

const PLACEHOLDER = /TODO|lorem ipsum|INTERNAL_|WIP|FIXME|placeholder copy/i;
const INTERNAL = /content strategy|pilot concept|DealWorkspace|verified path/i;

export function evaluateRenderedPageVerificationCheck(input: RenderedPageInput): CheckResult & { outcome: VerifierOutcome } {
  if (input.status === 0) {
    return { check: "RenderedPageVerificationCheck", result: "FAIL", outcome: "VERIFIER_INFRA_FAILURE", reasons: ["FETCH_FAILED"] };
  }
  if (input.status === 404 && input.mode !== "PRE_PUBLISH") {
    return { check: "RenderedPageVerificationCheck", result: "FAIL", outcome: "LIVE_RENDER_DEFECT", reasons: ["HTTP_404"] };
  }
  if (input.status < 200 || input.status >= 400) {
    return { check: "RenderedPageVerificationCheck", result: "FAIL", outcome: "LIVE_RENDER_DEFECT", reasons: [`HTTP_${input.status}`] };
  }
  const reasons: string[] = [];
  let outcome: VerifierOutcome = "PASS";
  const title = (input.html.match(/<title>([^<]+)<\/title>/i) || [])[1] ?? "";
  const h1 = (input.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const canonical = (input.html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || input.html.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) || [])[1] ?? "";
  if (input.expected_h1 && !h1.toLowerCase().includes(input.expected_h1.toLowerCase()) && !title.toLowerCase().includes(input.expected_h1.toLowerCase())) {
    reasons.push("H1_MISSING");
    outcome = "CONTENT_DEFECT";
  }
  if (input.expected_marker && !input.html.toLowerCase().includes(input.expected_marker.toLowerCase())) {
    reasons.push("MARKER_MISSING");
    outcome = "CONTENT_DEFECT";
  }
  if (input.expected_canonical && canonical && !canonical.includes(new URL(input.expected_canonical, "https://occupancynpv.com").pathname)) {
    reasons.push("CANONICAL_MISMATCH");
    outcome = "CANONICAL_DEFECT";
  }
  if (PLACEHOLDER.test(input.html) || INTERNAL.test(input.html)) {
    reasons.push("PLACEHOLDER_OR_INTERNAL");
    outcome = "CONTENT_DEFECT";
  }
  if (input.links?.some((link) => !link.ok)) {
    reasons.push("LINK_BROKEN");
    outcome = "LINK_DEFECT";
  }
  if (input.truncated) {
    reasons.push("TRUNCATED");
    outcome = "LIVE_RENDER_DEFECT";
  }
  if (input.overflow) {
    reasons.push("OVERFLOW");
    outcome = "VISUAL_DEFECT";
  }
  if (input.mode === "LIVE_POST_PUBLISH") {
    if (input.sitemap_includes === false) reasons.push("SITEMAP_PENDING_OR_MISSING");
    if (input.catalog_includes === false) reasons.push("CATALOG_PENDING_OR_MISSING");
    if ((input.sitemap_includes === false || input.catalog_includes === false) && outcome === "PASS") {
      outcome = "PROPAGATION_PENDING";
    }
  }
  if ((input.background_kind === "IMAGE" || input.background_kind === "GRADIENT") && input.contrast_proven !== true) {
    return {
      check: "RenderedPageVerificationCheck",
      result: "HUMAN_REVIEW_REQUIRED",
      outcome: "HUMAN_REVIEW_REQUIRED",
      reasons: [...reasons, "TEXT_OVER_IMAGE_OR_GRADIENT", CURRENT_BLOG_QC_VERSION],
    };
  }
  if (outcome === "PROPAGATION_PENDING") {
    return { check: "RenderedPageVerificationCheck", result: "FAIL", outcome, reasons: reasons.length ? reasons : ["PROPAGATION"] };
  }
  return {
    check: "RenderedPageVerificationCheck",
    result: outcome === "PASS" ? "PASS" : "FAIL",
    outcome,
    reasons: reasons.length ? reasons : [input.mode, CURRENT_BLOG_QC_VERSION],
  };
}
