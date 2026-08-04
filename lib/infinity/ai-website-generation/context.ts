import { createHash } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { PersistedBuild } from "@/lib/infinity/build-factory/types";
import { HONEST_CONTENT_MARKERS, SECRET_PATTERNS } from "./constants";
import { AI_WEBSITE_PROMPT_VERSION } from "./constants";
import type { ContextManifestEntry } from "./context-manifest";

export type AiWebsiteContextBundle = {
  manifest: ContextManifestEntry[];
  contextHash: string;
  promptVersion: typeof AI_WEBSITE_PROMPT_VERSION;
  userPayload: Record<string, unknown>;
  allowedEvidenceReferenceIds: string[];
};

function hashManifest(entries: ContextManifestEntry[]): string {
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

function scrubSecrets(value: unknown): unknown {
  if (typeof value === "string") {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(value)) {
        throw new Error("Secret-like content detected in context assembly");
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(scrubSecrets);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.toLowerCase().includes("password") || k.toLowerCase().includes("secret")) {
        continue;
      }
      out[k] = scrubSecrets(v);
    }
    return out;
  }
  return value;
}

export async function buildAiWebsiteGenerationContext(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    build: PersistedBuild;
  },
): Promise<AiWebsiteContextBundle> {
  const { organizationId, build } = input;
  if (build.organizationId !== organizationId) {
    throw new Error("Organization isolation violation");
  }

  const manifest: ContextManifestEntry[] = [];
  const allowedEvidenceReferenceIds: string[] = [];

  const push = (
    recordType: string,
    recordId: string,
    version: string,
    inclusionReason: string,
    summary: Record<string, unknown>,
  ) => {
    const hash = createHash("sha256").update(JSON.stringify(summary)).digest("hex");
    manifest.push({
      recordType,
      recordId,
      version,
      hash,
      organizationId,
      inclusionReason,
    });
  };

  const { data: mission } = await admin
    .from("missions")
    .select("id, title, description, objectives, constraints, status")
    .eq("organization_id", organizationId)
    .eq("id", build.missionId)
    .maybeSingle();
  if (!mission) {
    throw new Error("Mission not found");
  }
  push("mission", mission.id, "1", "mission_objective", {
    title: mission.title,
    description: mission.description,
    objectives: mission.objectives,
    constraints: mission.constraints,
    status: mission.status,
  });

  const { data: opportunity } = await admin
    .from("opportunities")
    .select("id, name, summary, industry, category, problem, status")
    .eq("organization_id", organizationId)
    .eq("id", build.opportunityId)
    .maybeSingle();
  if (!opportunity) {
    throw new Error("Opportunity not found");
  }
  push("opportunity", opportunity.id, "1", "approved_opportunity", opportunity);

  const { data: validationRun } = await admin
    .from("validation_runs")
    .select("id, recommendation, overall_score, summary, run_status")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", build.opportunityId)
    .eq("run_status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (validationRun) {
    push("validation_run", validationRun.id, "1", "validation_result", validationRun);
    allowedEvidenceReferenceIds.push(`validation_run:${validationRun.id}`);
  }

  const { data: executiveDecision } = await admin
    .from("command_decisions")
    .select("id, outcome")
    .eq("organization_id", organizationId)
    .eq("mission_id", build.missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (executiveDecision) {
    push("executive_decision", executiveDecision.id, "1", "executive_decision", executiveDecision);
    allowedEvidenceReferenceIds.push(`executive_decision:${executiveDecision.id}`);
  }

  const { data: blueprint } = await admin
    .from("venture_blueprints")
    .select("id, venture_type, blueprint, status")
    .eq("organization_id", organizationId)
    .eq("id", build.ventureBlueprintId)
    .maybeSingle();
  if (!blueprint) {
    throw new Error("Venture blueprint not found");
  }
  push("venture_blueprint", blueprint.id, "1", "venture_blueprint", {
    venture_type: blueprint.venture_type,
    status: blueprint.status,
    blueprint: blueprint.blueprint,
  });

  push("build_specification", build.id, build.buildVersion, "build_specification", {
    projectType: build.projectType,
    specificationHash: build.specificationHash,
    website: build.specification.website,
    prohibitedActions: build.specification.prohibitedActions,
    contentRequirements: build.specification.contentRequirements,
  });

  const userPayload = scrubSecrets({
    honestContentMarkers: HONEST_CONTENT_MARKERS,
    mission: { id: mission.id, title: mission.title, description: mission.description },
    opportunity: { id: opportunity.id, name: opportunity.name, summary: opportunity.summary },
    validationRunId: validationRun?.id ?? null,
    executiveDecisionId: executiveDecision?.id ?? null,
    ventureBlueprintId: blueprint.id,
    buildId: build.id,
    buildSpecificationId: build.id,
    projectType: build.projectType,
    websiteExtension: build.specification.website,
    allowedEvidenceReferenceIds,
    prohibitedActions: build.specification.prohibitedActions,
  }) as Record<string, unknown>;

  return {
    manifest,
    contextHash: hashManifest(manifest),
    promptVersion: AI_WEBSITE_PROMPT_VERSION,
    userPayload,
    allowedEvidenceReferenceIds,
  };
}
