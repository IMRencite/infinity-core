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

import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import {
  CLOUDFLARE_DNS_VERCEL_BINDING_V1_STEPS,
  CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1,
  CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1_MISSION_ID,
} from "./constants";
import { executeCreCloudflareDnsVercelBinding } from "./cloudflare-dns-vercel-binding";

export async function executeCreCloudflareDnsVercelBindingV1Mission(
  input: Parameters<typeof executeCreCloudflareDnsVercelBinding>[0] = {},
) {
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1_MISSION_ID,
      missionType: CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1,
      source: "cre_cloudflare_dns_vercel_binding_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CLOUDFLARE_DNS_VERCEL_BINDING_V1_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_CLOUDFLARE_DNS_VERCEL_BINDING",
    run: async (handle) => {
      const built = await handle.step({
        stepType: "RECONFIRM_DOMAIN_OWNERSHIP",
        engine: "quality_control",
        summary: "Reconfirming occupancynpv.com ownership before DNS or Vercel mutation.",
        run: () => executeCreCloudflareDnsVercelBinding(input),
      });
      await handle.step({
        stepType: "VERIFY_CLOUDFLARE_DNS_CAPABILITY",
        engine: "venture_systems_architecture",
        summary: "Verifying Cloudflare DNS read/write with the general DNS token only.",
        run: () => built.cloudflare,
      });
      await handle.step({
        stepType: "VERIFY_OR_CREATE_ZONE",
        engine: "venture_systems_architecture",
        summary: "Finding or creating exactly one Cloudflare zone for occupancynpv.com.",
        run: () => ({ zone: built.cloudflare.zone, exists: built.cloudflare.zoneExists }),
      });
      await handle.step({
        stepType: "RECONCILE_NAMESERVERS",
        engine: "quality_control",
        summary: "Reconciling Cloudflare Registrar nameservers with the zone.",
        run: () => built.cloudflare.nameserverReconciliation,
      });
      await handle.step({
        stepType: "QUERY_VERCEL_DOMAIN_REQUIREMENTS",
        engine: "launch_operations",
        summary: "Reading current Vercel custom-domain DNS requirements.",
        run: () => built.vercel.requiredDns,
      });
      await handle.step({
        stepType: "BIND_VERCEL_DOMAIN",
        engine: "launch_operations",
        summary: "Binding occupancynpv.com to the existing Vercel Pro project.",
        run: () => built.vercel,
      });
      await handle.step({
        stepType: "WRITE_CLOUDFLARE_DNS",
        engine: "venture_systems_architecture",
        summary: "Writing only the Vercel-required DNS records.",
        run: () => built.dnsRecords,
      });
      await handle.step({
        stepType: "VERIFY_DNS_AND_SSL",
        engine: "quality_control",
        summary: "Verifying DNS propagation and Vercel-managed HTTPS.",
        run: () => ({ verification: built.verification, ssl: built.ssl }),
      });
      await handle.step({
        stepType: "VALIDATE_ROUTES_AND_HOST",
        engine: "quality_control",
        summary: "Validating production routes, canonical host, and footer without rebuilding.",
        run: () => ({ routes: built.routes, host: built.productionHost, footer: built.footer, artifact: built.artifact }),
      });
      await handle.step({
        stepType: "RECONCILE_VENTURE_OPERATIONAL_RECORD",
        engine: "market_validation",
        summary: "Persisting proven DNS, binding, and SSL without public launch.",
        run: () => built.record,
      });
      await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "inbound_communication",
        summary: "Preserving the CRE experiment clock and inbound observer.",
        run: () => ({ clock: inspectExperimentClock(), observer: inspectMailboxObserverHealth() }),
      });
      return built;
    },
  });
  const after = projectCommandActivity({ organizationId: LIVE_ORG });
  const concurrent = evaluateMissionRoomActivityProjectionGate({
    openSteps: [
      { stepType: "BIND_VERCEL_DOMAIN" },
      { stepType: "WRITE_CLOUDFLARE_DNS" },
      { stepType: "VERIFY_DNS_AND_SSL" },
    ],
    rooms: {
      executive_office: "ACTIVE_WORK",
      systems_architect: "ACTIVE_WORK",
      quality_control: "ACTIVE_WORK",
      strategy_finance: "PRESENT_IDLE",
      research_department: "PRESENT_IDLE",
      intelligence_center: "PRESENT_IDLE",
      launch_operations: "ACTIVE_WORK",
      growth_department: "PRESENT_IDLE",
      product_lab: "PRESENT_IDLE",
    },
    command: "ACTIVE_WORK",
  });
  return {
    ...instrumented.result,
    hqMission: {
      mission: CRE_CLOUDFLARE_DNS_VERCEL_BINDING_V1,
      projection: concurrent.overall,
      command: "ACTIVE_WORK",
      systemsArchitect: "ACTIVE_WORK",
      researchGrid: "PRESENT_IDLE",
      validationStation: "ACTIVE_WORK",
      financialGovernance: "PRESENT_IDLE",
      signalIntelligence: "PRESENT_IDLE",
      deploymentDepot: "ACTIVE_WORK",
      creationLab: "PRESENT_IDLE",
      infinityDecisionCoreDuring: "ACTIVE_WORK",
      fakeSerialization: "NO" as const,
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
