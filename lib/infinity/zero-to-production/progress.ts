import { ZTP_STAGES, type ZtpStage } from "./constants";
import type { ZeroToProductionStageRun } from "./types";

const REQUIRED = ZTP_STAGES.filter((stage) => stage !== "REPAIR");

export function computeProgress(stages: ZeroToProductionStageRun[], current?: ZtpStage): number {
  const complete = REQUIRED.filter((stage) => stages.some((row) => row.stage === stage && row.status === "COMPLETE")).length;
  return complete / REQUIRED.length;
}

export function stageIndex(stage: ZtpStage): number {
  return ZTP_STAGES.indexOf(stage);
}
