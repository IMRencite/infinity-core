import type { PainCluster, PainObservation } from "./types";

const CLUSTER_LABEL: Record<string, string> = {
  SEO: "THIN_OR_UNRANKABLE_PAGES",
  AEO: "WEAK_ANSWER_ENGINE_PRESENCE",
  CUSTOMIZATION: "CUSTOMIZATION_LIMITATIONS",
  CONTENT: "GENERIC_AI_CONTENT",
  PRICE: "EXPENSIVE_OR_FORCED_BUNDLES",
  SUPPORT: "WEAK_SUPPORT",
  ONBOARDING: "PAINFUL_ONBOARDING",
  AUTOMATION: "TOO_MUCH_MANUAL_WORK",
  COMPLEXITY: "PRODUCT_COMPLEXITY",
  QUALITY: "QUALITY_GAPS",
  LOCK_IN: "LOCK_IN",
  INTEGRATIONS: "INTEGRATION_GAPS",
  REPORTING: "OPAQUE_REPORTING",
  SPEED: "SLOW_TIME_TO_VALUE",
  SERVICE: "SERVICE_DISSATISFACTION",
  OTHER: "OTHER_FRICTION",
};

function worst<T extends string>(values: T[], order: T[]): T {
  return order.find((item) => values.includes(item)) ?? values[0]!;
}

export function clusterPainObservations(observations: PainObservation[]): PainCluster[] {
  const buckets = new Map<string, PainObservation[]>();
  for (const item of observations) {
    const list = buckets.get(item.category) ?? [];
    list.push(item);
    buckets.set(item.category, list);
  }
  const clusters: PainCluster[] = [];
  for (const [category, items] of buckets) {
    const competitors = [...new Set(items.map((item) => item.competitor).filter((value): value is string => Boolean(value)))];
    const quality = worst(
      items.map((item) => item.sourceQuality),
      ["LOW", "MEDIUM", "HIGH"],
    );
    const confidence = worst(
      items.map((item) => item.confidence),
      ["LOW", "MEDIUM", "HIGH"],
    );
    const severity = worst(
      items.map((item) => item.severity),
      ["high", "medium", "low"],
    );
    clusters.push({
      id: CLUSTER_LABEL[category] ?? category,
      problem: items[0]?.problem ?? category,
      category: items[0]!.category,
      evidenceCount: items.length,
      affectedCompetitors: competitors,
      confidence,
      severity,
      observations: items,
      sourceQuality: quality,
      independenceNote:
        quality === "LOW"
          ? "Complaint evidence is weak; treat as a signal to investigate, not as proof."
          : "Public/competitor evidence; not first-party Infinity interviews.",
    });
  }
  clusters.sort((a, b) => b.evidenceCount - a.evidenceCount || a.id.localeCompare(b.id));
  return clusters;
}
