import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { dedupeOpportunities } from "../dedupe/dedupe";
import { emitDiscoveryPipelineEvent } from "../events/emit";
import { normalizeDiscoveryBatch } from "../normalization/normalize";
import {
  bootstrapDiscoverySourceProviders,
  manualDiscoveryProvider,
} from "../providers/bootstrap";
import { isLiveDiscoveryFetchEnabled } from "../providers/config";
import {
  getDiscoverySourceProvider,
  listDiscoverySourceProviders,
} from "../registry/provider-registry";
import { rankScoredOpportunities, scoreDiscoveredOpportunity } from "../ranking/score";
import type { DiscoveryPipelineContext, DiscoveryPipelineResult } from "../types/pipeline";
import type { DiscoveryRawItem } from "../types/provider";
import { persistDiscoveredOpportunity } from "./persist";

export async function runDiscoveryEnginePipeline(
  admin: AdminSupabaseClient,
  context: DiscoveryPipelineContext,
): Promise<DiscoveryPipelineResult> {
  bootstrapDiscoverySourceProviders();

  const providerIds =
    context.providerIds && context.providerIds.length > 0
      ? context.providerIds
      : listDiscoverySourceProviders().map((p) => p.id);

  if (providerIds.length === 0) {
    throw new Error("No discovery source providers registered.");
  }

  await emitDiscoveryPipelineEvent(admin, {
    organizationId: context.organizationId,
    eventType: "discovery.pipeline_started",
    entityType: "opportunity_scan",
    entityId: context.scanId,
    message: "Discovery Engine v1 pipeline started.",
    correlationId: context.correlationId,
    payload: {
      provider_ids: providerIds,
      live_fetch: isLiveDiscoveryFetchEnabled(),
    },
  });

  const maxPerProvider = context.maxItemsPerProvider ?? 25;
  let fetchedCount = 0;
  const normalizedAll: ReturnType<typeof normalizeDiscoveryBatch> = [];

  for (const providerId of providerIds) {
    const provider = getDiscoverySourceProvider(providerId);
    if (!provider) {
      continue;
    }

    const manualItems: DiscoveryRawItem[] | undefined =
      providerId === manualDiscoveryProvider.id ? context.manualItems : undefined;

    const rawItems = await provider.fetch({
      organizationId: context.organizationId,
      scanId: context.scanId,
      limit: maxPerProvider,
      config: manualItems ? { items: manualItems } : undefined,
    });

    fetchedCount += rawItems.length;

    await emitDiscoveryPipelineEvent(admin, {
      organizationId: context.organizationId,
      eventType: "discovery.provider_fetched",
      entityType: "opportunity_scan",
      entityId: context.scanId,
      message: `Provider ${providerId} fetched ${rawItems.length} item(s).`,
      correlationId: context.correlationId,
      payload: {
        provider_id: providerId,
        item_count: rawItems.length,
        live_network: isLiveDiscoveryFetchEnabled() && providerId !== "manual",
      },
    });

    normalizedAll.push(...normalizeDiscoveryBatch(rawItems, providerId));
  }

  const { unique, skipped } = dedupeOpportunities(context.organizationId, normalizedAll);
  const scored = rankScoredOpportunities(unique.map((item) => scoreDiscoveredOpportunity(item)));

  const opportunityIds: string[] = [];
  let persistedCount = 0;
  let eventsEmitted = 1 + providerIds.length;

  for (const opportunity of scored) {
    const persisted = await persistDiscoveredOpportunity(admin, context, opportunity);
    if (persisted.created) {
      persistedCount += 1;
      opportunityIds.push(persisted.opportunityId);

      await emitDiscoveryPipelineEvent(admin, {
        organizationId: context.organizationId,
        eventType: "discovery.opportunity_normalized",
        entityType: "opportunity",
        entityId: persisted.opportunityId,
        message: `Discovery opportunity persisted: ${opportunity.title}`,
        correlationId: context.correlationId,
        payload: {
          opportunity_id: persisted.opportunityId,
          source: opportunity.source,
          overall_score: opportunity.overallScore,
          scan_id: context.scanId,
        },
      });
      eventsEmitted += 1;
    } else if (persisted.opportunityId) {
      opportunityIds.push(persisted.opportunityId);
    }
  }

  await emitDiscoveryPipelineEvent(admin, {
    organizationId: context.organizationId,
    eventType: "discovery.pipeline_completed",
    entityType: "opportunity_scan",
    entityId: context.scanId,
    message: "Discovery Engine v1 pipeline completed.",
    correlationId: context.correlationId,
    payload: {
      fetched_count: fetchedCount,
      normalized_count: normalizedAll.length,
      deduped_unique: unique.length,
      skipped_duplicates: skipped,
      persisted_count: persistedCount,
    },
  });
  eventsEmitted += 1;

  return {
    providersRun: providerIds.length,
    fetchedCount,
    normalizedCount: normalizedAll.length,
    dedupedCount: unique.length,
    persistedCount,
    skippedDuplicateCount: skipped,
    opportunityIds,
    eventsEmitted,
  };
}
