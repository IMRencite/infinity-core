import {
  FOUNDER_IDEA_SQL_STATUSES_REANALYSIS_V1,
  FOUNDER_IDEA_SQL_STATUSES_V1,
  FOUNDER_IDEA_STATUSES,
  type FounderIdeaStatus,
} from "./constants";

export function founderIdeaStatusesDriftAgainst(constraint: readonly string[]): FounderIdeaStatus[] {
  return FOUNDER_IDEA_STATUSES.filter((status) => !constraint.includes(status));
}

export function founderIdeaSqlV1Drift(): FounderIdeaStatus[] {
  return founderIdeaStatusesDriftAgainst(FOUNDER_IDEA_SQL_STATUSES_V1);
}

export function founderIdeaReanalysisConstraintDrift(): FounderIdeaStatus[] {
  return founderIdeaStatusesDriftAgainst(FOUNDER_IDEA_SQL_STATUSES_REANALYSIS_V1);
}

export function founderIdeaStatusesMatchProposedSql(): boolean {
  const extraSql = FOUNDER_IDEA_SQL_STATUSES_REANALYSIS_V1.filter(
    (status) => !FOUNDER_IDEA_STATUSES.includes(status as FounderIdeaStatus),
  );
  return founderIdeaReanalysisConstraintDrift().length === 0 && extraSql.length === 0;
}
