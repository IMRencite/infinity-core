import type { DepartmentUiState } from "../types";



export type ValidationStationSnapshotInput = {

  validationActive: boolean;

  validationCompleted: boolean;

  providerCalls: number;

  synthesisOnly?: boolean;

  humanizedBlocker?: string | null;

  costUsd: number | null;

  costKnown: boolean;

  currentTask: string | null;

};



export function buildValidationStationState(

  input: ValidationStationSnapshotInput,

): {

  state: DepartmentUiState;

  summary: string | null;

  currentTask: string | null;

  costUsd: number | null;

  costKnown: boolean;

  recordCount: number;

  showWorkers: boolean;

} {

  if (input.validationActive && input.providerCalls > 0) {

    const blockerLabel = input.humanizedBlocker?.trim();

    return {

      state: "RUNNING",

      summary: "Validation Station is running new grounded market research.",

      currentTask:

        input.currentTask ??

        (blockerLabel

          ? `Researching new evidence for ${blockerLabel}`

          : "Running bounded autonomous validation research"),

      costUsd: input.costUsd,

      costKnown: input.costKnown,

      recordCount: input.providerCalls,

      showWorkers: true,

    };

  }



  if (input.validationActive) {

    return {

      state: "RUNNING",

      summary: "Validation Station is reviewing existing evidence for a VALIDATE candidate.",

      currentTask: input.currentTask ?? "Reviewing existing evidence — no new provider research",

      costUsd: input.costUsd ?? 0,

      costKnown: true,

      recordCount: 0,

      showWorkers: false,

    };

  }



  if (input.validationCompleted) {

    return {

      state: "COMPLETE",

      summary: input.synthesisOnly

        ? "Validation Station completed evidence review; no new market research was run."

        : "Validation Station completed bounded autonomous validation.",

      currentTask: null,

      costUsd: input.costUsd ?? 0,

      costKnown: input.costKnown,

      recordCount: 0,

      showWorkers: false,

    };

  }



  return {

    state: "NOT_STARTED",

    summary: null,

    currentTask: null,

    costUsd: null,

    costKnown: false,

    recordCount: 0,

    showWorkers: false,

  };

}


