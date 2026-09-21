import type { CannibalizationDecision, PageOpportunity } from "./types";

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((item) => item.length > 2));
}

function overlap(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const token of left) if (right.has(token)) hit += 1;
  return hit / Math.max(left.size, right.size);
}

export function detectCannibalization(opportunities: PageOpportunity[]): CannibalizationDecision[] {
  const decisions: CannibalizationDecision[] = [];
  for (let i = 0; i < opportunities.length; i += 1) {
    for (let j = i + 1; j < opportunities.length; j += 1) {
      const left = opportunities[i];
      const right = opportunities[j];
      const score = overlap(`${left.topic} ${left.primaryIntent}`, `${right.topic} ${right.primaryIntent}`);
      if (left.topic === right.topic && left.primaryIntent === right.primaryIntent) {
        decisions.push({ left: left.pageOpportunityId, right: right.pageOpportunityId, action: "MERGE", reason: "Same topic and intent" });
      } else if (left.geoOpportunity.question === right.geoOpportunity.question && left.primaryIntent === right.primaryIntent) {
        decisions.push({ left: left.pageOpportunityId, right: right.pageOpportunityId, action: "REJECT_DUPLICATE", reason: "Same question and intent" });
      } else if (score > 0.8 && left.primaryIntent === right.primaryIntent) {
        decisions.push({
          left: left.pageOpportunityId,
          right: right.pageOpportunityId,
          action: left.internalLinkRole === "HUB" || right.internalLinkRole === "HUB" ? "HUB_AND_SPOKE" : "REJECT_DUPLICATE",
          reason: "Near-duplicate topic with the same intent",
        });
      } else if (score > 0.65 && left.primaryIntent === right.primaryIntent) {
        decisions.push({ left: left.pageOpportunityId, right: right.pageOpportunityId, action: "CHANGE_INTENT", reason: "High overlap; differentiate or merge" });
      } else {
        decisions.push({ left: left.pageOpportunityId, right: right.pageOpportunityId, action: "KEEP", reason: "Distinct purpose" });
      }
    }
  }
  return decisions;
}

export function applyCannibalization(opportunities: PageOpportunity[]): PageOpportunity[] {
  const rejected = new Set<string>();
  for (const decision of detectCannibalization(opportunities)) {
    if (decision.action === "MERGE" || decision.action === "REJECT_DUPLICATE") rejected.add(decision.right);
  }
  return opportunities.map((item) =>
    rejected.has(item.pageOpportunityId) ? { ...item, status: "REJECTED_CANNIBALIZATION" } : item,
  );
}
