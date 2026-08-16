import type { AiBrainMissionProposal, CanonicalMissionDraft } from "./types";

export function transformMissionProposalToCanonicalDraft(input: {
  organizationId: string;
  reasoningRunId: string;
  missionProposal: AiBrainMissionProposal;
}): CanonicalMissionDraft {
  const { missionProposal, reasoningRunId } = input;

  return {
    title: missionProposal.missionTitle.trim(),
    description: missionProposal.missionObjective.trim(),
    objectives: [
      {
        key: missionProposal.missionType,
        description: missionProposal.missionObjective.trim(),
      },
      ...missionProposal.successCriteria.map((criterion, index) => ({
        key: `success_criterion_${index + 1}`,
        description: criterion,
      })),
    ],
    constraints: {
      ai_brain_v1: true,
      mission_type: missionProposal.missionType,
      priority: missionProposal.priority,
      proposed_steps: missionProposal.proposedSteps,
      explicit_constraints: missionProposal.constraints,
      creates_ventures: false,
      auto_execute: false,
      organization_id: input.organizationId,
    },
    status: "draft",
    activate: false,
    provenance: {
      reasoningRunId,
      missionType: missionProposal.missionType,
      missionProposalSource: "ai_brain_v1",
      autoExecute: false,
    },
  };
}

export function canonicalDraftToCreateMissionInput(input: {
  organizationId: string;
  draft: CanonicalMissionDraft;
}) {
  return {
    organizationId: input.organizationId,
    title: input.draft.title,
    description: input.draft.description,
    objectives: input.draft.objectives,
    constraints: input.draft.constraints,
    activate: false as const,
  };
}
