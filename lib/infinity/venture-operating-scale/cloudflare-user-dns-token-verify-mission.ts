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
  CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1_STEPS,
  CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1,
  CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1_MISSION_ID,
} from "./constants";
import { executeCreCloudflareUserDnsTokenVerify } from "./cloudflare-user-dns-token-verify";

export async function executeCreCloudflareUserDnsTokenVerifyV1Mission(
  input: Parameters<typeof executeCreCloudflareUserDnsTokenVerify>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1_MISSION_ID,
      missionType: CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1,
      source: "cre_cloudflare_user_dns_token_verify_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "VERIFY_USER_TOKEN_IDENTITY",
        engine: "quality_control",
        summary: "Verifying CLOUDFLARE_API_TOKEN as a user-owned DNS token.",
        run: () => executeCreCloudflareUserDnsTokenVerify(input),
      });
      await handle.step({
        stepType: "REJECT_PREVIOUS_ACCOUNT_TOKEN",
        engine: "quality_control",
        summary: "Confirming the loaded credential is not the previous account-owned DNS token.",
        run: () => built.tokenType,
      });
      await handle.step({
        stepType: "USER_DNS_WRITE_PROBE",
        engine: "venture_systems_architecture",
        summary: "Probing one reversible TXT write with the user-owned token.",
        run: () => built.liveWrite,
      });
      await handle.step({
        stepType: "EVALUATE_USER_DNS_TOKEN",
        engine: "quality_control",
        summary: "Evaluating user-owned Cloudflare DNS write capability.",
        run: () => built.result,
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [{ stepType: "USER_DNS_WRITE_PROBE" }],
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
      mission: CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1,
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
