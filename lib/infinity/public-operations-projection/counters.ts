import { AUTONOMOUS_DAILY_OPERATING_LOOP_WORK_ID } from "@/lib/infinity/canonical-work/seed";
import { PUBLIC_COUNT_UNKNOWN, type InternalPublicObservation, type InternalWorkObservation, type PublicCount } from "./types";

const FIXTURE_WORK = /test|fixture|debug|synthetic|qc-runtime|qc_synthetic/i;

export function isFixtureWork(work: Pick<InternalWorkObservation, "work_id" | "title" | "classification">): boolean {
  if (work.classification === "SYSTEM_DIAGNOSTIC") return true;
  return FIXTURE_WORK.test(work.work_id) || FIXTURE_WORK.test(work.title);
}

export function isLegitimateCompletedMission(work: InternalWorkObservation): boolean {
  return work.status === "COMPLETED" && !isFixtureWork(work);
}

export function countVenturesStarted(observation: InternalPublicObservation): PublicCount {
  if (!observation.ventures) return PUBLIC_COUNT_UNKNOWN;
  return observation.ventures.filter((row) => row.is_started && !row.is_fixture).length;
}

export function countVenturesOperating(observation: InternalPublicObservation): PublicCount {
  if (!observation.ventures) return PUBLIC_COUNT_UNKNOWN;
  return observation.ventures.filter((row) => row.is_started && row.is_operating && !row.is_fixture).length;
}

export function countMissionsCompleted(observation: InternalPublicObservation): PublicCount {
  if (!observation.work) return PUBLIC_COUNT_UNKNOWN;
  return observation.work.filter(isLegitimateCompletedMission).length;
}

export function countDeploymentsCompleted(observation: InternalPublicObservation): PublicCount {
  if (!observation.work) return PUBLIC_COUNT_UNKNOWN;
  return observation.work.filter((row) => isLegitimateCompletedMission(row) && row.work_type === "DEPLOYMENT").length;
}

export function countAssetsCreated(observation: InternalPublicObservation): PublicCount {
  if (!observation.work) return PUBLIC_COUNT_UNKNOWN;
  return observation.work.filter((row) => isLegitimateCompletedMission(row) && row.work_type === "BUILD").length;
}

export function countResearchCycles(observation: InternalPublicObservation): PublicCount {
  if (!observation.work) return PUBLIC_COUNT_UNKNOWN;
  return observation.work.filter((row) =>
    isLegitimateCompletedMission(row) && (row.work_type === "RESEARCH" || row.work_type === "OPPORTUNITY_DISCOVERY"),
  ).length;
}

export function countAutonomousOperatingHours(observation: InternalPublicObservation): PublicCount {
  const enabledAt = observation.loop?.autonomous_enabled_at
    ?? observation.work.find((row) => row.work_id === AUTONOMOUS_DAILY_OPERATING_LOOP_WORK_ID && row.status === "COMPLETED")?.completed_at
    ?? null;
  if (!enabledAt) return PUBLIC_COUNT_UNKNOWN;
  const start = Date.parse(enabledAt);
  const now = Date.parse(observation.now);
  if (!Number.isFinite(start) || !Number.isFinite(now) || now < start) return PUBLIC_COUNT_UNKNOWN;
  return Math.floor((now - start) / 3_600_000);
}
