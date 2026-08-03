import type { MissionRuntimeStage } from "./constants";
import type {
  MissionRuntimeContext,
  MissionRuntimeInstance,
  StageEvaluation,
  StageInspectionSnapshot,
} from "./types";

function idempotencyKey(instance: MissionRuntimeInstance, suffix: string): string {
  return `runtime:${instance.id}:${instance.currentStage}:${suffix}`;
}

function hasIdempotency(context: MissionRuntimeContext, key: string): boolean {
  return context.idempotency[key] === true;
}

export function evaluateStage(
  instance: MissionRuntimeInstance,
  inspection: StageInspectionSnapshot,
): StageEvaluation {
  const stage = instance.currentStage;
  const context = instance.context;

  switch (stage) {
    case "command": {
      if (!inspection.missionActive) {
        return {
          outcome: { kind: "block", reason: "Mission is not active." },
          workRequest: { kind: "none" },
        };
      }

      const key = idempotencyKey(instance, "command_cycle");
      if (!hasIdempotency(context, key)) {
        return {
          outcome: {
            kind: "wait",
            reason: "Command cycle requested for strategic intent.",
          },
          workRequest: { kind: "command_autonomous", idempotencyKey: key },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "discovery", reason: "Command context recorded." },
        workRequest: { kind: "none" },
      };
    }

    case "discovery": {
      if (inspection.hasPendingDiscoveryJobs) {
        return {
          outcome: { kind: "wait", reason: "Discovery jobs in progress." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      const key = idempotencyKey(instance, "discovery_cycle");
      if (!hasIdempotency(context, key) && !inspection.hasCompletedPlanStepJob) {
        return {
          outcome: { kind: "wait", reason: "Discovery work requested." },
          workRequest: { kind: "command_discovery", idempotencyKey: key },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "evaluation", reason: "Discovery stage complete." },
        workRequest: { kind: "none" },
      };
    }

    case "evaluation": {
      if (inspection.hasPendingDecisionJobs) {
        return {
          outcome: { kind: "wait", reason: "Decision evaluation jobs running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "allocation", reason: "Evaluation complete." },
        workRequest: { kind: "none" },
      };
    }

    case "allocation": {
      if (!inspection.allocationProposalRecorded) {
        const key = idempotencyKey(instance, "allocation_proposal");
        if (!hasIdempotency(context, key)) {
          return {
            outcome: { kind: "wait", reason: "Allocation proposal required (no spend)." },
            workRequest: { kind: "command_autonomous", idempotencyKey: key },
          };
        }
      }

      return {
        outcome: { kind: "advance", nextStage: "validation", reason: "Allocation proposal recorded." },
        workRequest: { kind: "none" },
      };
    }

    case "validation": {
      if (inspection.hasPendingValidationJobs) {
        return {
          outcome: { kind: "wait", reason: "Validation jobs running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (!inspection.latestValidationApprovedForPlanning) {
        return {
          outcome: {
            kind: "block",
            reason: "Validation must be approved_for_planning before reasoning/executive/planning.",
          },
          workRequest: { kind: "none" },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "reasoning", reason: "Validation gate satisfied." },
        workRequest: { kind: "none" },
      };
    }

    case "reasoning": {
      const key = idempotencyKey(instance, "deterministic_reasoning");
      if (!inspection.hasDeterministicReasoningComplete && !hasIdempotency(context, key)) {
        return {
          outcome: { kind: "wait", reason: "Deterministic reasoning requested." },
          workRequest: { kind: "deterministic_reasoning", idempotencyKey: key },
        };
      }

      if (!inspection.hasDeterministicReasoningComplete && hasIdempotency(context, key)) {
        return {
          outcome: { kind: "wait", reason: "Deterministic reasoning in progress." },
          workRequest: { kind: "none" },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "executive", reason: "Deterministic reasoning complete." },
        workRequest: { kind: "none" },
      };
    }

    case "executive": {
      if (inspection.hasPendingExecutiveJobs) {
        return {
          outcome: { kind: "wait", reason: "Executive evaluation jobs running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (inspection.hasExecutiveRejectOrDefer) {
        return {
          outcome: { kind: "block", reason: "Executive rejected or deferred opportunity." },
          workRequest: { kind: "none" },
        };
      }

      if (!inspection.hasExecutiveApproveOrQueue) {
        return {
          outcome: { kind: "wait", reason: "Executive decision required." },
          workRequest: { kind: "command_autonomous", idempotencyKey: idempotencyKey(instance, "executive") },
        };
      }

      if (!inspection.latestValidationApprovedForPlanning) {
        return {
          outcome: { kind: "block", reason: "Executive gate blocked: validation no longer approved." },
          workRequest: { kind: "none" },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "planning", reason: "Executive gate satisfied." },
        workRequest: { kind: "none" },
      };
    }

    case "planning": {
      if (!inspection.hasPlannerEligiblePlan) {
        return {
          outcome: { kind: "wait", reason: "Planner gate: eligible plan not ready." },
          workRequest: { kind: "command_autonomous", idempotencyKey: idempotencyKey(instance, "planning") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "scheduling", reason: "Planner gate satisfied." },
        workRequest: { kind: "none" },
      };
    }

    case "scheduling": {
      if (
        inspection.hasPendingDiscoveryJobs ||
        inspection.hasPendingDecisionJobs ||
        inspection.hasPendingValidationJobs ||
        inspection.hasPendingExecutiveJobs
      ) {
        return {
          outcome: { kind: "wait", reason: "Scheduled engine jobs still pending." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "execution", reason: "Scheduling stage complete." },
        workRequest: { kind: "none" },
      };
    }

    case "execution": {
      if (inspection.hasPendingBuildJobs) {
        return {
          outcome: {
            kind: "block",
            reason: "Build Factory capabilities are not implemented; mission blocked at execution.",
          },
          workRequest: { kind: "none" },
        };
      }

      if (
        inspection.hasPendingDiscoveryJobs ||
        inspection.hasPendingDecisionJobs ||
        inspection.hasPendingValidationJobs ||
        inspection.hasPendingExecutiveJobs
      ) {
        return {
          outcome: { kind: "wait", reason: "Safe execution jobs still running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "review", reason: "Execution observations complete." },
        workRequest: { kind: "none" },
      };
    }

    case "review": {
      return {
        outcome: { kind: "advance", nextStage: "completed", reason: "Review recorded deterministically." },
        workRequest: { kind: "none" },
      };
    }

    case "completed": {
      return {
        outcome: { kind: "complete", reason: "Mission runtime finalized." },
        workRequest: { kind: "none" },
      };
    }

    default: {
      const exhaustive: never = stage;
      return {
        outcome: { kind: "fail", reason: `Unknown stage ${String(exhaustive)}.` },
        workRequest: { kind: "none" },
      };
    }
  }
}

export function stageLabel(stage: MissionRuntimeStage): string {
  return stage;
}
