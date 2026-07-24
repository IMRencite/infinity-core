import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { isLessonStatus, isLessonType } from "./constants";
import { emitIntelligenceEvent } from "./provenance";
import type { Lesson, ProvenanceContext } from "./types";

export type CreateLessonInput = ProvenanceContext & {
  title: string;
  lesson: string;
  lessonType: string;
  status?: string;
  confidenceScore?: number | null;
  supportingMemoryIds?: string[];
  supportingClaimIds?: string[];
  appliesTo?: Record<string, unknown>;
  recommendedAction?: string | null;
};

export async function createLesson(
  admin: AdminSupabaseClient,
  input: CreateLessonInput,
): Promise<Lesson> {
  if (!isLessonType(input.lessonType)) {
    throw new Error(`Invalid lesson type: ${input.lessonType}`);
  }

  const status = input.status ?? "active";
  if (!isLessonStatus(status)) {
    throw new Error(`Invalid lesson status: ${status}`);
  }

  const { data: lessonRecord, error } = await admin
    .from("lessons")
    .insert({
      organization_id: input.organizationId,
      title: input.title,
      lesson: input.lesson,
      lesson_type: input.lessonType,
      status,
      confidence_score: input.confidenceScore ?? null,
      supporting_memory_ids: (input.supportingMemoryIds ?? []) as Json,
      supporting_claim_ids: (input.supportingClaimIds ?? []) as Json,
      applies_to: (input.appliesTo ?? {}) as Json,
      recommended_action: input.recommendedAction ?? null,
    })
    .select("*")
    .single();

  if (error || !lessonRecord) {
    throw new Error(`Failed to create lesson: ${error?.message ?? "unknown error"}`);
  }

  await emitIntelligenceEvent(admin, input, {
    engineName: "research",
    eventType: "lesson.created",
    entityType: "lesson",
    entityId: lessonRecord.id,
    message: `Lesson created: ${lessonRecord.title}`,
    payload: {
      lesson_id: lessonRecord.id,
      lesson_type: lessonRecord.lesson_type,
      status: lessonRecord.status,
    },
  });

  return lessonRecord;
}
