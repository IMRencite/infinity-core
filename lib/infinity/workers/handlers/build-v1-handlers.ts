import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  loadBuildById,
  openBuildWorkspace,
  deriveWorkspaceReferenceForBuild,
} from "@/lib/infinity/build-factory/workspace";
import { updateBuildStatus } from "@/lib/infinity/build-factory/lifecycle";
import { emitBuildFactoryEvent } from "@/lib/infinity/build-factory/events";
import { getBuildTemplate } from "@/lib/infinity/build-factory/template-registry";
import { validateManifestAgainstWorkspace } from "@/lib/infinity/build-factory/validation";
import { createBuildSnapshot } from "@/lib/infinity/build-factory/snapshots";
import { isWebsiteV1ProjectType } from "@/lib/infinity/website-builder/types";
import { createPermissionEnforcer } from "../permissions";
import { requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";

async function loadBuildForContext(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<NonNullable<Awaited<ReturnType<typeof loadBuildById>>>> {
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
  return build;
}

export async function runBuildWorkspaceInitialize(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");

  const build = await loadBuildForContext(admin, context);
  const workspace = openBuildWorkspace(build);
  await workspace.createDirectory(".");
  const reference = deriveWorkspaceReferenceForBuild(
    build.organizationId,
    build.missionId,
    build.id,
  );

  await updateBuildStatus(admin, build.organizationId, build.id, "workspace_ready", {
    workspace_reference: reference,
  });

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "build.workspace_created",
    message: "Internal build workspace initialized",
    correlationId: context.correlationId,
    buildId: build.id,
    payload: { workspace_reference: reference },
  });

  return {
    structuredOutput: { workspace_reference: reference, initialized: true },
    artifactType: "workspace_file_manifest",
    artifactPayload: { workspace_reference: reference },
  };
}

export async function runBuildPersistSpecification(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");

  const build = await loadBuildForContext(admin, context);
  const workspace = openBuildWorkspace(build);
  const json = JSON.stringify(build.specification, null, 2);
  await workspace.writeTextFile("build-specification.json", json);

  await updateBuildStatus(admin, build.organizationId, build.id, "specified");

  return {
    structuredOutput: {
      specification_path: "build-specification.json",
      specification_hash: build.specificationHash,
    },
    artifactType: "build_specification",
    artifactPayload: { specification_hash: build.specificationHash },
  };
}

export async function runBuildPersistManifest(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");

  const build = await loadBuildForContext(admin, context);
  const workspace = openBuildWorkspace(build);
  const json = JSON.stringify(build.manifest, null, 2);
  await workspace.writeTextFile("build-manifest.json", json);

  await updateBuildStatus(admin, build.organizationId, build.id, "manifest_ready");

  return {
    structuredOutput: {
      manifest_path: "build-manifest.json",
      manifest_hash: build.manifestHash,
    },
    artifactType: "build_manifest",
    artifactPayload: { manifest_hash: build.manifestHash },
  };
}

export async function runBuildGenerateTemplateScaffold(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");

  const build = await loadBuildForContext(admin, context);
  const template = getBuildTemplate(build.templateKey, build.templateVersion);
  const workspace = openBuildWorkspace(build);
  const written: string[] = [];

  await updateBuildStatus(admin, build.organizationId, build.id, "scaffolding");

  for (const dir of template.directories) {
    await workspace.createDirectory(dir);
  }

  for (const [filePath, content] of Object.entries(template.files)) {
    let body = content;
    if (filePath === "build-specification.json") {
      body = JSON.stringify(build.specification, null, 2);
    }
    if (filePath === "build-manifest.json") {
      body = JSON.stringify(build.manifest, null, 2);
    }
    await workspace.writeTextFile(filePath, body);
    written.push(filePath);
  }

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "build.scaffold_generated",
    message: "Template scaffold generated (internal only)",
    correlationId: context.correlationId,
    buildId: build.id,
    payload: { template_key: template.key, files_written: written.length },
  });

  return {
    structuredOutput: { files_written: written, template_key: template.key },
    artifactType: "internal_build_package",
    artifactPayload: {
      label: "Internal build package — not deployed or published.",
      files: written,
    },
  };
}

export async function runBuildValidateManifest(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.read");

  const build = await loadBuildForContext(admin, context);
  const workspace = openBuildWorkspace(build);
  const files = await workspace.listWorkspaceFiles();

  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType: "build.validation_started",
    message: "Manifest validation started",
    correlationId: context.correlationId,
    buildId: build.id,
  });

  await updateBuildStatus(admin, build.organizationId, build.id, "validating");

  const result = validateManifestAgainstWorkspace({
    manifest: build.manifest,
    files,
  });

  const eventType = result.valid ? "build.validation_completed" : "build.validation_failed";
  await emitBuildFactoryEvent(admin, {
    organizationId: build.organizationId,
    eventType,
    message: result.valid ? "Manifest validation passed" : "Manifest validation failed",
    correlationId: context.correlationId,
    buildId: build.id,
    payload: { issues: result.issues },
    severity: result.valid ? "info" : "error",
  });

  if (!result.valid) {
    await updateBuildStatus(admin, build.organizationId, build.id, "failed", {
      failed_at: new Date().toISOString(),
      error: { issues: result.issues } as Json,
    });
  }

  return {
    structuredOutput: { valid: result.valid, issues: result.issues },
    artifactType: "validation_report",
    artifactPayload: { valid: result.valid, issues: result.issues },
  };
}

