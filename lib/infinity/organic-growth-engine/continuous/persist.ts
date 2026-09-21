import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadServerEnvFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { ORGANIC_CONTINUOUS_SCOPE } from "./contract";
import { emptyOrganicContinuousState, replaceOrganicContinuousState } from "./store";
import type { OrganicContinuousState } from "./types";

function maybeLoadEnv(): void {
  if (process.env.VITEST) return;
  try {
    loadServerEnvFromLocalFile();
  } catch {
    // Local HQ still hydrates from the on-disk snapshot.
  }
}

function adminClient() {
  maybeLoadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function organicContinuousLocalSnapshotPath(venture_id: string): string {
  return join(process.cwd(), ".infinity", "organic-growth-engine", `${venture_id}-organic-continuous-v2.json`);
}

export function persistOrganicContinuousStateLocal(state: OrganicContinuousState): void {
  const path = organicContinuousLocalSnapshotPath(state.venture_id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

export function readOrganicContinuousStateLocal(venture_id: string): OrganicContinuousState | null {
  const path = organicContinuousLocalSnapshotPath(venture_id);
  if (!existsSync(path)) return null;
  try {
    const payload = JSON.parse(readFileSync(path, "utf8")) as OrganicContinuousState;
    if (payload?.venture_id === venture_id && Array.isArray(payload.assets)) return payload;
  } catch {
    return null;
  }
  return null;
}

function publishedCount(state: OrganicContinuousState | null | undefined): number {
  return state?.assets.filter((row) => row.status === "PUBLISHED" || row.status === "REFRESHED").length ?? 0;
}

function preferRicher(current: OrganicContinuousState, incoming: OrganicContinuousState | null): OrganicContinuousState {
  if (!incoming) return current;
  if (publishedCount(incoming) < publishedCount(current)) {
    return overlayQuality(current, incoming);
  }
  if (publishedCount(incoming) === publishedCount(current) && (incoming.published_today ?? 0) < (current.published_today ?? 0)) {
    return overlayQuality(current, incoming);
  }
  return overlayQuality(getMerged(current.venture_id, incoming), current);
}

function overlayQuality(base: OrganicContinuousState, other: OrganicContinuousState | null): OrganicContinuousState {
  if (!other) return base;
  return {
    ...base,
    blog_readiness: base.blog_readiness === "BLOG_READY" || other.blog_readiness === "BLOG_READY" ? "BLOG_READY" : base.blog_readiness ?? other.blog_readiness,
    schema_readiness: base.schema_readiness === "SCHEMA_READY" || other.schema_readiness === "SCHEMA_READY" ? "SCHEMA_READY" : base.schema_readiness ?? other.schema_readiness,
    remediation_queue: (base.remediation_queue?.length ?? 0) >= (other.remediation_queue?.length ?? 0)
      ? base.remediation_queue ?? []
      : other.remediation_queue ?? [],
    schema_remediation_queue: (base.schema_remediation_queue?.length ?? 0) >= (other.schema_remediation_queue?.length ?? 0)
      ? base.schema_remediation_queue ?? []
      : other.schema_remediation_queue ?? [],
    blog_editorial_quality: base.blog_editorial_quality === "PASS" || other.blog_editorial_quality === "PASS" ? "PASS" : base.blog_editorial_quality ?? other.blog_editorial_quality,
    blog_remediation_queue: (base.blog_remediation_queue?.length ?? 0) >= (other.blog_remediation_queue?.length ?? 0)
      ? base.blog_remediation_queue ?? []
      : other.blog_remediation_queue ?? [],
  };
}

export async function persistOrganicContinuousState(state: OrganicContinuousState): Promise<void> {
  const existing = readOrganicContinuousStateLocal(state.venture_id);
  const toWrite = existing && publishedCount(existing) > publishedCount(state) ? existing : state;
  persistOrganicContinuousStateLocal(toWrite);
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: `${ORGANIC_CONTINUOUS_SCOPE}:${state.venture_id}`,
    version: 1,
    instance_id: `organic-continuous:${state.venture_id}`,
    payload: toWrite,
    updated_at: new Date().toISOString(),
  });
}

export async function hydrateOrganicContinuousState(state: OrganicContinuousState): Promise<OrganicContinuousState> {
  let incoming = readOrganicContinuousStateLocal(state.venture_id);
  const client = adminClient();
  if (client) {
    const { data } = await client
      .from("cloud_runtime_state")
      .select("payload")
      .eq("scope", `${ORGANIC_CONTINUOUS_SCOPE}:${state.venture_id}`)
      .maybeSingle();
    const payload = data?.payload as OrganicContinuousState | undefined;
    if (payload && payload.venture_id === state.venture_id && Array.isArray(payload.assets)) {
      incoming = preferRicher(incoming ?? emptyOrganicContinuousState(state.venture_id), payload);
    }
  }
  const next = preferRicher(state, incoming);
  return replaceOrganicContinuousState(state.venture_id, next);
}

function getMerged(venture_id: string, payload: OrganicContinuousState): OrganicContinuousState {
  const empty = emptyOrganicContinuousState(venture_id);
  return {
    ...empty,
    ...payload,
    graph: payload.graph?.nodes?.length ? payload.graph : empty.graph,
    questions: payload.questions ?? [],
    opportunities: payload.opportunities ?? [],
    demand_signals: payload.demand_signals ?? [],
    queue: payload.queue ?? [],
    assets: payload.assets ?? [],
    sales_assets: payload.sales_assets ?? [],
    remediation_queue: payload.remediation_queue ?? [],
    blog_readiness: payload.blog_readiness ?? "BLOG_MISSING",
    schema_remediation_queue: payload.schema_remediation_queue ?? [],
    schema_readiness: payload.schema_readiness ?? "SCHEMA_MISSING",
    blog_editorial_quality: payload.blog_editorial_quality ?? "UNKNOWN",
    blog_remediation_queue: payload.blog_remediation_queue ?? [],
  };
}
