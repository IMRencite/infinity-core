"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFounderIdeaOrg } from "./org";
import { FounderIdeaStore } from "@/lib/infinity/founder-idea-lab/store";
import { submitFounderIdea } from "@/lib/infinity/founder-idea-lab/submit";
import { analyzeFounderIdea } from "@/lib/infinity/founder-idea-lab/analyze";
import { convertFounderIdeaToCandidate } from "@/lib/infinity/founder-idea-lab/convert";
import { applyFounderDecision, founderActionsFor } from "@/lib/infinity/founder-idea-lab/decide";
import { routeFounderBuild } from "@/lib/infinity/founder-idea-lab/build-route";
import { persistFounderIdea } from "@/lib/infinity/founder-idea-lab/persist";
import { loadFounderIdeaStoreForOrg } from "@/lib/infinity/founder-idea-lab/hq/load";
import { reanalyzeFounderIdea } from "@/lib/infinity/founder-idea-lab/reanalyze";
import type { FounderAction } from "@/lib/infinity/founder-idea-lab/constants";
import type { FounderIdeaDesiredMode } from "@/lib/infinity/founder-idea-lab/constants";

export type FounderIdeaActionState = {
  ok: boolean;
  message: string;
  submissionId?: string;
};

function parseMode(value: FormDataEntryValue | null): FounderIdeaDesiredMode {
  if (value === "GRADE_AND_VALIDATE" || value === "GRADE_AND_BUILD_IF_READY") return value;
  return "GRADE_ONLY";
}

export async function analyzeFounderIdeaAction(
  _prev: FounderIdeaActionState,
  formData: FormData,
): Promise<FounderIdeaActionState> {
  const org = await requireFounderIdeaOrg();
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  try {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, {
      organizationId: org.organizationId,
      submittedByUserId: org.userId,
      title,
      description,
      targetCustomer: String(formData.get("targetCustomer") ?? "") || null,
      problem: String(formData.get("problem") ?? "") || null,
      proposedSolution: String(formData.get("proposedSolution") ?? "") || null,
      businessModelHypothesis: String(formData.get("businessModelHypothesis") ?? "") || null,
      pricingHypothesis: String(formData.get("pricingHypothesis") ?? "") || null,
      competitors: String(formData.get("competitors") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      desiredMode: parseMode(formData.get("desiredMode")),
      idempotencyKey: `founder-submit:${org.organizationId}:${title.trim().toLowerCase()}:${description.trim().toLowerCase().slice(0, 80)}`,
    });
    convertFounderIdeaToCandidate(store, submission);
    analyzeFounderIdea(store, submission);
    const admin = createAdminClient();
    const persisted = await persistFounderIdea(
      admin as never,
      submission,
      store.grades.get(submission.id) ?? null,
      null,
      store.candidates.get(submission.opportunityCandidateId ?? "") ?? null,
    );
    if (!persisted.ok) {
      return { ok: false, message: persisted.error ?? "Persist failed", submissionId: submission.id };
    }
    revalidatePath("/dashboard/founder-ideas");
    revalidatePath("/dashboard");
    return { ok: true, message: "Idea analyzed", submissionId: submission.id };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "ANALYZE_FAILED" };
  }
}

export async function decideFounderIdeaAction(
  _prev: FounderIdeaActionState,
  formData: FormData,
): Promise<FounderIdeaActionState> {
  const org = await requireFounderIdeaOrg();
  const submissionId = String(formData.get("submissionId") ?? "");
  const action = String(formData.get("action") ?? "") as FounderAction;
  const reason = String(formData.get("reason") ?? "") || null;
  const riskAcknowledged = formData.get("riskAcknowledged") === "on";
  try {
    const admin = createAdminClient();
    const store = await loadFounderIdeaStoreForOrg(admin as never, org.organizationId);
    const existing = store.submissions.get(submissionId);
    if (!existing) return { ok: false, message: "FOUNDER_IDEA_NOT_FOUND" };
    if (existing.infinityDecision && !founderActionsFor(existing.infinityDecision).includes(action)) {
      return { ok: false, message: "ACTION_NOT_ALLOWED" };
    }
    const result = applyFounderDecision(store, {
      submissionId,
      action,
      actorUserId: org.userId,
      actorOrganizationId: org.organizationId,
      reason,
      riskAcknowledged,
    });
    if (result.submission.founderDecision === "BUILD") {
      routeFounderBuild(store, result.submission);
    }
    const persisted = await persistFounderIdea(
      admin as never,
      result.submission,
      store.grades.get(result.submission.id) ?? null,
      result.override,
      store.candidates.get(result.submission.opportunityCandidateId ?? "") ?? null,
    );
    if (!persisted.ok) return { ok: false, message: persisted.error ?? "Persist failed" };
    revalidatePath("/dashboard/founder-ideas");
    revalidatePath("/dashboard");
    return { ok: true, message: "Decision recorded", submissionId };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "DECIDE_FAILED" };
  }
}

export async function reanalyzeFounderIdeaAction(
  _prev: FounderIdeaActionState,
  formData: FormData,
): Promise<FounderIdeaActionState> {
  const org = await requireFounderIdeaOrg();
  const submissionId = String(formData.get("submissionId") ?? "");
  try {
    const admin = createAdminClient();
    const store = await loadFounderIdeaStoreForOrg(admin as never, org.organizationId);
    const existing = store.submissions.get(submissionId);
    if (!existing) return { ok: false, message: "FOUNDER_IDEA_NOT_FOUND" };
    convertFounderIdeaToCandidate(store, existing);
    const result = reanalyzeFounderIdea(store, existing, {});
    const persisted = await persistFounderIdea(
      admin as never,
      result.submission,
      result.grade,
      null,
      store.candidates.get(result.submission.opportunityCandidateId ?? "") ?? null,
    );
    if (!persisted.ok) return { ok: false, message: persisted.error ?? "Persist failed", submissionId };
    revalidatePath("/dashboard/founder-ideas");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: result.grade?.readyForDecision ? "Reanalysis complete" : "Reanalysis recorded; evidence still insufficient (no paid research executed)",
      submissionId,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "REANALYZE_FAILED" };
  }
}
