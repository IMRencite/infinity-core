import type {
  DiscoveryRequest,
  DiscoveryResult,
  ProspectSourceConnector,
  RefreshRequest,
  RefreshResult,
  SourceHealth,
} from "../types";

export const INTERNAL_INFINITY_SOURCE_ID = "internal_infinity" as const;

export type InternalCatalogRecord = {
  source_record_id: string;
  entity_kind: "ORGANIZATION" | "PERSON";
  raw_fields: Record<string, unknown>;
  source_url?: string | null;
};

export const INTERNAL_INFINITY_FIXTURE: InternalCatalogRecord[] = [
  {
    source_record_id: "org-harborline",
    entity_kind: "ORGANIZATION",
    source_url: "canonical://internal/org-harborline",
    raw_fields: {
      legal_name: "Harborline Operations LLC",
      industry: "property management",
      country: "US",
      region: "FL",
      domain: "harborline.invalid",
    },
  },
  {
    source_record_id: "person-alex-harborline",
    entity_kind: "PERSON",
    source_url: "canonical://internal/person-alex-harborline",
    raw_fields: {
      display_name: "Alex Rivera",
      given_name: "Alex",
      family_name: "Rivera",
      role: "owner",
      email: "alex.rivera@harborline.invalid",
      industry: "property management",
      country: "US",
      region: "FL",
    },
  },
  {
    source_record_id: "org-apple-overlap",
    entity_kind: "ORGANIZATION",
    source_url: "canonical://internal/org-apple-overlap",
    raw_fields: {
      legal_name: "Apple Inc.",
      cik: 320193,
      ticker: "AAPL",
      country: "US",
      industry: "technology",
    },
  },
];

export function createInternalInfinityConnector(input: {
  catalog?: InternalCatalogRecord[];
  fail?: boolean;
} = {}): ProspectSourceConnector {
  const catalog = input.catalog ?? INTERNAL_INFINITY_FIXTURE;
  return {
    id: INTERNAL_INFINITY_SOURCE_ID,
    sourceType: "INTERNAL_INFINITY",
    async discover(request: DiscoveryRequest): Promise<DiscoveryResult> {
      if (input.fail) throw new Error("INTERNAL_SOURCE_UNAVAILABLE");
      const offset = Number(request.cursor ?? "0") || 0;
      const slice = catalog.slice(offset, offset + request.batch_size);
      const next = offset + slice.length;
      return {
        records: slice.map((row) => ({
          source_record_id: row.source_record_id,
          source_url: row.source_url ?? `canonical://internal/${row.source_record_id}`,
          raw_fields: row.raw_fields,
          entity_kind: row.entity_kind,
        })),
        next_cursor: next >= catalog.length ? null : String(next),
        exhausted: next >= catalog.length,
      };
    },
    async refresh(request: RefreshRequest): Promise<RefreshResult> {
      if (input.fail) throw new Error("INTERNAL_SOURCE_UNAVAILABLE");
      const row = catalog.find((item) => item.source_record_id === request.source_record_id) ?? null;
      if (!row) return { record: null, changed_fields: [] };
      return {
        record: {
          source_record_id: row.source_record_id,
          source_url: row.source_url ?? null,
          raw_fields: row.raw_fields,
          entity_kind: row.entity_kind,
        },
        changed_fields: [],
      };
    },
    async health(): Promise<SourceHealth> {
      return { status: input.fail ? "DEGRADED" : "HEALTHY", detail: input.fail ? "UNAVAILABLE" : "INTERNAL_CATALOG" };
    },
  };
}
