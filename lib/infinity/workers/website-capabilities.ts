import {
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RUNTIME_MS,
  type V1WorkerCapabilityKey,
} from "./constants";
import type { WorkerCapabilityContract } from "./types";

const WEBSITE_SIDE_EFFECT = {
  version: "1.0.0",
  requiredContext: ["organization", "mission", "engine_job", "worker_run"],
  requiredPolicies: ["organization_consistency", "mission_active", "capability_registered"],
  maximumRuntimeMs: DEFAULT_MAX_RUNTIME_MS,
  maximumAttempts: DEFAULT_MAX_ATTEMPTS,
  maximumEstimatedCost: 0,
  concurrencyLimit: DEFAULT_CONCURRENCY_LIMIT,
  idempotencyStrategy: "input_hash" as const,
  cancellationSupport: true,
  retryPolicy: "runtime_default" as const,
  status: "active" as const,
};

function websiteWrite(key: string, name: string): WorkerCapabilityContract {
  return {
    ...WEBSITE_SIDE_EFFECT,
    sideEffectClass: "internal_write",
    capabilityKey: key as V1WorkerCapabilityKey,
    name,
    description: `${name} — internal website source only, no network or shell.`,
    workerType: "software",
    permissions: [
      "build.workspace.write",
      "worker_result.write",
      "internal_artifact.write",
      "event.emit",
    ],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object" },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["workspace_file_manifest"],
  };
}

function websiteRead(key: string, name: string): WorkerCapabilityContract {
  return {
    ...WEBSITE_SIDE_EFFECT,
    sideEffectClass: "internal_read",
    capabilityKey: key as V1WorkerCapabilityKey,
    name,
    description: `${name} — bounded validation, no WCAG certification claim.`,
    workerType: "software",
    permissions: ["build.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object", required: ["valid"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["validation_report"],
  };
}

export const WEBSITE_WORKER_CAPABILITY_REGISTRY: Record<string, WorkerCapabilityContract> = {
  "website.generate_structure": websiteWrite("website.generate_structure", "Generate Website Structure"),
  "website.generate_components": websiteWrite("website.generate_components", "Generate Website Components"),
  "website.generate_pages": websiteWrite("website.generate_pages", "Generate Website Pages"),
  "website.generate_styles": websiteWrite("website.generate_styles", "Generate Website Styles"),
  "website.generate_metadata": websiteWrite("website.generate_metadata", "Generate Website Metadata"),
  "website.generate_sitemap": websiteWrite("website.generate_sitemap", "Generate Website Sitemap"),
  "website.generate_robots": websiteWrite("website.generate_robots", "Generate Website Robots"),
  "website.validate_structure": websiteRead("website.validate_structure", "Validate Website Structure"),
  "website.validate_accessibility": websiteRead(
    "website.validate_accessibility",
    "Validate Website Accessibility",
  ),
  "website.validate_seo": websiteRead("website.validate_seo", "Validate Website SEO"),
  "website.validate_security": websiteRead("website.validate_security", "Validate Website Security"),
  "website.package_internal_source": {
    ...websiteWrite("website.package_internal_source", "Package Internal Website Source"),
    artifactTypesProduced: ["internal_website_package"],
  },
  "website.generate_ai_planned_pages": websiteWrite(
    "website.generate_ai_planned_pages",
    "Generate AI Planned Pages",
  ),
  "website.generate_ai_planned_content": websiteWrite(
    "website.generate_ai_planned_content",
    "Generate AI Planned Content",
  ),
  "ai_website.build_context": websiteRead("ai_website.build_context", "Build AI Website Context"),
  "ai_website.generate_plan": websiteRead("ai_website.generate_plan", "Generate AI Website Plan"),
  "ai_website.validate_plan": websiteRead("ai_website.validate_plan", "Validate AI Website Plan"),
  "ai_website.request_review": websiteRead("ai_website.request_review", "Request AI Website Review"),
  "ai_website.translate_approved_plan": websiteWrite(
    "ai_website.translate_approved_plan",
    "Translate Approved AI Website Plan",
  ),
  "qa.verify_internal_website": {
    ...WEBSITE_SIDE_EFFECT,
    sideEffectClass: "internal_read",
    capabilityKey: "qa.verify_internal_website" as V1WorkerCapabilityKey,
    name: "QA Verify Internal Website",
    description: "Independent QA for internal website source (not deployment).",
    workerType: "quality_assurance",
    permissions: [
      "build.read",
      "worker_result.read",
      "worker_result.write",
      "internal_artifact.write",
      "event.emit",
    ],
    inputSchema: {
      type: "object",
      required: ["organization_id", "build_id", "plan_step_id", "worker_result_id"],
    },
    outputSchema: { type: "object", required: ["verdict"] },
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
  "qa.verify_ai_generated_website": {
    ...WEBSITE_SIDE_EFFECT,
    sideEffectClass: "internal_read",
    capabilityKey: "qa.verify_ai_generated_website" as V1WorkerCapabilityKey,
    name: "QA Verify AI Generated Website",
    description: "Independent QA for AI-planned internal website source.",
    workerType: "quality_assurance",
    permissions: [
      "build.read",
      "worker_result.read",
      "worker_result.write",
      "internal_artifact.write",
      "event.emit",
    ],
    inputSchema: {
      type: "object",
      required: ["organization_id", "build_id", "plan_step_id", "worker_result_id"],
    },
    outputSchema: { type: "object", required: ["verdict"] },
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
};

export const WEBSITE_WORKER_CAPABILITY_KEYS = Object.keys(
  WEBSITE_WORKER_CAPABILITY_REGISTRY,
) as (keyof typeof WEBSITE_WORKER_CAPABILITY_REGISTRY)[];
