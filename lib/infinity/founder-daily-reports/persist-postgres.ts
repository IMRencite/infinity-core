import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FounderDailyOperationsReport } from "./types";

const TABLE = "founder_daily_reports";

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function founderDailyReportPostgresConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export class PostgresFounderDailyReportStore {
  readonly kind = "DURABLE_POSTGRES" as const;
  readonly uses_local_file = false as const;

  constructor(private readonly client: SupabaseClient | null = adminClient()) {}

  configured(): boolean {
    return Boolean(this.client);
  }

  async read(date: string): Promise<FounderDailyOperationsReport | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from(TABLE)
      .select("payload")
      .eq("report_date", date)
      .maybeSingle();
    if (error || !data?.payload) return null;
    return data.payload as FounderDailyOperationsReport;
  }

  async write(report: FounderDailyOperationsReport): Promise<void> {
    if (!this.client) throw new Error("FOUNDER_DAILY_REPORT_POSTGRES_UNCONFIGURED");
    const { error } = await this.client.from(TABLE).upsert(
      {
        report_date: report.report_date,
        report_id: report.report_id,
        status: report.status,
        version: report.version,
        generated_at: report.generated_at,
        updated_at: report.updated_at,
        finalized_at: report.finalized_at,
        payload: report,
      },
      { onConflict: "report_date" },
    );
    if (error) throw new Error(`FOUNDER_DAILY_REPORT_PERSIST:${error.message}`);
  }

  async list(): Promise<FounderDailyOperationsReport[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from(TABLE)
      .select("payload")
      .order("report_date", { ascending: false });
    if (error || !data) return [];
    return data
      .map((row) => row.payload as FounderDailyOperationsReport)
      .filter((row): row is FounderDailyOperationsReport => Boolean(row?.report_date));
  }
}

export function createPostgresFounderDailyReportStore(): PostgresFounderDailyReportStore {
  return new PostgresFounderDailyReportStore();
}
