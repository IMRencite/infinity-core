import { FounderIdeaStore } from "../store";
import { hydrateFounderStore, type FounderDecisionOverrideRow, type FounderIdeaSubmissionRow } from "../persistence";
import { buildFounderIdeaArtifacts } from "./artifacts";
import type { HqRoomArtifactMap } from "@/lib/infinity/operator-console/artifacts/types";

type LooseAdmin = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
    };
    upsert?: (row: unknown, opts?: unknown) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

export async function loadFounderIdeaHqArtifacts(
  admin: LooseAdmin,
  organizationId: string,
): Promise<HqRoomArtifactMap> {
  const store = await loadFounderIdeaStoreForOrg(admin, organizationId);
  return buildFounderIdeaArtifacts(store, organizationId);
}

export async function loadFounderIdeaStoreForOrg(
  admin: LooseAdmin,
  organizationId: string,
): Promise<FounderIdeaStore> {
  const store = new FounderIdeaStore();
  try {
    const submissions = await admin.from("founder_idea_submissions").select("*").eq("organization_id", organizationId);
    if (submissions.error) return store;
    const overrides = await admin.from("founder_decision_overrides").select("*").eq("organization_id", organizationId);
    return hydrateFounderStore(
      store,
      (submissions.data as FounderIdeaSubmissionRow[] | null) ?? [],
      (overrides.data as FounderDecisionOverrideRow[] | null) ?? [],
    );
  } catch {
    return store;
  }
}
