import { ALL_HQ_ROOM_IDS, getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { detectForbiddenHqCopilotAction } from "./capabilities";
import { resolveHqCopilotNavigation } from "./navigation";
import type { HqCopilotAllowedCapability, HqCopilotForbiddenCapability, HqCopilotIntent } from "./types";

export type HqCopilotRouteResult =
  | {
      intent: Exclude<HqCopilotIntent, "FORBIDDEN_ACTION">;
      capability: HqCopilotAllowedCapability;
      roomId?: DepartmentId | null;
      compareNames?: string[];
      requestedMetric?: string | null;
    }
  | {
      intent: "FORBIDDEN_ACTION";
      capability: HqCopilotForbiddenCapability;
      blockedAction: HqCopilotForbiddenCapability;
    };

function resolveMentionedRoom(question: string): DepartmentId | null {
  const text = question.toLowerCase();
  let best: DepartmentId | null = null;
  let bestLen = 0;
  for (const id of ALL_HQ_ROOM_IDS) {
    const names = getRoomDisplayNames(id);
    const aliases = [names.displayName.toLowerCase(), id.replaceAll("_", " ")];
    for (const alias of aliases) {
      if (alias.length >= 4 && text.includes(alias) && alias.length > bestLen) {
        best = id;
        bestLen = alias.length;
      }
    }
  }
  return best;
}

function looksLikeNavigation(question: string): boolean {
  return /\b(open|show|take me|go to|navigate|bring up)\b/i.test(question);
}

export function routeHqCopilotQuery(question: string): HqCopilotRouteResult {
  const blocked = detectForbiddenHqCopilotAction(question);
  if (blocked) {
    return { intent: "FORBIDDEN_ACTION", capability: blocked, blockedAction: blocked };
  }

  const text = question.trim();
  const lower = text.toLowerCase();
  const roomId = resolveMentionedRoom(text);

  if (looksLikeNavigation(lower) && resolveHqCopilotNavigation(text)) {
    return { intent: "NAVIGATION_REQUEST", capability: "NAVIGATE", roomId };
  }

  if (/\bwhy\s+did\s+infinity\b.{0,40}\b(hold|reject|build|pause|stop)\b/i.test(lower) || /\bexisting\s+decision\b/i.test(lower)) {
    return { intent: "EXISTING_DECISION_EXPLANATION", capability: "EXPLAIN" };
  }

  if (/\b(compare|versus|vs\.?)\b/i.test(lower)) {
    const names = [...text.matchAll(/\bventure\s+([A-Za-z0-9][A-Za-z0-9 _-]{0,40})/gi)].map((m) => m[1].trim());
    return { intent: "COMPARE_EXISTING_METRICS", capability: "COMPARE", compareNames: names };
  }

  if (/\b(research|evidence|citations?)\b/i.test(lower)) {
    return { intent: "RESEARCH_EVIDENCE", capability: "TRACE", roomId: roomId ?? "research_department" };
  }

  if (/\b(lineage|trace|where\s+did\s+this\s+come\s+from)\b/i.test(lower)) {
    return { intent: "TRACE_LINEAGE", capability: "TRACE" };
  }

  if (/\b(validation station|validation|quality control)\b/i.test(lower)) {
    const intent = /\b(working on|activity|now|doing)\b/i.test(lower) ? "ROOM_ACTIVITY" : "VALIDATION_STATUS";
    return { intent, capability: intent === "ROOM_ACTIVITY" ? "READ" : "SUMMARIZE", roomId: "quality_control" };
  }

  if (/\b(provider|cloudflare|namecheap|vercel|stripe|verified)\b/i.test(lower)) {
    return { intent: "PROVIDER_STATUS", capability: "READ" };
  }

  if (/\b(treasury|capital|allocated|cash|budget)\b/i.test(lower)) {
    return { intent: "TREASURY_STATUS", capability: "READ" };
  }

  if (/\b(monetization|gross margin|pricing|revenue model)\b/i.test(lower)) {
    return { intent: "MONETIZATION_STATUS", capability: "READ" };
  }

  if (/\b(perform(ing|ance)|top earner|best)\b/i.test(lower)) {
    return { intent: "PERFORMANCE_STATUS", capability: "SUMMARIZE" };
  }

  if (/\b(latest build|build produce|artifact|what did .{0,20} produce)\b/i.test(lower)) {
    return { intent: "BUILD_STATUS", capability: "READ" };
  }

  if (/\bmission\b/i.test(lower)) {
    return { intent: "MISSION_STATUS", capability: "READ" };
  }

  if (/\bblock(ing|er|ers)?\b/i.test(lower)) {
    return { intent: "VENTURE_BLOCKERS", capability: "READ" };
  }

  if (/\b(readiness|ready to launch|closest to launch)\b/i.test(lower)) {
    return { intent: "VENTURE_READINESS", capability: "SUMMARIZE" };
  }

  if (/\b(this room|room working|current activity)\b/i.test(lower) || (roomId && /\b(working on|activity|doing)\b/i.test(lower))) {
    return { intent: "ROOM_ACTIVITY", capability: "READ", roomId };
  }

  if (roomId) {
    return { intent: "ROOM_STATUS", capability: "READ", roomId };
  }

  if (/\b(active ventures|which ventures|portfolio|what ventures)\b/i.test(lower)) {
    return { intent: "PORTFOLIO_STATUS", capability: "SUMMARIZE" };
  }

  if (/\b(this venture|current venture|venture status|what changed)\b/i.test(lower)) {
    return { intent: "VENTURE_STATUS", capability: "READ" };
  }

  if (/\b(cac|customer acquisition cost)\b/i.test(lower)) {
    return { intent: "PERFORMANCE_STATUS", capability: "READ", requestedMetric: "cac" };
  }

  return { intent: "GENERAL_HQ_SUMMARY", capability: "SUMMARIZE" };
}
