import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  loadBuildById,
  openBuildWorkspace,
} from "@/lib/infinity/build-factory/workspace";
import { updateBuildStatus } from "@/lib/infinity/build-factory/lifecycle";
import { emitBuildFactoryEvent } from "@/lib/infinity/build-factory/events";
import { createPermissionEnforcer } from "../permissions";
import { requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";
import { runWebsiteCapability, runWebsitePackage } from "@/lib/infinity/website-builder/generators";
import { runWebsiteValidationCapability, scanContentHonesty } from "@/lib/infinity/website-builder/validation";
import { parseWebsiteExtension } from "@/lib/infinity/website-builder/specifications";
import { loadWebsiteBuildState } from "@/lib/infinity/website-builder/state";
import { upsertWebsiteBuildMetadata } from "@/lib/infinity/website-builder/metadata";
import { isWebsiteV1ProjectType } from "@/lib/infinity/website-builder/types";
import { WEBSITE_INTERNAL_SOURCE_LABEL } from "@/lib/infinity/website-builder/constants";
import { verifyBuildReproducibility } from "@/lib/infinity/build-factory/reproducibility";

async function loadBuildForContext(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
) {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const buildId = requireStringField(input, "build_id");
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }
  const build = await loadBuildById(admin, context.organizationId, buildId);
  if (!build) {
    throw new Error(`Build ${buildId} not found`);
  }
  if (!isWebsiteV1ProjectType(build.projectType)) {
    throw new Error(`Build project type ${build.projectType} is not a website v1 project`);
  }
  return build;
}

async function persistMetadataFromState(
  admin: AdminSupabaseClient,
  build: Awaited<ReturnType<typeof loadBuildForContext>>,
) {
  const website = parseWebsiteExtension(build.specification);
  if (!website) return;
  const workspace = openBuildWorkspace(build);
  const state = await loadWebsiteBuildState(workspace);
  const a11y = state.validationReports["website.validate_accessibility"];
  const seo = state.validationReports["website.validate_seo"];
  const sec = state.validationReports["website.validate_security"];
  await upsertWebsiteBuildMetadata(admin, {
    organizationId: build.organizationId,
    buildId: build.id,
    projectType: website.projectType,
    framework: website.framework,
    state,
    accessibilityStatus: a11y?.valid ? "passed" : a11y ? "failed" : "unknown",
    seoStatus: seo?.valid ? "passed" : seo ? "failed" : "unknown",
    securityStatus: sec?.valid ? "passed" : sec ? "failed" : "unknown",
  });
}

export async function runWebsiteGenerationHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
  capabilityKey: string,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");

  const build = await loadBuildForContext(admin, context);
  const workspace = openBuildWorkspace(build);

  await updateBuildStatus(admin, build.organizationId, build.id, "scaffolding");

  const result = await runWebsiteCapability(capabilityKey, build, workspace);
  await persistMetadataFromState(admin, build);

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "website.generation_step_completed",
    message: `${capabilityKey} ${result.skipped ? "reused" : "completed"}`,
    correlationId: context.correlationId,
    buildId: build.id,
    payload: result.structuredOutput,
  });

  return {
    structuredOutput: result.structuredOutput,
    artifactType: "workspace_file_manifest",
    artifactPayload: {
      capability_key: capabilityKey,
      file_count: result.state.fileManifest.length,
    },
  };
}

export async function runWebsiteValidationHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
  capabilityKey: string,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.read");

  const build = await loadBuildForContext(admin, context);
  const workspace = openBuildWorkspace(build);

  await updateBuildStatus(admin, build.organizationId, build.id, "validating");

  const { outcome, skipped } = await runWebsiteValidationCapability(
    capabilityKey,
    build,
    workspace,
  );
  await persistMetadataFromState(admin, build);

  const eventType = outcome.valid ? "website.validation_completed" : "website.validation_failed";

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType,
    message: `${capabilityKey} valid=${outcome.valid}`,
    correlationId: context.correlationId,
    buildId: build.id,
    payload: { issues: outcome.issues },
  });

  if (!outcome.valid && !skipped) {
    await updateBuildStatus(admin, build.organizationId, build.id, "failed", {
      lastError: outcome.issues.join("; "),
    });
  }

  return {
    structuredOutput: { valid: outcome.valid, issues: outcome.issues },
    artifactType: "validation_report",
    artifactPayload: { valid: outcome.valid, issues: outcome.issues, capability_key: capabilityKey },
  };
}

