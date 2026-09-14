export const HQ_INFORMATION_ARCHITECTURE_GATE = "HQInformationArchitectureGate" as const;
export const HQ_OPERATIONS_ROOM_QUALITY_GATE = "HQOperationsRoomQualityGate" as const;
export const HQ_PROGRESSIVE_DISCLOSURE_GATE = "HQProgressiveDisclosureGate" as const;

export const HQ_INFORMATION_ARCHITECTURE_PRINCIPLE =
  "OBSERVABILITY MUST BE PROMINENT BUT SUBORDINATE TO PRIMARY COMMAND AND WORKFLOW HIERARCHY" as const;

export const HQ_VISIBILITY_HIERARCHY_PRINCIPLE =
  "SHOWING WORK DOES NOT REQUIRE PUTTING ALL WORK ABOVE THE PRIMARY COMMAND INTERFACE" as const;

export const HQ_INFORMATION_LAYERS = ["COMMAND", "WORK", "OBSERVABILITY", "HISTORY"] as const;

export const HQ_OPERATIONS_ROUTE = "/dashboard/operations" as const;
export const HQ_RUNTIME_ROUTE = "/dashboard/runtime" as const;

export type HqHomeOperatingSummary = {
  systemState: string;
  operatingVentureCount: number;
  validatingVentureCount: number;
  opportunityCount: number;
  liveTop10Count: number;
  nextRunAt: string | null;
  interactiveMissionIdle: boolean;
  operationallyIdle: boolean;
};

export function toHqHomeOperatingSummary(input: {
  systemState: string;
  operatingVentureCount: number;
  validatingVentureCount: number;
  opportunityCount: number;
  liveTop10Count: number;
  runtime: { nextRunAt: string | null };
  interactiveMissionIdle: boolean;
  operationallyIdle: boolean;
}): HqHomeOperatingSummary {
  return {
    systemState: input.systemState,
    operatingVentureCount: input.operatingVentureCount,
    validatingVentureCount: input.validatingVentureCount,
    opportunityCount: input.opportunityCount,
    liveTop10Count: input.liveTop10Count,
    nextRunAt: input.runtime.nextRunAt,
    interactiveMissionIdle: input.interactiveMissionIdle,
    operationallyIdle: input.operationallyIdle,
  };
}
