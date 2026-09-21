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
  CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2_STEPS,
  CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2,
  CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2_MISSION_ID,
} from "./constants";
import { executeCreCloudflareDnsLiveWriteVerification } from "./cloudflare-dns-live-write-verification";

export async function executeCreCloudflareDnsLiveWriteVerificationV2Mission(
  input: Parameters<typeof executeCreCloudflareDnsLiveWriteVerification>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2_MISSION_ID,
      missionType: CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2,
      source: "cre_cloudflare_dns_live_write_verification_v2",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "RELOAD_CLOUDFLARE_DNS_TOKEN",
        engine: "venture_systems_architecture",
        summary: "Reloading the newly created general Cloudflare DNS token.",
        run: () => executeCreCloudflareDnsLiveWriteVerification(input),
      });
      await handle.step({
        stepType: "VERIFY_ZONE_ACCESS",
        engine: "quality_control",
        summary: "Verifying occupancynpv.com zone visibility with the general DNS token.",
        run: () => built.zone,
      });
      await handle.step({
        stepType: "CREATE_TEMPORARY_TXT",
        engine: "venture_systems_architecture",
        summary: "Creating one reversible TXT write probe.",
        run: () => built.liveWrite.create,
      });
      await handle.step({
        stepType: "READBACK_TEMPORARY_TXT",
        engine: "quality_control",
        summary: "Reading back the temporary TXT record.",
        run: () => built.liveWrite.readback,
      });
      await handle.step({
        stepType: "DELETE_TEMPORARY_TXT",
        engine: "venture_systems_architecture",
        summary: "Deleting the temporary TXT record.",
        run: () => built.liveWrite.deleted,
      });
      await handle.step({
        stepType: "EVALUATE_DNS_WRITE_CAPABILITY",
        engine: "quality_control",
        summary: "Evaluating proven Cloudflare DNS write capability.",
        run: () => built.capability,
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "CREATE_TEMPORARY_TXT" },
      { stepType: "DELETE_TEMPORARY_TXT" },
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
      mission: CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2,
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
