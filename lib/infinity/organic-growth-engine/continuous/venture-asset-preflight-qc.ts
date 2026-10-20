import type { OrganicNamedGate } from "./types";
import type { QuestionClusterPlan, SearchDemandEvidence } from "./search-demand-evidence";
import { evaluateBlogSearchDemandGate, evaluateVentureTrafficFitGate } from "./blog-authority-gates";
import { schemaTypeRouter } from "./schema-standard";
import { inspectCreativeImageGenerateCapability } from "@/lib/infinity/public-venture-design/creative-asset-plan";
import { classifyXaiImaginePresence } from "@/lib/infinity/commerce/creative-media/xai-imagine-adapter";

export const VENTURE_ASSET_PREFLIGHT_QC = "VentureAssetPreflightQc" as const;

export type VentureAssetKind =
  | "AUTHORITY_BLOG"
  | "BLOG_INDEX"
  | "HOMEPAGE"
  | "PRODUCT"
  | "SERVICE"
  | "COLLECTION"
  | "LEGAL"
  | "CONTACT"
  | "ABOUT"
  | "MERCH_DESIGN"
  | "MEDIA";

export type EditorialHeroMediaPlan = {
  required: boolean;
  format: "EDITORIAL_RASTER" | "DIAGRAM_SVG" | "LEGACY_PROCEDURAL_SVG";
  deploy_path?: string;
  width?: number;
  height?: number;
  provider?: "xai-imagine" | "openai-image" | "deterministic-svg";
  alt?: string;
};

export type AssetRequirementsManifest = {
  venture_id: string;
  asset_id: string;
  asset_type: VentureAssetKind;
  page_type: string;
  public_url: string;
  canonical: string;
  indexable: boolean;
  primary_query?: string;
  demand?: SearchDemandEvidence | null;
  cluster?: QuestionClusterPlan | null;
  editorial_premise?: string;
  thesis?: string;
  body_word_target?: { min: number; preferred_min: number; preferred_max: number };
  readability_grade_max?: number;
  transition_share_min?: number;
  section_word_max?: number;
  internal_link_paths?: string[];
  required_schema_types?: string[];
  hero?: EditorialHeroMediaPlan;
  supporting_images?: { min: number; max: number };
  deploy_asset_paths?: string[];
  inventory_action?: "CREATE" | "UPDATE" | "EXPAND" | "MERGE" | "REDIRECT" | "SKIP";
  launch_critical?: boolean;
};

export type VentureAssetPreflightResult = {
  gate: typeof VENTURE_ASSET_PREFLIGHT_QC;
  result: "PASS" | "FAIL";
  generation_allowed: boolean;
  reasons: string[];
  manifest: AssetRequirementsManifest;
  repairs_applied: string[];
};

