import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  EvidenceRecord,
  IntelligenceSummary,
  KnowledgeRecord,
  Lesson,
} from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function listRecentEvidence(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 10,
): Promise<EvidenceRecord[]> {
  const { data, error } = await supabase
    .from("evidence_records")
    .select("*")
    .eq("organization_id", organizationId)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list recent evidence: ${error.message}`);
  }

  return data ?? [];
}

export async function listActiveKnowledge(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 10,
): Promise<KnowledgeRecord[]> {
  const { data, error } = await supabase
    .from("knowledge_records")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list active knowledge: ${error.message}`);
  }

  return data ?? [];
}

export async function listRecentLessons(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 10,
): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list recent lessons: ${error.message}`);
  }

  return data ?? [];
}

export async function calculateIntelligenceSummary(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<IntelligenceSummary> {
  const [
    { count: evidenceCount, error: evidenceError },
    { count: claimCount, error: claimError },
    { count: supportedClaims, error: supportedError },
    { count: contradictedClaims, error: contradictedError },
    { count: activeKnowledgeCount, error: knowledgeError },
    { count: memoryCount, error: memoryError },
    { count: activeLessonCount, error: lessonError },
    { count: activeProcedureCount, error: procedureError },
  ] = await Promise.all([
    supabase
      .from("evidence_records")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("claims")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("claims")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "supported"),
    supabase
      .from("claims")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "contradicted"),
    supabase
      .from("knowledge_records")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("memory_records")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("procedures")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
  ]);

  const firstError =
    evidenceError ??
    claimError ??
    supportedError ??
    contradictedError ??
    knowledgeError ??
    memoryError ??
    lessonError ??
    procedureError;

  if (firstError) {
    throw new Error(`Failed to calculate intelligence summary: ${firstError.message}`);
  }

  return {
    evidenceCount: evidenceCount ?? 0,
    claimCount: claimCount ?? 0,
    supportedClaims: supportedClaims ?? 0,
    contradictedClaims: contradictedClaims ?? 0,
    activeKnowledgeCount: activeKnowledgeCount ?? 0,
    memoryCount: memoryCount ?? 0,
    activeLessonCount: activeLessonCount ?? 0,
    activeProcedureCount: activeProcedureCount ?? 0,
  };
}
