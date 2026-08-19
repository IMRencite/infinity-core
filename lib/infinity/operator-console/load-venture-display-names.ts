import type { AdminSupabaseClient } from "@/lib/supabase/admin";

export type VentureDisplayNameRelations = {
  opportunityNameById: Map<string, string>;
  candidateTitleById: Map<string, string>;
  candidateRankById: Map<string, number>;
  queueRankByCandidateId: Map<string, number>;
  blueprintNameById: Map<string, string>;
  companyNameById: Map<string, string>;
};

type AssemblyNameRow = {
  opportunity_id?: string | null;
  venture_blueprint_id?: string | null;
  company_id?: string | null;
  identity_package?: Record<string, unknown> | null;
  manifest?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function readRank(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rank = Math.floor(value);
  return rank > 0 ? rank : null;
}

function candidateIdFromRecord(record: Record<string, unknown> | null | undefined): string | null {
  if (!record) return null;
  return (
    readId(record.opportunityCandidateId) ??
    readId(record.opportunity_candidate_id) ??
    readId(record.candidateId) ??
    readId(record.selectedCandidateId) ??
    readId(record.selected_candidate_id)
  );
}

export function candidateIdFromManifest(manifest: Record<string, unknown> | null | undefined): string | null {
  const record = asRecord(manifest);
  return (
    candidateIdFromRecord(record) ??
    candidateIdFromRecord(asRecord(record?.ventureIdentity)) ??
    candidateIdFromRecord(asRecord(record?.sourceLineage))
  );
}

export function candidateIdFromIdentity(identity: Record<string, unknown> | null | undefined): string | null {
  const record = asRecord(identity);
  return candidateIdFromRecord(record) ?? candidateIdFromRecord(asRecord(record?.sourceLineage));
}

export function blueprintIdFromManifest(manifest: Record<string, unknown> | null | undefined): string | null {
  const record = asRecord(manifest);
  return (
    readId(record?.companyBuilderBlueprintId) ??
    readId(record?.company_builder_blueprint_id) ??
    readId(record?.ventureBlueprintId) ??
    readId(record?.venture_blueprint_id)
  );
}

export function emptyVentureDisplayNameRelations(): VentureDisplayNameRelations {
  return {
    opportunityNameById: new Map(),
    candidateTitleById: new Map(),
    candidateRankById: new Map(),
    queueRankByCandidateId: new Map(),
    blueprintNameById: new Map(),
    companyNameById: new Map(),
  };
}

export async function loadVentureDisplayNameRelations(
  admin: AdminSupabaseClient,
  organizationId: string,
  rows: AssemblyNameRow[],
): Promise<VentureDisplayNameRelations> {
  const relations = emptyVentureDisplayNameRelations();
  if (rows.length === 0) return relations;

  const opportunityIds = uniqueIds(rows.map((row) => readId(row.opportunity_id)));
  const companyIds = uniqueIds(rows.map((row) => readId(row.company_id)));
  const blueprintIds = uniqueIds(
    rows.flatMap((row) => [readId(row.venture_blueprint_id), blueprintIdFromManifest(row.manifest)]),
  );
  const candidateIds = uniqueIds(
    rows.flatMap((row) => [
      candidateIdFromManifest(row.manifest),
      candidateIdFromIdentity(row.identity_package),
      readId(row.opportunity_id),
    ]),
  );

  const [opportunities, candidates, companyBlueprints, factoryBlueprints, companies, evaluations] = await Promise.all([
    opportunityIds.length
      ? admin.from("opportunities").select("id, name").eq("organization_id", organizationId).in("id", opportunityIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    candidateIds.length
      ? admin
          .from("opportunity_candidates")
          .select("id, title, rank_position")
          .eq("organization_id", organizationId)
          .in("id", candidateIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; rank_position: number | null }> }),
    blueprintIds.length
      ? admin
          .from("company_builder_blueprints")
          .select("id, venture_name_working, opportunity_candidate_id")
          .eq("organization_id", organizationId)
          .in("id", blueprintIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; venture_name_working: string; opportunity_candidate_id: string | null }>,
        }),
    blueprintIds.length
      ? admin.from("venture_blueprints").select("id, blueprint").eq("organization_id", organizationId).in("id", blueprintIds)
      : Promise.resolve({ data: [] as Array<{ id: string; blueprint: unknown }> }),
    companyIds.length
      ? admin.from("companies").select("id, name").eq("organization_id", organizationId).in("id", companyIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    candidateIds.length
      ? admin
          .from("candidate_selection_evaluations")
          .select("opportunity_candidate_id, queue_rank, created_at")
          .eq("organization_id", organizationId)
          .in("opportunity_candidate_id", candidateIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as Array<{ opportunity_candidate_id: string; queue_rank: number | null; created_at: string }>,
        }),
  ]);

  for (const row of opportunities.data ?? []) {
    if (typeof row.name === "string" && row.name.trim()) relations.opportunityNameById.set(row.id, row.name.trim());
  }
  for (const row of candidates.data ?? []) {
    if (typeof row.title === "string" && row.title.trim()) relations.candidateTitleById.set(row.id, row.title.trim());
    const rank = readRank(row.rank_position);
    if (rank != null) relations.candidateRankById.set(row.id, rank);
  }
  const extraCandidateIds: string[] = [];
  for (const row of companyBlueprints.data ?? []) {
    if (typeof row.venture_name_working === "string" && row.venture_name_working.trim()) {
      relations.blueprintNameById.set(row.id, row.venture_name_working.trim());
    }
    const candidateId = readId(row.opportunity_candidate_id);
    if (candidateId && !relations.candidateTitleById.has(candidateId)) extraCandidateIds.push(candidateId);
  }
  for (const row of factoryBlueprints.data ?? []) {
    const blueprint = asRecord(row.blueprint);
    const name = readId(blueprint?.name);
    if (name) relations.blueprintNameById.set(row.id, name);
  }
  for (const row of companies.data ?? []) {
    if (typeof row.name === "string" && row.name.trim()) relations.companyNameById.set(row.id, row.name.trim());
  }
  for (const row of evaluations.data ?? []) {
    if (relations.queueRankByCandidateId.has(row.opportunity_candidate_id)) continue;
    const rank = readRank(row.queue_rank);
    if (rank != null) relations.queueRankByCandidateId.set(row.opportunity_candidate_id, rank);
  }

  if (extraCandidateIds.length > 0) {
    const extra = await admin
      .from("opportunity_candidates")
      .select("id, title, rank_position")
      .eq("organization_id", organizationId)
      .in("id", uniqueIds(extraCandidateIds));
    for (const row of extra.data ?? []) {
      if (typeof row.title === "string" && row.title.trim()) relations.candidateTitleById.set(row.id, row.title.trim());
      const rank = readRank(row.rank_position);
      if (rank != null) relations.candidateRankById.set(row.id, rank);
    }
  }

  return relations;
}
