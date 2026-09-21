import { SEC_EDGAR_POLICY } from "../policy";
import type {
  DiscoveryRequest,
  DiscoveryResult,
  ProspectSourceConnector,
  RefreshRequest,
  RefreshResult,
  SourceHealth,
} from "../types";

export const SEC_EDGAR_SOURCE_ID = "sec_edgar" as const;
export const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
export const SEC_USER_AGENT = "InfinityOS ProspectIntelligence/1.0 (https://imros.io; prospect-intelligence@imros.io)";

export const SEC_EDGAR_FIXTURE: Record<string, { cik_str: number; ticker: string; title: string }> = {
  "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
  "1": { cik_str: 789019, ticker: "MSFT", title: "MICROSOFT CORP" },
  "2": { cik_str: 1652044, ticker: "GOOGL", title: "Alphabet Inc." },
};

type TickerRow = { cik_str: number; ticker: string; title: string };

function rowsFromPayload(payload: unknown): TickerRow[] {
  if (!payload || typeof payload !== "object") return [];
  return Object.values(payload as Record<string, TickerRow>)
    .filter((row) => row && typeof row.cik_str === "number" && typeof row.title === "string")
    .sort((a, b) => a.cik_str - b.cik_str);
}

function toRecord(row: TickerRow) {
  return {
    source_record_id: String(row.cik_str),
    source_url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${row.cik_str}`,
    raw_fields: {
      cik_str: row.cik_str,
      ticker: row.ticker,
      title: row.title,
      country: "US",
    },
    entity_kind: "ORGANIZATION" as const,
  };
}

export function parseSecCompanyTickers(payload: unknown): { rows: TickerRow[]; schema_changed: boolean } {
  const rows = rowsFromPayload(payload);
  if (!rows.length) return { rows: [], schema_changed: true };
  return { rows, schema_changed: false };
}

export function createSecEdgarConnector(input: {
  fetchImpl?: typeof fetch;
  fixture?: Record<string, TickerRow>;
  live?: boolean;
} = {}): ProspectSourceConnector {
  const fixture = input.fixture ?? SEC_EDGAR_FIXTURE;
  return {
    id: SEC_EDGAR_SOURCE_ID,
    sourceType: "PUBLIC_ORGANIZATION_DATA",
    async discover(request: DiscoveryRequest): Promise<DiscoveryResult> {
      let payload: unknown = fixture;
      if (input.live && input.fetchImpl) {
        const response = await input.fetchImpl(SEC_COMPANY_TICKERS_URL, {
          headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
        });
        if (response.status === 429) {
          const error = new Error("RATE_LIMITED");
          error.name = "RATE_LIMITED";
          throw error;
        }
        if (!response.ok) throw new Error(`SEC_EDGAR_HTTP:${response.status}`);
        payload = await response.json();
      }
      const parsed = parseSecCompanyTickers(payload);
      if (parsed.schema_changed) return { records: [], next_cursor: request.cursor ?? null, exhausted: true, schema_changed: true };
      const offset = Number(request.cursor ?? "0") || 0;
      const slice = parsed.rows.slice(offset, offset + request.batch_size);
      const next = offset + slice.length;
      return {
        records: slice.map(toRecord),
        next_cursor: next >= parsed.rows.length ? null : String(next),
        exhausted: next >= parsed.rows.length,
      };
    },
    async refresh(request: RefreshRequest): Promise<RefreshResult> {
      const parsed = parseSecCompanyTickers(fixture);
      const row = parsed.rows.find((item) => String(item.cik_str) === request.source_record_id) ?? null;
      if (!row) return { record: null, changed_fields: [] };
      const record = toRecord(row);
      return { record, changed_fields: ["title", "ticker"] };
    },
    async health(): Promise<SourceHealth> {
      return { status: "HEALTHY", detail: input.live ? "SEC_EDGAR_LIVE" : "SEC_EDGAR_FIXTURE" };
    },
  };
}

export { SEC_EDGAR_POLICY };
