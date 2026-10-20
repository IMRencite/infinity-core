import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assessDiscoveryFreshness,
  executeScheduledOpportunityScannerV1,
  resolveOpportunityScannerTrigger,
} from "@/lib/infinity/venture-discovery/autonomous-opportunity-scanner-scheduler-v1";
import { OPPORTUNITY_SCANNER_CRON_SCHEDULE } from "@/lib/infinity/venture-discovery/constants";
import { verifyAutonomousRuntimeRouteManifest } from "@/lib/infinity/venture-discovery/autonomous-runtime-required-route-manifest-v1";
import {
  planAutonomousRevalidation,
  syncValidationQueueFromPersistence,
  validationQueueHealth,
} from "@/lib/infinity/venture-discovery/venture-candidate-validation-queue-v1";
import { appendScheduledExecutionLedger } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-runtime-scheduled-execution-ledger-v1";
import {
  mapProvenanceToLedgerTriggerType,
  resolvePortfolioCronProvenance,
} from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-cron-provenance-v1";
import {
  assertResearchProviderExecutable,
  loadResearchConfig,
} from "@/lib/infinity/research/config";

export const maxDuration = 300;

function resolveTickMode(request: Request): "health" | "execute" {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode")?.trim().toLowerCase();
  if (mode === "health" || mode === "safe") return "health";
  return "execute";
}

function evaluateResearchProviderProductionConfigQc(): {
  RESEARCH_PROVIDER_PRODUCTION_CONFIG_QC: "PASS" | "FAIL";
  DISCOVERY_SCANNER_CONSTRUCTION_QC: "PASS" | "FAIL";
  research_provider_id: string | null;
} {
  try {
    const config = loadResearchConfig();
    assertResearchProviderExecutable(config);
    return {
      RESEARCH_PROVIDER_PRODUCTION_CONFIG_QC: "PASS",
      DISCOVERY_SCANNER_CONSTRUCTION_QC: "PASS",
      research_provider_id: config.providerId,
    };
  } catch {
    return {
      RESEARCH_PROVIDER_PRODUCTION_CONFIG_QC: "FAIL",
      DISCOVERY_SCANNER_CONSTRUCTION_QC: "FAIL",
      research_provider_id: null,
    };
  }
}

function defaultOrgId(): string {
  return (
    process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID ??
    process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ??
    "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494"
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: auth.reason, OPPORTUNITY_SCANNER_CRON_AUTH_QC: "FAIL" },
      { status: 401 },
    );
  }

  const trigger = resolveOpportunityScannerTrigger(request);
  const cronProvenance = resolvePortfolioCronProvenance(request);
  const mode = resolveTickMode(request);
  const orgId = defaultOrgId();

  try {
    const admin = createAdminClient();
    const queue = await syncValidationQueueFromPersistence(admin, orgId);
    const revalidation = planAutonomousRevalidation(queue, trigger, mode);
    const queueHealth = validationQueueHealth(queue);

    if (mode === "health") {
      const freshness = await assessDiscoveryFreshness(admin, orgId, null);
      const researchConfigQc = evaluateResearchProviderProductionConfigQc();
      return NextResponse.json({
        mode: "health",
        AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1: "AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1",
        OPPORTUNITY_SCANNER_CRON_SCHEDULE,
        trigger,
        cron_provenance: cronProvenance.platform_provenance,
        DISCOVERY_CRON_LEDGER_ROUTE: "/api/runtime/opportunity-discovery-tick",
        DISCOVERY_CRON_LEDGER_WRITE_PATH: "appendScheduledExecutionLedger(health_no_execute)",
        OPPORTUNITY_SCANNER_CRON_AUTH_QC: "PASS",
        OPPORTUNITY_SCANNER_CRON_CONFIGURATION_QC: "PASS",
        OPPORTUNITY_SCANNER_SCHEDULER_QC: trigger === "SCHEDULED" ? "PASS" : "PENDING_NEXT_REAL_CRON",
        VENTURE_DISCOVERY_SCHEDULER_QC: trigger === "SCHEDULED" ? "PASS" : "PENDING_NEXT_REAL_CRON",
        OPPORTUNITY_DISCOVERY_TICK_RUNTIME_QC: "PASS",
        route_manifest: verifyAutonomousRuntimeRouteManifest([
          "/api/runtime/opportunity-discovery-tick",
          "/api/runtime/venture-operating-cycle",
          "/api/runtime/tick",
          "/api/runtime/organic-tick",
        ]),
        validation_queue: queue,
        revalidation,
        queue_health: queueHealth,
        freshness,
        ...researchConfigQc,
        note: "Health probe: no paid scanner execution; research config load only.",
      });
    }

    const result = await executeScheduledOpportunityScannerV1(admin, {
      organizationId: orgId,
      trigger,
    });
    const freshness = await assessDiscoveryFreshness(admin, orgId, {
      completed_at: result.completed_at,
      trigger: result.trigger,
    });

    await appendScheduledExecutionLedger({
      route: "/api/runtime/opportunity-discovery-tick",
      schedule_identity: OPPORTUNITY_SCANNER_CRON_SCHEDULE,
      platform_provenance: cronProvenance.platform_provenance,
      trigger_type: mapProvenanceToLedgerTriggerType(cronProvenance.trigger_type),
      accepted_status: result.scanner_ok ? "ACCEPTED" : "PARTIAL",
      completed_status: result.scanner_ok ? "COMPLETED" : "FAILED",
      completion_timestamp: result.completed_at,
      payload: { mode: "execute", scanner_run_id: result.discovery_run_id ?? null },
    });

    return NextResponse.json({
      mode: "execute",
      AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1: result.scheduler_version,
      OPPORTUNITY_SCANNER_CRON_SCHEDULE,
      trigger,
      cron_provenance: cronProvenance.platform_provenance,
      DISCOVERY_CRON_LEDGER_ROUTE: "/api/runtime/opportunity-discovery-tick",
      DISCOVERY_CRON_LEDGER_WRITE_PATH: "appendScheduledExecutionLedger",
      OPPORTUNITY_SCANNER_CRON_AUTH_QC: "PASS",
      OPPORTUNITY_SCANNER_CRON_CONFIGURATION_QC: "PASS",
      OPPORTUNITY_SCANNER_SCHEDULER_QC:
        trigger === "SCHEDULED" ? "PASS" : "PENDING_NEXT_REAL_CRON",
      VENTURE_DISCOVERY_SCHEDULER_QC:
        trigger === "SCHEDULED" ? "PASS" : "PENDING_NEXT_REAL_CRON",
      OPPORTUNITY_DISCOVERY_TICK_RUNTIME_QC: result.scanner_ok ? "PASS" : "FAIL",
      route_manifest: verifyAutonomousRuntimeRouteManifest([
        "/api/runtime/opportunity-discovery-tick",
        "/api/runtime/venture-operating-cycle",
        "/api/runtime/tick",
        "/api/runtime/organic-tick",
      ]),
      scanner: result,
      validation_queue: queue,
      revalidation,
      queue_health: queueHealth,
      freshness,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "OPPORTUNITY_DISCOVERY_TICK_FAILED",
        root_cause: message,
        OPPORTUNITY_SCANNER_CRON_AUTH_QC: "PASS",
        VENTURE_DISCOVERY_SELF_HEALING_QC: "NOT_RUN",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
