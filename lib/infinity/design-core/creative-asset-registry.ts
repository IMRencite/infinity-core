import { createHash } from "node:crypto";
import { inspectSvgCreativeQuality } from "@/lib/infinity/qc-escape/creative-quality";

export const CREATIVE_ASSET_ROLES = [
  "HERO",
  "FEATURED",
  "CATEGORY",
  "TAG_TOPIC",
  "SUPPORTING_VISUAL",
  "SOCIAL",
  "CARD",
  "ARCHIVE",
  "CAMPAIGN",
] as const;

export type CreativeAssetRole = (typeof CREATIVE_ASSET_ROLES)[number];

export const CREATIVE_UNIQUENESS_CLASSES = [
  "UNIQUE",
  "INTENTIONAL_REUSE",
  "SAME_ENTITY_VARIANT",
  "DUPLICATE",
  "NEAR_DUPLICATE",
  "GENERIC_OVERUSE",
] as const;

export type CreativeUniquenessClass = (typeof CREATIVE_UNIQUENESS_CLASSES)[number];

export type CreativeAssetRecord = {
  asset_id: string;
  venture_id: string;
  content_asset_id: string;
  entity_type: "article" | "category" | "tag" | "page" | "campaign" | "card";
  entity_id: string;
  creative_role: CreativeAssetRole;
  source: string;
  design_core_job_id: string | null;
  visual_fingerprint: string;
  semantic_topic: string;
  brand_profile: string;
  created_at: string;
  status: "ACTIVE" | "RETIRED" | "TEXT_ONLY";
  intentional_reuse_reason?: string;
};

export function visualFingerprint(source: string, semanticTopic: string): string {
  return createHash("sha256").update(`${source}::${semanticTopic}`).digest("hex").slice(0, 16);
}

export function registerCreativeAsset(input: Omit<CreativeAssetRecord, "visual_fingerprint"> & { visual_fingerprint?: string }): CreativeAssetRecord {
  return {
    ...input,
    visual_fingerprint: input.visual_fingerprint ?? visualFingerprint(input.source, input.semantic_topic),
  };
}

export function classifyCreativeReuse(input: {
  left: CreativeAssetRecord;
  right: CreativeAssetRecord;
}): CreativeUniquenessClass {
  const { left, right } = input;
  if (left.status === "TEXT_ONLY" || right.status === "TEXT_ONLY") return "UNIQUE";
  const sameSource = left.source === right.source || left.visual_fingerprint === right.visual_fingerprint;
  if (!sameSource) return "UNIQUE";
  if (left.entity_type === right.entity_type && left.entity_id === right.entity_id) return "SAME_ENTITY_VARIANT";
  if (left.intentional_reuse_reason && right.intentional_reuse_reason) return "INTENTIONAL_REUSE";
  return "DUPLICATE";
}

export function classifyCreativeInventory(records: CreativeAssetRecord[]): {
  classifications: Array<{ asset_id: string; result: CreativeUniquenessClass }>;
  overusedSources: string[];
} {
  const bySource = new Map<string, CreativeAssetRecord[]>();
  for (const record of records) {
    if (record.status === "TEXT_ONLY") continue;
    const rows = bySource.get(record.source) ?? [];
    rows.push(record);
    bySource.set(record.source, rows);
  }
  const classifications: Array<{ asset_id: string; result: CreativeUniquenessClass }> = [];
  const overusedSources: string[] = [];
  for (const [source, rows] of bySource) {
    const entities = new Set(rows.map((row) => `${row.entity_type}:${row.entity_id}`));
    const intentional = rows.every((row) => row.intentional_reuse_reason);
    if (entities.size >= 3 && !intentional) overusedSources.push(source);
    for (const row of rows) {
      const peer = rows.find((other) => other.asset_id !== row.asset_id);
      classifications.push({
        asset_id: row.asset_id,
        result: peer ? classifyCreativeReuse({ left: row, right: peer }) : "UNIQUE",
      });
    }
  }
  return { classifications, overusedSources };
}

export function evaluateCreativeUniquenessGate(records: CreativeAssetRecord[]): {
  gate: "CreativeUniquenessGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const inventory = classifyCreativeInventory(records);
  const duplicates = inventory.classifications.filter((row) => row.result === "DUPLICATE" || row.result === "NEAR_DUPLICATE");
  const reasons = [
    ...duplicates.map((row) => `CREATIVE_DUPLICATE:${row.asset_id}`),
    ...inventory.overusedSources.map((source) => `CREATIVE_GENERIC_OVERUSE:${source}`),
  ];
  return {
    gate: "CreativeUniquenessGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["UNIQUE_OR_INTENTIONAL"],
  };
}

