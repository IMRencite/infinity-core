import { createClient } from "@supabase/supabase-js";
import type { BlogOsIsolationSnapshot } from "./isolation-core";

export type { BlogOsIsolationSnapshot };
export {
  evaluateBlogOsSnapshotParity,
  evaluateCrossSystemRuntimeIsolation,
  evaluateCommunicationOrganicStateMutation,
  evaluateHqPublicProjectionParity,
  sanitizedPublicCommunicationProjection,
} from "./isolation-core";

const VENTURE_BLOG_OS_SCOPE = "venture-blog-os-v2";

export function captureBlogOsIsolationSnapshot(now = new Date().toISOString()): BlogOsIsolationSnapshot {
  return {
    captured_at: now,
    active_ventures: 0,
    ventures_with_blogs: 0,
    blogs_due: 0,
    blogs_live_verified: 0,
    blogs_in_repair: 0,
    obligation_states: [],
    remediation_ids: [],
    execute_publish: false,
    publishing_hold: null,
    content_hashes: [],
    digest: "communication-runtime-no-blog-os-store",
  };
}

export async function readLiveBlogOsTruthReadonly(): Promise<BlogOsIsolationSnapshot | null> {
  if (process.env.VITEST) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client
    .from("cloud_runtime_state")
    .select("payload")
    .eq("scope", VENTURE_BLOG_OS_SCOPE)
    .maybeSingle();
  if (error || !data?.payload) return null;
  const payload = data.payload as {
    states?: Array<{
      obligation?: { state?: string };
      remediations?: Array<{ obligation_id?: string; state?: string }>;
      blogs_live_verified_today?: number;
      roll?: { featured_latest_id?: string | null; content_hash?: string | null };
    }>;
  };
  const states = payload.states ?? [];
  return {
    captured_at: new Date().toISOString(),
    active_ventures: states.length,
    ventures_with_blogs: states.filter((row) => row.roll?.featured_latest_id || row.obligation).length,
    blogs_due: states.filter((row) => row.obligation && row.obligation.state !== "LIVE_VERIFIED").length,
    blogs_live_verified: states.reduce((sum, row) => sum + (row.blogs_live_verified_today ?? 0), 0),
    blogs_in_repair: states.filter((row) => /REPAIR/i.test(row.obligation?.state ?? "") || (row.remediations ?? []).some((item) => item.state !== "LIVE_VERIFIED")).length,
    obligation_states: states.map((row) => row.obligation?.state ?? "NONE"),
    remediation_ids: states.flatMap((row) => (row.remediations ?? []).map((item) => item.obligation_id ?? "")),
    execute_publish: false,
    publishing_hold: null,
    content_hashes: states.map((row) => row.roll?.content_hash ?? "none"),
    digest: "readonly-remote",
  };
}