function named(reasons: string[]): OrganicNamedGate {
  return { gate: VENTURE_ASSET_PREFLIGHT_QC, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function classifyTopicCannibalization(input: {
  proposed_canonical: string;
  proposed_primary_query: string;
  existing: Array<{ canonical: string; primary_query?: string }>;
}): AssetRequirementsManifest["inventory_action"] {
  const slug = input.proposed_canonical.split("/").filter(Boolean).slice(-1)[0] ?? "";
  const dup = input.existing.find((row) => row.canonical === input.proposed_canonical);
  if (dup) return "UPDATE";
  const near = input.existing.find((row) => {
    const q = (row.primary_query ?? "").toLowerCase();
    const p = input.proposed_primary_query.toLowerCase();
    return q && p && (q === p || q.includes(p) || p.includes(q));
  });
  if (near && near.canonical !== input.proposed_canonical) return "MERGE";
  return "CREATE";
}

export function repairAssetRequirementsManifest(manifest: AssetRequirementsManifest): {
  manifest: AssetRequirementsManifest;
  repairs: string[];
} {
  const repairs: string[] = [];
  const next = { ...manifest };
  if (next.asset_type === "AUTHORITY_BLOG" && !next.body_word_target) {
    next.body_word_target = { min: 2000, preferred_min: 2200, preferred_max: 2800 };
    repairs.push("body_word_target_defaulted");
  }
  if (next.asset_type === "AUTHORITY_BLOG" && next.hero?.required && next.hero.format === "LEGACY_PROCEDURAL_SVG") {
    next.hero = {
      ...next.hero,
      format: "EDITORIAL_RASTER",
      provider: classifyXaiImaginePresence().credential === "PRESENT" ? "xai-imagine" : "openai-image",
    };
    repairs.push("hero_upgraded_to_raster_plan");
  }
  if (next.asset_type === "AUTHORITY_BLOG" && !next.required_schema_types?.length) {
    next.required_schema_types = schemaTypeRouter("BLOG_ARTICLE");
    repairs.push("schema_types_defaulted");
  }
  if (next.asset_type === "AUTHORITY_BLOG" && !next.readability_grade_max) {
    next.readability_grade_max = 5;
    repairs.push("readability_defaulted");
  }
  if (next.asset_type === "AUTHORITY_BLOG" && !next.transition_share_min) {
    next.transition_share_min = 0.35;
    repairs.push("transition_defaulted");
  }
  return { manifest: next, repairs };
}

export function evaluateVentureAssetPreflightQc(manifest: AssetRequirementsManifest): VentureAssetPreflightResult {
  const reasons: string[] = [];
  if (!manifest.venture_id) reasons.push("venture_id_missing");
  if (!manifest.asset_id) reasons.push("asset_id_missing");
  if (!manifest.canonical) reasons.push("canonical_unresolved");
  if (!manifest.public_url) reasons.push("public_url_missing");
  if (/localhost|127\.0\.0\.1|vercel\.app/i.test(manifest.canonical)) reasons.push("preview_canonical");

  if (manifest.asset_type === "AUTHORITY_BLOG") {
    if (!manifest.primary_query) reasons.push("primary_query_missing");
    if (!manifest.editorial_premise) reasons.push("editorial_premise_missing");
    if (!manifest.thesis) reasons.push("thesis_missing");
    if (!manifest.demand) reasons.push("search_demand_missing");
    else {
      const demandGate = evaluateBlogSearchDemandGate(manifest.demand);
      if (demandGate.result !== "PASS") reasons.push("search_demand_unverified");
      if (
        manifest.demand.signals.some(
          (s) => s.kind === "OBSERVED_QUERY" && !s.source.trim(),
        )
      ) {
        reasons.push("observed_query_not_proven");
      }
    }
    if (manifest.cluster && manifest.demand) {
      const fit = evaluateVentureTrafficFitGate({
        draft: {
          title: manifest.primary_query ?? "",
          meta_description: "",
          h1: manifest.primary_query ?? "",
          headings: [],
          body: manifest.editorial_premise ?? "",
          direct_answer: manifest.thesis ?? "",
          citations: [],
          schema: [],
          canonical: manifest.canonical,
          breadcrumbs: [],
          internal_links: [],
          word_count: 0,
          origin: manifest.public_url.replace(/\/journal.*/, ""),
          page_kind: "BLOG_ARTICLE",
          visible_faqs: [],
        },
        evidence: manifest.demand,
      });
      if (fit.result !== "PASS") reasons.push("venture_traffic_fit_fail");
    }
    const target = manifest.body_word_target ?? { min: 2000, preferred_min: 2200, preferred_max: 2800 };
    if (target.min < 2000) reasons.push("depth_plan_below_authority_minimum");
    if (manifest.inventory_action === "SKIP") reasons.push("topic_cannibalization_skip");
    if (manifest.hero?.required) {
      if (!manifest.hero.deploy_path) reasons.push("hero_deploy_path_missing");
      if (manifest.hero.format === "LEGACY_PROCEDURAL_SVG") reasons.push("hero_legacy_svg_default");
      if (manifest.hero.format === "EDITORIAL_RASTER") {
        const path = manifest.hero.deploy_path ?? "";
        if (path.endsWith(".svg")) reasons.push("hero_raster_required_not_svg");
        if (manifest.deploy_asset_paths && manifest.hero.deploy_path && !manifest.deploy_asset_paths.includes(manifest.hero.deploy_path)) {
          reasons.push("hero_not_in_deploy_manifest");
        }
      }
    } else if (manifest.hero?.required === false) {
      /* explicit exempt */
    } else {
      reasons.push("hero_strategy_unresolved");
    }
    if (!manifest.required_schema_types?.length) reasons.push("schema_contract_unresolved");
  }

  if (manifest.asset_type === "MERCH_DESIGN") {
    reasons.push("use_merch_design_preflight");
  }

  const gate = named(reasons);
  const result = gate.result === "PASS" ? "PASS" : "FAIL";
  return {
    gate: VENTURE_ASSET_PREFLIGHT_QC,
    result,
    generation_allowed: result === "PASS",
    reasons: gate.reasons,
    manifest,
    repairs_applied: [],
  };
}

export function runVentureAssetPreflightWithRepair(manifest: AssetRequirementsManifest): VentureAssetPreflightResult {
  let current = manifest;
  const repairs: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const first = evaluateVentureAssetPreflightQc(current);
    if (first.result === "PASS") return { ...first, repairs_applied: repairs };
    const repaired = repairAssetRequirementsManifest(current);
    current = repaired.manifest;
    repairs.push(...repaired.repairs);
    const second = evaluateVentureAssetPreflightQc(current);
    if (second.result === "PASS") return { ...second, repairs_applied: repairs };
  }
  const final = evaluateVentureAssetPreflightQc(current);
  return { ...final, repairs_applied: repairs };
}

export function editorialImageProviderStatus(): {
  xai_imagine: ReturnType<typeof classifyXaiImaginePresence>;
  creative_engine: ReturnType<typeof inspectCreativeImageGenerateCapability>;
} {
  return {
    xai_imagine: classifyXaiImaginePresence(),
    creative_engine: inspectCreativeImageGenerateCapability(),
  };
}
