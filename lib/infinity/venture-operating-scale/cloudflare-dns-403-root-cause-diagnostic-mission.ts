function deriveInfinityDecisionCoreState(input: {
  commandRoomStatus?: string | null;
  nowInspectingStatus?: string | null;
}): "ACTIVE_WORK" | "READY_BLOCKED" | "PRESENT_IDLE" | "FAILED" {
  const status = input.commandRoomStatus ?? input.nowInspectingStatus ?? "";
  if (status === "FAILED") return "FAILED";
  if (status === "ACTIVE_WORK") return "ACTIVE_WORK";
  if (status === "READY_BLOCKED" || status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL") {
    return "READY_BLOCKED";
  }
  return "PRESENT_IDLE";
}

import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import {
  CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1_STEPS,
  CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1,
  CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1_MISSION_ID,
} from "./constants";
import { executeCreCloudflareDns403RootCauseDiagnostic } from "./cloudflare-dns-403-root-cause-diagnostic";

export async function executeCreCloudflareDns403RootCauseDiagnosticV1Mission(
  input: Parameters<typeof executeCreCloudflareDns403RootCauseDiagnostic>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1_MISSION_ID,
      missionType: CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1,
      source: "cre_cloudflare_dns_403_root_cause_diagnostic_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "VERIFY_TOKEN_IDENTITY",
        engine: "quality_control",
        summary: "Verifying the loaded CLOUDFLARE_API_TOKEN identity.",
        run: () => executeCreCloudflareDns403RootCauseDiagnostic(input),
      });
      await handle.step({
        stepType: "TRACE_ADAPTER_AUTHENTICATION",
        engine: "systems_architect",
        summary: "Tracing DNS adapter authentication without using the registrar token.",
        run: () => built.runtimeAuthentication,
      });
      await handle.step({
        stepType: "VERIFY_PROVIDER_ZONE_ID",
        engine: "quality_control",
        summary: "Comparing the provider-returned occupancynpv.com zone ID to the stored ID.",
        run: () => built.zone,
      });
      await handle.step({
        stepType: "RAW_DNS_WRITE_PROBE",
        engine: "venture_systems_architecture",
        summary: "Probing one reversible raw Cloudflare TXT write outside the adapter.",
        run: () => built.rawApiProbe,
      });
      await handle.step({
        stepType: "CLASSIFY_403_ROOT_CAUSE",
        engine: "quality_control",
        summary: "Classifying the Cloudflare 403/10000 root cause.",
        run: () => built.rootCause,
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "VERIFY_TOKEN_IDENTITY" },
      { stepType: "RAW_DNS_WRITE_PROBE" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "ACTIVE_WORK",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "PRESENT_IDLE",
      research_department: "PRESENT_IDLE",
      intelligence_center: "PRESENT_IDLE",
      launch_operations: "PRESENT_IDLE",
      growth_department: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1,
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      after: {
        active: after.counts.activeMissions,
        infinityDecisionCore: deriveInfinityDecisionCoreState({
          commandRoomStatus:
            after.nowInspecting.status === "PRESENT_IDLE" ? "PRESENT_IDLE" : after.rooms.executive_office.status,
          nowInspectingStatus: after.nowInspecting.status,
        }),
        fakeContinuousActiveWork: after.counts.activeMissions > 0 || after.nowInspecting.status === "ACTIVE_WORK",
      },
    },
  };
}
