import { requireFounderIdeaOrg } from "./org";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFounderIdeaStoreForOrg } from "@/lib/infinity/founder-idea-lab/hq/load";
import { buildFounderIdeaArtifacts, listFounderIdeas } from "@/lib/infinity/founder-idea-lab/hq/artifacts";
import { founderActionsFor, validationPlanFor } from "@/lib/infinity/founder-idea-lab/decide";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { FounderIdeaLab } from "@/components/dashboard/founder-ideas/founder-idea-lab";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { FounderAction } from "@/lib/infinity/founder-idea-lab/constants";

export default async function FounderIdeasPage() {
  const org = await requireFounderIdeaOrg();
  const admin = createAdminClient();
  const store = await loadFounderIdeaStoreForOrg(admin as never, org.organizationId);
  const rows = listFounderIdeas(store, org.organizationId);
  const artifacts = Object.values(buildFounderIdeaArtifacts(store, org.organizationId)).flat();
  const details: Record<string, { artifact: HqWorkArtifact; detail: HQEntityDetail }> = {};
  const decisions: Record<
    string,
    {
      id: string;
      infinityDecision: string;
      founderDecision: string;
      origin: string;
      status: string;
      actions: FounderAction[];
      blockingAssumptions: string[];
      plannedValidation: string[];
      expectedCostUsd: number | null;
      expectedInformationGain: string[];
    }
  > = {};

  for (const submission of store.scoped(org.organizationId)) {
    const artifact = artifacts.find(
      (item) => item.artifactType === "founder_idea" && item.sourceRecordId === submission.id,
    );
    if (artifact) {
      const inspector = buildArtifactInspectorModel(artifact, artifacts);
      details[submission.id] = { artifact, detail: buildEntityDetail(inspector) };
    }
    const plan = validationPlanFor(store, submission.id);
    decisions[submission.id] = {
      id: submission.id,
      infinityDecision: submission.infinityDecision ?? "UNKNOWN",
      founderDecision: submission.founderDecision ? String(submission.founderDecision) : "UNKNOWN",
      origin: submission.origin,
      status: submission.status,
      actions: submission.infinityDecision ? founderActionsFor(submission.infinityDecision) : [],
      blockingAssumptions: plan.blockingAssumptions,
      plannedValidation: plan.plannedValidation,
      expectedCostUsd: plan.expectedCostUsd,
      expectedInformationGain: plan.expectedInformationGain,
    };
  }

  return <FounderIdeaLab rows={rows} decisions={decisions} details={details} />;
}
