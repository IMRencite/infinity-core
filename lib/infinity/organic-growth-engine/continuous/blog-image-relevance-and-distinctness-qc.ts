import type { OrganicNamedGate } from "./types";
import {
  legacyOccupancyHeroPaths,
  occupancyBlogImageBriefForSlug,
  type OccupancyBlogImageBrief,
} from "./occupancynpv-blog-image-briefs";
import { listAuthorizedBacklogMediaBundles, resolveMediaFileOnDisk } from "./blog-article-media-registry";
import {
  hammingHexHash,
  OCCUPANCY_PERCEPTUAL_SIMILARITY_MAX,
  perceptualHashFromFile,
  sha256FileHex,
} from "./blog-image-perceptual-hash";

export const BLOG_IMAGE_DISTINCTNESS_QC = "BlogImageDistinctnessQc" as const;
export const ARTICLE_IMAGE_ASSOCIATION_QC = "ArticleImageAssociationQc" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateArticleImageRelevanceQc(input: {
  slug: string;
  src: string;
  brief?: OccupancyBlogImageBrief;
}): OrganicNamedGate {
  const reasons: string[] = [];
  let brief = input.brief;
  try {
    brief = brief ?? occupancyBlogImageBriefForSlug(input.slug);
  } catch {
    return named("IMAGE_RELEVANCE_QC", ["brief_missing"]);
  }

  if (legacyOccupancyHeroPaths().includes(input.src)) {
    reasons.push("legacy_superseded_portrait_asset");
  }
  if (brief.portrait_primary) reasons.push("portrait_primary_brief");
  if (/hero-building|hero-interior|hero-district|hero-workstation|lease-numbers\.webp|lease-compare\.webp/i.test(input.src)) {
    reasons.push("pre_v2_generic_asset_path");
  }

  return named("IMAGE_RELEVANCE_QC", reasons);
}

export type OccupancyVentureImageFingerprint = {
  slug: string;
  src: string;
  path: string;
  sha256: string;
  perceptual_hash: string;
  brief_id: string;
};

export async function fingerprintOccupancyVentureImages(): Promise<OccupancyVentureImageFingerprint[]> {
  const bundles = listAuthorizedBacklogMediaBundles().filter((b) => b.venture === "occupancynpv");
  const out: OccupancyVentureImageFingerprint[] = [];
  for (const bundle of bundles) {
    const disk = resolveMediaFileOnDisk(bundle.hero_image.src);
    if (!disk.exists) continue;
    const brief = occupancyBlogImageBriefForSlug(bundle.slug);
    out.push({
      slug: bundle.slug,
      src: bundle.hero_image.src,
      path: bundle.path,
      sha256: sha256FileHex(disk.absolute),
      perceptual_hash: await perceptualHashFromFile(disk.absolute),
      brief_id: brief.visual_concept_id,
    });
  }
  return out;
}

export function evaluateOccupancyImageDistinctnessVentureSet(fingerprints: OccupancyVentureImageFingerprint[]): OrganicNamedGate {
  const reasons: string[] = [];
  const shaSet = fingerprints.map((f) => f.sha256);
  for (const hash of shaSet) {
    if (shaSet.filter((h) => h === hash).length > 1) reasons.push("same_master_reused_across_articles");
  }
  for (let i = 0; i < fingerprints.length; i += 1) {
    for (let j = i + 1; j < fingerprints.length; j += 1) {
      const a = fingerprints[i]!;
      const b = fingerprints[j]!;
      if (a.sha256 === b.sha256) reasons.push(`identical_file:${a.slug}:${b.slug}`);
      const dist = hammingHexHash(a.perceptual_hash, b.perceptual_hash);
      if (dist <= OCCUPANCY_PERCEPTUAL_SIMILARITY_MAX) {
        reasons.push(`near_duplicate_composition:${a.slug}:${b.slug}:d${dist}`);
      }
    }
  }
  return named(BLOG_IMAGE_DISTINCTNESS_QC, reasons);
}

export function evaluateBlogRollVisualVarietyQc(fingerprints: OccupancyVentureImageFingerprint[]): OrganicNamedGate {
  const distinct = evaluateOccupancyImageDistinctnessVentureSet(fingerprints);
  if (distinct.result !== "PASS") {
    return named("BLOG_ROLL_VISUAL_VARIETY_QC", [...distinct.reasons, "roll_template_portrait_series"]);
  }
  return named("BLOG_ROLL_VISUAL_VARIETY_QC", []);
}

export async function evaluateOccupancyVentureBlogImageQc(): Promise<{
  relevance: Record<string, OrganicNamedGate>;
  distinctness: OrganicNamedGate;
  roll_variety: OrganicNamedGate;
  fingerprints: OccupancyVentureImageFingerprint[];
  same_person_reuse: "PASS" | "FAIL";
  near_duplicate_composition: "PASS" | "FAIL";
  article_image_relevance: "PASS" | "FAIL";
}> {
  const fingerprints = await fingerprintOccupancyVentureImages();
  const relevance: Record<string, OrganicNamedGate> = {};
  let relevanceFail = false;
  for (const fp of fingerprints) {
    const gate = evaluateArticleImageRelevanceQc({ slug: fp.slug, src: fp.src });
    relevance[fp.slug] = gate;
    if (gate.result !== "PASS") relevanceFail = true;
  }
  const distinctness = evaluateOccupancyImageDistinctnessVentureSet(fingerprints);
  const roll_variety = evaluateBlogRollVisualVarietyQc(fingerprints);
  return {
    relevance,
    distinctness,
    roll_variety,
    fingerprints,
    same_person_reuse: distinctness.reasons.some((r) => r.includes("near_duplicate") || r.includes("identical"))
      ? "FAIL"
      : "PASS",
    near_duplicate_composition: distinctness.result === "PASS" ? "PASS" : "FAIL",
    article_image_relevance: relevanceFail ? "FAIL" : "PASS",
  };
}