export function evaluateCreativeOveruseGate(records: CreativeAssetRecord[], threshold = 3): {
  gate: "CreativeOveruseGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const inventory = classifyCreativeInventory(records);
  const overused = inventory.overusedSources.filter((source) => {
    const count = records.filter((row) => row.source === source && row.status !== "TEXT_ONLY").length;
    return count >= threshold;
  });
  return {
    gate: "CreativeOveruseGate",
    result: overused.length ? "FAIL" : "PASS",
    reasons: overused.length ? overused.map((source) => `CREATIVE_GENERIC_OVERUSE:${source}`) : ["NO_GENERIC_OVERUSE"],
  };
}

export function evaluateCreativeSurfaceFitGate(input: {
  role: CreativeAssetRole;
  aspectRatio: string;
  source: string;
  photographicHero?: boolean;
}): {
  gate: "CreativeSurfaceFitGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.role === "HERO" && !/16:9|3:2|21:9/.test(input.aspectRatio)) reasons.push("CREATIVE_SURFACE_MISMATCH");
  if (input.role === "CARD" && !/4:3|1:1|3:2/.test(input.aspectRatio)) reasons.push("CREATIVE_SURFACE_MISMATCH");
  if (input.role === "SOCIAL" && !/1:1|4:5/.test(input.aspectRatio)) reasons.push("CREATIVE_SURFACE_MISMATCH");
  if (!input.source) reasons.push("CREATIVE_SURFACE_MISMATCH");
  return {
    gate: "CreativeSurfaceFitGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["SURFACE_FIT"],
  };
}

export function evaluateDesignCoreCreativeQualityGate(input: {
  unique: boolean;
  relevant: boolean;
  brandFit: boolean;
  genericFiller: boolean;
  textArtifacts: boolean;
  surfaceFit: boolean;
  svg?: string;
  source?: string;
}): {
  gate: "DesignCoreCreativeQualityGate";
  result: "PASS" | "FAIL" | "NOT_PROVEN";
  reasons: string[];
} {
  if ((input.source?.endsWith(".svg") || input.source?.includes(".svg")) && !input.svg) {
    return {
      gate: "DesignCoreCreativeQualityGate",
      result: "NOT_PROVEN",
      reasons: ["SVG_NOT_INSPECTED"],
    };
  }
  if (input.svg) {
    const inspected = inspectSvgCreativeQuality(input.svg);
    const reasons: string[] = [...inspected.reasons];
    if (!input.relevant) reasons.push("NOT_RELEVANT");
    if (!input.brandFit) reasons.push("BRAND_MISMATCH");
    return {
      gate: "DesignCoreCreativeQualityGate",
      result: reasons.length ? "FAIL" : "PASS",
      reasons: reasons.length ? reasons : ["INSPECTED_SVG_QUALITY"],
    };
  }
  const reasons: string[] = [];
  if (!input.unique) reasons.push("NOT_UNIQUE");
  if (!input.relevant) reasons.push("NOT_RELEVANT");
  if (!input.brandFit) reasons.push("BRAND_MISMATCH");
  if (input.genericFiller) reasons.push("GENERIC_FILLER");
  if (input.textArtifacts) reasons.push("TEXT_ARTIFACTS");
  if (!input.surfaceFit) reasons.push("CREATIVE_SURFACE_MISMATCH");
  return {
    gate: "DesignCoreCreativeQualityGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["DESIGN_CORE_QUALITY"],
  };
}

export function planOrganicCreativeAsset(input: {
  entityType: CreativeAssetRecord["entity_type"];
  topic: string;
  existing?: CreativeAssetRecord[];
}): {
  heroRequired: boolean;
  featuredRequired: boolean;
  supportingVisualRequired: boolean;
  categoryCreative: boolean;
  topicCreative: boolean;
  conflictingExistingAsset: boolean;
  designCoreJobNeeded: boolean;
} {
  const conflicting = (input.existing ?? []).some((row) => row.semantic_topic !== input.topic && row.source.includes("hero-building"));
  return {
    heroRequired: input.entityType === "article" || input.entityType === "page",
    featuredRequired: input.entityType === "article",
    supportingVisualRequired: input.entityType === "article",
    categoryCreative: input.entityType === "category",
    topicCreative: input.entityType === "tag",
    conflictingExistingAsset: conflicting,
    designCoreJobNeeded: conflicting || input.entityType === "article" || input.entityType === "category",
  };
}
