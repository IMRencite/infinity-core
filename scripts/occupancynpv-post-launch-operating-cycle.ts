import { executePostLaunchOperatingCycle } from "../lib/infinity/venture-operating-scale/post-launch-operating-runtime";

const cycle = executePostLaunchOperatingCycle({ persist: true });
console.log(JSON.stringify({
  cycleId: cycle.cycleId,
  outcome: cycle.daily.snapshot.dailyResult,
  observations: cycle.baseline.observations,
  fabricated: cycle.fabricatedObservations,
  learningDecision: cycle.learningDecision,
  improvementMissionCreated: cycle.improvementMissionCreated,
  nextRunAt: cycle.runtime.next_run_at,
  nextCycleRequiresFounderPrompt: cycle.nextCycleRequiresFounderPrompt,
  occupancynpvAutoEnrolled: cycle.occupancynpvAutoEnrolled,
}, null, 2));
