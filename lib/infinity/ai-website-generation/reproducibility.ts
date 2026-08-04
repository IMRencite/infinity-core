import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { PersistedBuild } from "@/lib/infinity/build-factory/types";
import { openBuildWorkspace, loadBuildById } from "@/lib/infinity/build-factory/workspace";
import { verifyBuildReproducibility } from "@/lib/infinity/build-factory/reproducibility";
import { WEBSITE_STATE_DIR } from "@/lib/infinity/website-builder/constants";
import { buildAiWebsiteGenerationContext } from "./context";
import { loadApprovedAiWebsitePlanForBuild } from "./persistence";
import type { TranslatedWebsiteModel } from "./types";
import { translateApprovedPlanToWebsiteModel } from "./translator";
import { hashPlanOutput } from "./planner";

export type AiWebsiteReproducibilityStatus = "reproducible" | "mismatched" | "incomplete";

export type AiWebsiteReproducibilityReport = {
  status: AiWebsiteReproducibilityStatus;
  issues: string[];
};

export async function verifyAiWebsiteBuildReproducibility(
  admin: AdminSupabaseClient,
  build: PersistedBuild,
): Promise<AiWebsiteReproducibilityReport> {
  const issues: string[] = [];
  const aiEnabled = build.specification.aiWebsiteGeneration?.enabled ?? false;
  if (!aiEnabled) {
    return { status: "incomplete", issues: ["AI website generation not enabled on build"] };
  }

  const plan = await loadApprovedAiWebsitePlanForBuild(admin, build.organizationId, build.id);
  if (!plan || plan.reviewStatus !== "approved") {
    issues.push("Approved AI generation plan required for reproducibility verification");
    return { status: "incomplete", issues };
  }

  const bundle = await buildAiWebsiteGenerationContext(admin, {
    organizationId: build.organizationId,
    build,
  });
  if (bundle.contextHash !== plan.contextHash) {
    issues.push("Context hash no longer matches approved AI generation plan");
  }

  const workspace = openBuildWorkspace(build);
  let translatedRaw: TranslatedWebsiteModel | null = null;
  try {
    translatedRaw = JSON.parse(
      await workspace.readTextFile(`${WEBSITE_STATE_DIR}/ai-translated-model.json`),
    ) as TranslatedWebsiteModel;
  } catch {
    issues.push("Translated model file missing");
  }

  if (translatedRaw && plan.structuredPlan) {
    const expected = translateApprovedPlanToWebsiteModel({
      planId: plan.id,
      contextHash: plan.contextHash,
      outputHash: plan.outputHash ?? hashPlanOutput(plan.structuredPlan),
      payload: plan.structuredPlan,
    });
    if (expected.translationHash !== plan.translationHash) {
      issues.push("Stored plan translation_hash does not match approved translation");
    }
    if (translatedRaw.translationHash !== expected.translationHash) {
      issues.push("Workspace translated model hash differs from approved translation");
    }
    if (translatedRaw.contextHash !== plan.contextHash) {
      issues.push("Workspace translated model context_hash differs from approved plan");
    }
  }

  const manifestRepro = await verifyBuildReproducibility(build);
  if (manifestRepro.status === "mismatched") {
    issues.push("Generated file hashes differ from build manifest");
    issues.push(...manifestRepro.details);
  }

  if (build.currentSnapshotId) {
    const files = await workspace.listWorkspaceFiles();
    const { hashJson } = await import("@/lib/infinity/build-factory/paths");
    const workspaceRootHash = hashJson(files);
    const { data: snap } = await admin
      .from("build_snapshots")
      .select("root_hash")
      .eq("organization_id", build.organizationId)
      .eq("id", build.currentSnapshotId)
      .maybeSingle();
    if (snap?.root_hash && snap.root_hash !== workspaceRootHash) {
      issues.push("Snapshot root hash does not match current workspace files");
    }
  }

  if (issues.length === 0) {
    return { status: "reproducible", issues: [] };
  }
  return {
    status: issues.some((i) => i.includes("hash") || i.includes("manifest")) ? "mismatched" : "incomplete",
    issues,
  };
}

export async function verifyAiWebsiteBuildReproducibilityById(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<AiWebsiteReproducibilityReport> {
  const build = await loadBuildById(admin, organizationId, buildId);
  if (!build) {
    return { status: "incomplete", issues: ["Build not found"] };
  }
  return verifyAiWebsiteBuildReproducibility(admin, build);
}
