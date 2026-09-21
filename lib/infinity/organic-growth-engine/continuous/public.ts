import { projectPublicBlogOccupancy } from "../blog-os/live-work";
import { PUBLIC_ORGANIC_ACTIVITY, PUBLIC_ORGANIC_FORBIDDEN } from "./contract";
import type { OrganicContinuousState } from "./types";

export function projectPublicOrganicActivity(
  state: OrganicContinuousState | null,
  extras?: { publishing_hold?: string | null },
): {
  activity: (typeof PUBLIC_ORGANIC_ACTIVITY)[number];
  occupancy: "ACTIVE" | "MONITORING" | "IDLE";
} {
  const blog = extras?.publishing_hold ? null : projectPublicBlogOccupancy();
  if (extras?.publishing_hold === "PAUSED_FOR_QC_REPAIR") {
    return { activity: "Improving published resources", occupancy: "MONITORING" };
  }
  if (blog?.occupancy === "ACTIVE") {
    return {
      activity: (PUBLIC_ORGANIC_ACTIVITY.includes(blog.activity as (typeof PUBLIC_ORGANIC_ACTIVITY)[number])
        ? blog.activity
        : "Publishing editorial content") as (typeof PUBLIC_ORGANIC_ACTIVITY)[number],
      occupancy: "ACTIVE",
    };
  }
  if (!state) {
    return blog
      ? { activity: (blog.activity as (typeof PUBLIC_ORGANIC_ACTIVITY)[number]), occupancy: blog.occupancy }
      : { activity: "Monitoring organic growth", occupancy: "IDLE" };
  }
  if (state.queue.some((row) => ["WRITE", "VALIDATE", "PUBLISH"].includes(row.stage)) || state.published_today > 0) {
    return { activity: "Publishing educational resources", occupancy: "ACTIVE" };
  }
  if ((state.remediation_queue ?? []).some((row) => row.priority === "HIGH")) {
    return { activity: "Improving published resources", occupancy: "MONITORING" };
  }
  if (state.queue.some((row) => row.stage === "REFRESH") || state.refreshed_today > 0) {
    return { activity: "Refreshing venture content", occupancy: "MONITORING" };
  }
  if (state.queue.some((row) => row.stage === "RESEARCH" || row.stage === "DISCOVER")) {
    return { activity: "Researching market questions", occupancy: "MONITORING" };
  }
  if (state.graph.content_gaps.length > 0) {
    return { activity: "Expanding topic coverage", occupancy: "MONITORING" };
  }
  return { activity: "Monitoring organic growth", occupancy: "IDLE" };
}

export function sanitizePublicOrganicText(text: string): string {
  let next = text;
  for (const pattern of PUBLIC_ORGANIC_FORBIDDEN) {
    next = next.replace(pattern, "[redacted]");
  }
  next = next
    .replace(/\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\//gi, "[path]")
    .replace(/\bprospect:[a-z0-9-]+\b/gi, "[redacted]")
    .replace(/\bscore:\s*\d+(\.\d+)?/gi, "[redacted]");
  return next;
}

export function evaluatePublicOrganicPrivacy(text: string): { result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons = PUBLIC_ORGANIC_FORBIDDEN.filter((pattern) => pattern.test(text)).map((pattern) => String(pattern));
  if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) reasons.push("email");
  if (/prospect_id|opportunity score|keyword strategy|draft text/i.test(text)) reasons.push("private_field");
  return { result: reasons.length ? "FAIL" : "PASS", reasons };
}
