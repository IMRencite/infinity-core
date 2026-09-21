import type { SourceRecord } from "../types";
import { defaultConnectorConfig, INTERNAL_INFINITY_POLICY, SEC_EDGAR_POLICY, type SourcePolicy } from "./policy";
import { createInternalInfinityConnector, INTERNAL_INFINITY_SOURCE_ID } from "./connectors/internal-infinity";
import { createSecEdgarConnector, SEC_EDGAR_SOURCE_ID } from "./connectors/sec-edgar";
import type { ProspectSourceConnector, SourceConnectorConfig } from "./types";

export type RegisteredSource = {
  source: SourceRecord;
  policy: SourcePolicy;
  config: SourceConnectorConfig;
  connector: ProspectSourceConnector;
};

function sourceRecord(id: string, type: string, name: string, policy: SourcePolicy, enabled: boolean): SourceRecord {
  return {
    source_id: id,
    source_type: type,
    name,
    jurisdiction: policy.jurisdiction,
    base_url: id === SEC_EDGAR_SOURCE_ID ? "https://www.sec.gov" : "canonical://internal",
    acquisition_method: id === SEC_EDGAR_SOURCE_ID ? "official_api" : "internal_catalog",
    usage_policy: policy.contact_data_use_allowed === true ? "restricted_contact_allowed" : "no_contact_harvest",
    licensing_notes: policy.license_notes,
    data_categories: ["organization"],
    refresh_cadence: "daily",
    reliability: 0.9,
    enabled,
    last_success: null,
    last_failure: null,
    health: enabled ? "UNKNOWN" : "DISABLED",
  };
}

export function defaultAcquisitionRegistry(input: {
  fetchImpl?: typeof fetch;
  liveSec?: boolean;
  internalFail?: boolean;
  secEnabled?: boolean;
  internalEnabled?: boolean;
} = {}): RegisteredSource[] {
  const secEnabled = input.secEnabled ?? true;
  const internalEnabled = input.internalEnabled ?? true;
  return [
    {
      source: sourceRecord(SEC_EDGAR_SOURCE_ID, "PUBLIC_ORGANIZATION_DATA", "SEC EDGAR company tickers", SEC_EDGAR_POLICY, secEnabled),
      policy: SEC_EDGAR_POLICY,
      config: defaultConnectorConfig({
        enabled: secEnabled,
        priority: 10,
        jurisdiction: "US",
        geography: { country: "US" },
        batch_size: 5,
        live: Boolean(input.liveSec),
        rate_limit: SEC_EDGAR_POLICY.rate_limit,
      }),
      connector: createSecEdgarConnector({ fetchImpl: input.fetchImpl, live: Boolean(input.liveSec) }),
    },
    {
      source: sourceRecord(INTERNAL_INFINITY_SOURCE_ID, "INTERNAL_INFINITY", "Infinity internal catalog", INTERNAL_INFINITY_POLICY, internalEnabled),
      policy: INTERNAL_INFINITY_POLICY,
      config: defaultConnectorConfig({
        enabled: internalEnabled,
        priority: 20,
        jurisdiction: "INTERNAL",
        batch_size: 10,
        live: false,
        discovery_cadence_ms: 15 * 60 * 1000,
        rate_limit: INTERNAL_INFINITY_POLICY.rate_limit,
      }),
      connector: createInternalInfinityConnector({ fail: input.internalFail }),
    },
  ];
}

export function acquisitionKillSwitchEnabled(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): boolean {
  return env.PI_ACQUISITION_DISABLED === "1";
}

export function liveSecEdgarEnabled(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): boolean {
  if (env.PI_ACQUISITION_DISABLED === "1" || env.PI_ACQUISITION_LIVE_SEC_EDGAR === "0") return false;
  return env.PI_ACQUISITION_LIVE_SEC_EDGAR === "1" || env.PI_LIVE_SEC_EDGAR === "1" || env.INFINITY_CLOUD_RUNTIME === "1";
}
