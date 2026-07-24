import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import { isDiscoverySignalType } from "./constants";
import type { DiscoveryContext, DiscoverySignal } from "./types";

export type RecordDiscoverySignalInput = DiscoveryContext & {
  signalType: string;
  title: string;
  summary?: string | null;
  externalSignalId?: string | null;
  signalHash: string;
  sourceUrl?: string | null;
  rawData?: Record<string, unknown>;
  relevanceScore?: number | null;
};

export async function recordDiscoverySignal(
  admin: AdminSupabaseClient,
  input: RecordDiscoverySignalInput,
): Promise<DiscoverySignal> {
  if (!isDiscoverySignalType(input.signalType)) {
    throw new Error(`Invalid discovery signal type: ${input.signalType}`);
  }

  const { data: existing, error: existingError } = await admin
    .from("discovery_signals")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("signal_hash", input.signalHash)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check discovery signal: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: signal, error } = await admin
    .from("discovery_signals")
    .insert({
      organization_id: input.organizationId,
      scan_id: input.scanId,
      provider_id: input.providerId ?? null,
      signal_type: input.signalType,
      title: input.title,
      summary: input.summary ?? null,
      external_signal_id: input.externalSignalId ?? null,
      signal_hash: input.signalHash,
      source_url: input.sourceUrl ?? null,
      raw_data: (input.rawData ?? {}) as Json,
      relevance_score: input.relevanceScore ?? null,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select("*")
    .single();

  if (error || !signal) {
    throw new Error(
      `Failed to record discovery signal: ${error?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "discovery_engine",
    eventType: "discovery.signal_recorded",
    entityType: "discovery_signal",
    entityId: signal.id,
    message: `Discovery signal recorded: ${signal.title}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      signal_id: signal.id,
      scan_id: input.scanId,
      signal_hash: input.signalHash,
      signal_type: input.signalType,
    },
  });

  return signal;
}
