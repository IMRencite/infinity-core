import type { CapabilityStatus } from "./types";

const TABLE_STAKES = [
  { test: /mobile|responsive/i, label: "mobile editing" },
  { test: /template/i, label: "templates" },
  { test: /analytics|reporting dashboard/i, label: "analytics" },
  { test: /support|help desk/i, label: "support" },
  { test: /hosting/i, label: "hosting" },
  { test: /basic seo|on-page seo/i, label: "basic SEO" },
];

export function classifyTableStake(text: string): string | null {
  for (const item of TABLE_STAKES) {
    if (item.test.test(text)) return item.label;
  }
  return null;
}

export function classifyCapability(input: {
  improvement: string;
  proposedSolution: string | null;
  plannedCapabilities?: string[];
}): CapabilityStatus {
  const blob = `${input.improvement} ${input.proposedSolution ?? ""} ${(input.plannedCapabilities ?? []).join(" ")}`.toLowerCase();
  const planned = (input.plannedCapabilities ?? []).map((item) => item.toLowerCase());
  if (planned.some((item) => item.includes("built") && blob.includes(item.replace("built", "").trim()))) return "ALREADY_BUILT";
  if (/knowledge base|seo\/aeo|aeo|structured (service|location) page|ai cms/i.test(input.proposedSolution ?? "")) {
    if (/structured (service|location)|service \+ location|knowledge[- ]base|aeo page|seo\/aeo architecture|entity-rich/i.test(input.improvement)) {
      return "ALREADY_PLANNED";
    }
    if (/optional managed|modular|self-serve/i.test(input.improvement)) return "PARTIALLY_COVERED";
  }
  if (!input.proposedSolution && !planned.length) return "UNKNOWN";
  return "NEW_OPPORTUNITY";
}

export function differentiatorType(input: {
  tableStake: boolean;
  evidenceCount: number;
  competitorCoverage: number;
}): "TABLE_STAKES" | "INCREMENTAL_ADVANTAGE" | "MEANINGFUL_DIFFERENTIATOR" | "UNPROVEN_IDEA" {
  if (input.tableStake) return "TABLE_STAKES";
  if (input.evidenceCount >= 2 && input.competitorCoverage >= 1) return "MEANINGFUL_DIFFERENTIATOR";
  if (input.evidenceCount >= 1) return "INCREMENTAL_ADVANTAGE";
  return "UNPROVEN_IDEA";
}
