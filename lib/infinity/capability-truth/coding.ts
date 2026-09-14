import { resolveCurrentCanonicalWork } from "@/lib/infinity/canonical-work/resolver";
import type { CodingCapabilityProjection } from "./types";
import type { CodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";

export function projectCodingCapability(now = new Date().toISOString()): CodingCapabilityProjection {
  const current = resolveCurrentCanonicalWork(now);
  const active = current.status === "ACTIVE" && current.work?.source === "EXTERNAL_IMPLEMENTATION_AGENT";
  return {
    native_coder: {
      value: "READY",
      source: "infinity_native_coder",
    },
    external_implementation_agent: {
      value: active ? "ACTIVE" : "PRESENT_IDLE",
      source: "canonical_current_implementation_work",
      last_activity_at: current.work?.updated_at ?? null,
    },
    connector_status: process.env.CURSOR_API_KEY ? "CONNECTED" : "NOT_CONNECTED",
    current_coding_runs: active ? 1 : 0,
  };
}

export function codingReadModelFromCapability(
  organizationId: string,
  coding = projectCodingCapability(),
): CodingHqReadModel {
  const cursorActive = coding.external_implementation_agent.value === "ACTIVE";
  return {
    organizationId,
    rows: [],
    providers: [
      {
        provider: "Infinity Native Coder",
        executionMode: "NATIVE",
        capabilities: "IMPLEMENT_FEATURE, REFACTOR, RUN_TESTS",
        availability: "AVAILABLE",
        historicalSuccess: "NOT YET MEASURED",
        cost: "ACTUAL $0 in mock",
        status: coding.native_coder.value,
      },
      {
        provider: "Cursor",
        executionMode: "EXTERNAL_IMPLEMENTATION_AGENT",
        capabilities: "EXTERNAL_IMPLEMENTATION_AGENT",
        availability: "AVAILABLE",
        historicalSuccess: "NOT YET MEASURED",
        cost: "UNKNOWN until authorized run",
        status: cursorActive ? "ACTIVE" : "PRESENT_IDLE",
        connectorStatus: coding.connector_status,
      },
    ],
  };
}