export async function runWebsitePackageInternalSource(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");

  const build = await loadBuildForContext(admin, context);
  const workspace = openBuildWorkspace(build);
  const result = await runWebsitePackage(build, workspace);

  await updateBuildStatus(admin, build.organizationId, build.id, "review_pending");
  await persistMetadataFromState(admin, build);

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "website.review_requested",
    message: "Independent website QA required",
    correlationId: context.correlationId,
    buildId: build.id,
  });

  return {
    structuredOutput: result.structuredOutput,
    artifactType: "internal_website_package",
    artifactPayload: {
      label: "Internal website source package — not deployed.",
      ...result.structuredOutput,
    },
  };
}

export async function runQaVerifyInternalWebsite(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.read");
  permissions.require("worker_result.read");

  const input = context.approvedInput as Record<string, unknown>;
  const workerResultId = requireStringField(input, "worker_result_id");
  const build = await loadBuildForContext(admin, context);

  const { data: target } = await admin
    .from("worker_results")
    .select("id, worker_run_id, capability_key")
    .eq("organization_id", context.organizationId)
    .eq("id", workerResultId)
    .maybeSingle();

  if (target?.worker_run_id === context.workerRunId) {
    throw new Error("QA worker cannot review its own worker run output");
  }
  if (target?.capability_key !== "website.package_internal_source") {
    throw new Error("Website QA must review package_internal_source worker result");
  }

  const workspace = openBuildWorkspace(build);
  const state = await loadWebsiteBuildState(workspace);
  const issues: string[] = [];

  const website = parseWebsiteExtension(build.specification);
  if (!website) {
    issues.push("Website specification extension missing");
  }

  for (const step of [
    "website.validate_structure",
    "website.validate_accessibility",
    "website.validate_seo",
    "website.validate_security",
  ]) {
    const report = state.validationReports[step];
    if (!report?.valid) {
      issues.push(`Validation not passed: ${step}`);
    }
  }

  if (!state.packageArtifactPath) {
    issues.push("Internal website package missing");
  }

  const boundary = await workspace.validateWorkspace();
  if (!boundary.valid) {
    issues.push(...boundary.issues);
  }

  const files = await workspace.listWorkspaceFiles();
  for (const file of files) {
    if (file.path.includes(".env")) {
      issues.push("Secret env file present");
    }
    const text = await workspace.readTextFile(file.path).catch(() => "");
    issues.push(...scanContentHonesty(text));
    if (/<form[^>]+action=["']https?:\/\//i.test(text)) {
      issues.push(`External form submission in ${file.path}`);
    }
  }

  const repro = await verifyBuildReproducibility(build);
  if (repro.status === "mismatched") {
    issues.push("Reproducibility mismatch");
  }

  const verdict = issues.length === 0 ? "pass" : "fail";

  if (verdict === "pass") {
    await admin
      .from("builds")
      .update({ review_status: "passed" })
      .eq("id", build.id)
      .eq("organization_id", build.organizationId);

    await upsertWebsiteBuildMetadata(admin, {
      organizationId: build.organizationId,
      buildId: build.id,
      projectType: website!.projectType,
      framework: website!.framework,
      state,
      qaStatus: "passed",
    });

    await emitBuildFactoryEvent(admin, {
      organizationId: build.organizationId,
      eventType: "website.review_completed",
      message: "Independent website QA passed",
      correlationId: context.correlationId,
      buildId: build.id,
      payload: { verdict },
    });
  } else {
    await admin
      .from("builds")
      .update({ review_status: "failed", status: "failed" })
      .eq("id", build.id)
      .eq("organization_id", build.organizationId);

    await upsertWebsiteBuildMetadata(admin, {
      organizationId: build.organizationId,
      buildId: build.id,
      projectType: website!.projectType,
      framework: website!.framework,
      state,
      qaStatus: "failed",
    });
  }

  return {
    structuredOutput: { verdict, issues, label: WEBSITE_INTERNAL_SOURCE_LABEL },
    artifactType: "qa_report",
    artifactPayload: {
      verdict,
      issues,
      build_id: build.id,
      reviewed_worker_result_id: workerResultId,
    },
    metrics: { reviewed_worker_result_id: workerResultId },
  };
}

export async function dispatchWebsiteWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult | null> {
  const key = context.capabilityKey;
  if (key.startsWith("website.generate_")) {
    return runWebsiteGenerationHandler(admin, context, key);
  }
  if (key.startsWith("website.validate_")) {
    return runWebsiteValidationHandler(admin, context, key);
  }
  if (key === "website.package_internal_source") {
    return runWebsitePackageInternalSource(admin, context);
  }
  if (key === "qa.verify_internal_website") {
    return runQaVerifyInternalWebsite(admin, context);
  }
  return null;
}
