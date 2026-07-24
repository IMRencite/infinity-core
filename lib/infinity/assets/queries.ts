import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Asset, AssetMetric, AssetSummary, AssetValuation } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

function readNumeric(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

export async function listAssetsForOrganization(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list assets: ${error.message}`);
  }

  return data ?? [];
}

export async function getAssetById(
  supabase: InfinitySupabase,
  organizationId: string,
  assetId: string,
): Promise<Asset | null> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load asset: ${error.message}`);
  }

  return data;
}

export async function listRecentAssetMetrics(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 10,
): Promise<AssetMetric[]> {
  const { data, error } = await supabase
    .from("asset_metrics")
    .select("*")
    .eq("organization_id", organizationId)
    .order("measured_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list asset metrics: ${error.message}`);
  }

  return data ?? [];
}

export async function listRecentAssetValuations(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 10,
): Promise<AssetValuation[]> {
  const { data, error } = await supabase
    .from("asset_valuations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("valued_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list asset valuations: ${error.message}`);
  }

  return data ?? [];
}

export async function calculateAssetSummary(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<AssetSummary> {
  const { data: assets, error } = await supabase
    .from("assets")
    .select(
      "asset_type, status, monthly_revenue, monthly_operating_cost, estimated_value, verified_value",
    )
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to calculate asset summary: ${error.message}`);
  }

  const summary: AssetSummary = {
    totalCount: assets?.length ?? 0,
    activeCount: 0,
    byType: {},
    byStatus: {},
    totalMonthlyRevenue: 0,
    totalMonthlyOperatingCost: 0,
    totalEstimatedValue: 0,
    totalVerifiedValue: 0,
  };

  for (const asset of assets ?? []) {
    summary.byType[asset.asset_type] = (summary.byType[asset.asset_type] ?? 0) + 1;
    summary.byStatus[asset.status] = (summary.byStatus[asset.status] ?? 0) + 1;

    if (asset.status === "active") {
      summary.activeCount += 1;
    }

    summary.totalMonthlyRevenue += readNumeric(asset.monthly_revenue);
    summary.totalMonthlyOperatingCost += readNumeric(asset.monthly_operating_cost);
    summary.totalEstimatedValue += readNumeric(asset.estimated_value);
    summary.totalVerifiedValue += readNumeric(asset.verified_value);
  }

  return summary;
}

export function mergeAssetMetadata(
  metadata: Record<string, unknown> | undefined,
  sourceEntityType?: string | null,
  sourceEntityId?: string | null,
): Json {
  const merged: Record<string, Json> = {
    ...(metadata as Record<string, Json> | undefined),
  };

  if (sourceEntityType && sourceEntityId) {
    merged.registration_source = {
      entity_type: sourceEntityType,
      entity_id: sourceEntityId,
    };
  }

  return merged;
}
