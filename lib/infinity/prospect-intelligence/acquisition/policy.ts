import type { SourceConnectorConfig, SourcePolicy } from "./types";

export type { SourcePolicy };

export const UNKNOWN_POLICY: SourcePolicy = {
  policy_status: "UNKNOWN",
  acquisition_allowed: "UNKNOWN_POLICY",
  commercial_use_allowed: "UNKNOWN_POLICY",
  redistribution_allowed: "UNKNOWN_POLICY",
  contact_data_use_allowed: "UNKNOWN_POLICY",
  refresh_allowed: "UNKNOWN_POLICY",
  rate_limit: { requests_per_minute: 1, requests_per_hour: 6, batch_limit: 1 },
  jurisdiction: null,
  terms_notes: "Policy not yet resolved. Do not treat as unrestricted.",
  license_notes: "UNKNOWN_POLICY",
  retention_notes: "Hold observations; do not publish contact data to Sales.",
};

export const SEC_EDGAR_POLICY: SourcePolicy = {
  policy_status: "APPROVED",
  acquisition_allowed: true,
  commercial_use_allowed: true,
  redistribution_allowed: true,
  contact_data_use_allowed: false,
  refresh_allowed: true,
  rate_limit: { requests_per_minute: 6, requests_per_hour: 60, batch_limit: 5 },
  jurisdiction: "US",
  terms_notes: "SEC EDGAR public company data. Fair-access User-Agent required. No contact harvest.",
  license_notes: "U.S. government public records.",
  retention_notes: "Retain observations and canonical organization identifiers.",
};

export const INTERNAL_INFINITY_POLICY: SourcePolicy = {
  policy_status: "APPROVED",
  acquisition_allowed: true,
  commercial_use_allowed: true,
  redistribution_allowed: false,
  contact_data_use_allowed: true,
  refresh_allowed: true,
  rate_limit: { requests_per_minute: 60, requests_per_hour: 600, batch_limit: 20 },
  jurisdiction: "INTERNAL",
  terms_notes: "Approved Infinity internal catalog and deterministic fixtures only.",
  license_notes: "Internal Infinity OS.",
  retention_notes: "Canonical graph retention.",
};

export function policyAllowsAcquisition(policy: SourcePolicy | null | undefined): boolean {
  if (!policy) return false;
  return policy.acquisition_allowed === true;
}

export function policyAllowsRefresh(policy: SourcePolicy | null | undefined): boolean {
  if (!policy) return false;
  return policy.refresh_allowed === true;
}

export function policyAllowsContactUse(policy: SourcePolicy | null | undefined): boolean {
  if (!policy) return false;
  return policy.contact_data_use_allowed === true;
}

export function policyIsUnknown(policy: SourcePolicy | null | undefined): boolean {
  if (!policy) return true;
  return (
    policy.acquisition_allowed === "UNKNOWN_POLICY"
    || policy.commercial_use_allowed === "UNKNOWN_POLICY"
    || policy.contact_data_use_allowed === "UNKNOWN_POLICY"
  );
}

export function defaultConnectorConfig(overrides: Partial<SourceConnectorConfig> = {}): SourceConnectorConfig {
  return {
    enabled: false,
    priority: 100,
    jurisdiction: null,
    industry_scope: [],
    geography: {},
    refresh_cadence_ms: 24 * 60 * 60 * 1000,
    discovery_cadence_ms: 60 * 60 * 1000,
    rate_limit: { requests_per_minute: 6, requests_per_hour: 60, batch_limit: 5 },
    batch_size: 5,
    live: false,
    ...overrides,
  };
}