export async function runBuildSnapshotWorkspace(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");

  const build = await loadBuildForContext(admin, context);
  if (isWebsiteV1ProjectType(build.projectType)) {
    const fresh = await loadBuildById(admin, build.organizationId, build.id);
    if (!fresh || fresh.reviewStatus !== "passed") {
      throw new Error("Website build snapshot requires passed independent QA");
    }
  }

  const snapshotId = await createBuildSnapshot(
    admin,
    build,
    null,
    context.correlationId,
  );

  if (!isWebsiteV1ProjectType(build.projectType)) {
    await emitBuildFactoryEvent(admin, {
      organizationId: build.organizationId,
      eventType: "build.review_requested",
      message: "Independent QA required for internal build",
      correlationId: context.correlationId,
      buildId: build.id,
    });
  }

  return {
    structuredOutput: { snapshot_id: snapshotId, root_hash: build.manifestHash },
    artifactType: "snapshot_manifest",
    artifactPayload: { snapshot_id: snapshotId },
  };
}

export async function runQaVerifyInternalBuild(
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
    .select("id, worker_run_id, capability_key, structured_output")
    .eq("organization_id", context.organizationId)
    .eq("id", workerResultId)
    .maybeSingle();

  if (target?.worker_run_id === context.workerRunId) {
    throw new Error("QA worker cannot review its own worker run output");
  }

  const workspace = openBuildWorkspace(build);
  const issues: string[] = [];

  try {
    await workspace.readTextFile("build-specification.json");
  } catch {
    issues.push("Specification file missing");
  }
  try {
    await workspace.readTextFile("build-manifest.json");
  } catch {
    issues.push("Manifest file missing");
  }

  const template = getBuildTemplate(build.templateKey, build.templateVersion);
  const files = await workspace.listWorkspaceFiles();
  const paths = new Set(files.map((f) => f.path));
  for (const required of template.requiredFiles) {
    if (!paths.has(required)) {
      issues.push(`Missing file: ${required}`);
    }
  }

  for (const file of files) {
    if (file.path.includes(".env")) {
      issues.push("Prohibited env file present");
    }
    if (file.path.includes("vercel.json") && file.path.includes("deploy")) {
      issues.push("Deployment configuration detected");
    }
  }

  const boundary = await workspace.validateWorkspace();
  if (!boundary.valid) {
    issues.push(...boundary.issues);
  }

  const verdict = issues.length === 0 ? "pass" : "fail";

  if (verdict === "pass") {
    await admin
      .from("builds")
      .update({ review_status: "passed" })
      .eq("id", build.id)
      .eq("organization_id", build.organizationId);

    await emitBuildFactoryEvent(admin, {
      organizationId: build.organizationId,
      eventType: "build.review_completed",
      message: "Independent QA passed",
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
  }

  return {
    structuredOutput: { verdict, issues },
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

async function runQaVerifyGenericInternalBuild(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  const buildId = requireStringField(input, "build_id");
  const buildJobId = String(input.build_job_id ?? "");

  const issues: string[] = [];
  const build = await loadBuildById(admin, context.organizationId, buildId);

  if (!build) {
    issues.push("build_not_found");
  }
  if (!buildJobId) {
    issues.push("build_job_id_required");
  }

  if (build && buildJobId) {
    const { data: job } = await admin
      .from("build_jobs")
      .select("id, builder_key, status, product_qa_status")
      .eq("id", buildJobId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (!job) {
      issues.push("build_job_not_found");
    } else if (!job.builder_key.startsWith("website.internal")) {
      issues.push("builder_adapter_mismatch");
    }

    if (build.reviewStatus !== "passed") {
      issues.push("product_qa_not_passed");
    }

    if (job) {
      await admin
        .from("build_jobs")
        .update({
          product_qa_status: build.reviewStatus === "passed" ? "passed" : "pending",
          generic_qa_status: issues.length === 0 ? "passed" : "failed",
        })
        .eq("id", buildJobId)
        .eq("organization_id", context.organizationId);
    }
  }

  const verdict = issues.length === 0 ? "pass" : "fail";

  if (build && verdict === "pass") {
    await emitBuildFactoryEvent(admin, {
      organizationId: context.organizationId,
      eventType: "build_factory.qa_completed",
      message: "Generic Build Factory QA passed",
      correlationId: context.correlationId,
      buildId: build.id,
      payload: { build_job_id: buildJobId, layer: "generic" },
    });
  }

  return {
    structuredOutput: { verdict, issues },
    artifactType: "qa_report",
    artifactPayload: {
      verdict,
      issues,
      build_id: buildId,
      build_job_id: buildJobId,
      layer: "generic_internal_build",
    },
    metrics: { build_job_id: buildJobId },
  };
}

export async function dispatchBuildWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult | null> {
  switch (context.capabilityKey) {
    case "build.workspace_initialize":
      return runBuildWorkspaceInitialize(admin, context);
    case "build.persist_specification":
      return runBuildPersistSpecification(admin, context);
    case "build.persist_manifest":
      return runBuildPersistManifest(admin, context);
    case "build.generate_template_scaffold":
      return runBuildGenerateTemplateScaffold(admin, context);
    case "build.validate_manifest":
      return runBuildValidateManifest(admin, context);
    case "build.snapshot_workspace":
      return runBuildSnapshotWorkspace(admin, context);
    case "qa.verify_internal_build":
      return runQaVerifyInternalBuild(admin, context);
    case "qa.verify_generic_internal_build":
      return runQaVerifyGenericInternalBuild(admin, context);
    default:
      return null;
  }
}
