import { getOrganicGrowthSchedulerState } from "@/lib/infinity/organic-growth-engine/obligation/scheduler";
import type { BlogOsIsolationSnapshot } from "@/lib/infinity/production-outbound/obligation/isolation-core";
import { listVentureBlogOsStates } from "./store";

function digest(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return `blogos:${hash.toString(16)}`;
}

export function captureBlogOsIsolationSnapshot(now = new Date().toISOString()): BlogOsIsolationSnapshot {
  const states = listVentureBlogOsStates();
  const organic = getOrganicGrowthSchedulerState();
  const obligation_states = states.map((row) => row.obligation?.state ?? "NONE").sort();
  const remediation_ids = states.flatMap((row) => row.remediations.map((item) => item.obligation_id)).sort();
  const content_hashes = states.map((row) => row.roll.content_hash ?? "none").sort();
  const blogs_live_verified = states.reduce((sum, row) => sum + (row.blogs_live_verified_today ?? 0), 0);
  const blogs_in_repair = states.filter((row) => /REPAIR/i.test(row.obligation?.state ?? "") || row.remediations.some((item) => item.state !== "LIVE_VERIFIED")).length;
  const blogs_due = states.filter((row) => row.obligation && row.obligation.state !== "LIVE_VERIFIED").length;
  const snapshot = {
    captured_at: now,
    active_ventures: states.length,
    ventures_with_blogs: states.filter((row) => row.roll.featured_latest_id || row.obligation).length,
    blogs_due,
    blogs_live_verified,
    blogs_in_repair,
    obligation_states,
    remediation_ids,
    execute_publish: false,
    publishing_hold: organic.publishing_hold,
    content_hashes,
    digest: "",
  };
  snapshot.digest = digest({
    obligation_states,
    remediation_ids,
    content_hashes,
    execute_publish: snapshot.execute_publish,
    publishing_hold: snapshot.publishing_hold,
    blogs_due,
    blogs_live_verified,
    blogs_in_repair,
  });
  return snapshot;
}
