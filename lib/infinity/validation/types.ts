import type { Tables } from "@/lib/supabase/database.types";

export type ValidationModel = Tables<"validation_models">;
export type ValidationRun = Tables<"validation_runs">;
export type ValidationDimensionResult = Tables<"validation_dimension_results">;
export type ValidationFinding = Tables<"validation_findings">;
export type ValidationRequirement = Tables<"validation_requirements">;

export type CategoryResult = {
  category: string;
  score: number | null;
  confidence: number | null;
  dataStatus: "known" | "unknown" | "insufficient";
  findings: string[];
  missingInformation: string[];
  blockingIssues: string[];
};

export type RunValidationInput = {
  organizationId: string;
  opportunityId: string;
  missionId?: string | null;
  validationModelId?: string | null;
  correlationId?: string | null;
  runKey?: string;
};

export type RunValidationResult = {
  alreadyRun: boolean;
  run: ValidationRun;
  recommendation: string;
  overallConfidence: number | null;
  overallScore: number | null;
  blockingFindings: ValidationFinding[];
  missingInformation: string[];
  plannerEligible: boolean;
};
