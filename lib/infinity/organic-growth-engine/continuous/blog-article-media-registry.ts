import { existsSync } from "node:fs";
import path from "node:path";
import { CLUB_THROTTLE_JOURNAL_POSTS } from "./club-throttle-journal-posts";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import {
  CLUB_THROTTLE_SHIRT_V10_HERO_PATH,
  clubThrottleShirtV10ImageAssets,
  type VentureImageAssetRecord,
} from "./venture-image-creative-v2";
import { visualAssetDir } from "@/lib/infinity/venture-website-architecture/visual-quality-assets";

export type BlogArticleMediaImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  source: "VENTURE_CREATIVE_V2" | "EDITORIAL_PHOTOGRAPHY" | "GENERATED";
  crop_variant?: "hero" | "card";
  qc_status: "PENDING" | "PASS" | "FAIL";
  generation_id?: string | null;
};

export type BlogArticleMediaBundle = {
  venture: "club-throttle" | "occupancynpv";
  slug: string;
  path: string;
  hero_image: BlogArticleMediaImage;
  featured_image: BlogArticleMediaImage;
  deploy_paths: string[];
  image_record?: VentureImageAssetRecord;
};

export const BLOG_AUTHORIZED_BACKLOG_PATHS = [
  "/journal/night-riding/how-to-ride-after-dark/",
  "/journal/apparel/how-riders-choose-a-shirt/",
  "/journal/culture/bike-night-etiquette/",
  "/journal/culture/garage-culture-as-rider-social-life/",
  "/journal/rides/group-ride-etiquette/",
  "/journal/apparel/streetwear-vs-riding-gear/",
  "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  "/blog/valuation/how-is-cap-rate-calculated-for-a-building/",
  "/blog/occupancy-costs/what-is-occupancy-cost-versus-rent/",
  "/blog/leasing/what-numbers-do-you-need-to-compare-two-leases/",
  "/blog/leasing/how-do-you-compare-two-commercial-lease-options/",
  "/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
  "/blog/occupancy-costs/cam-first-year/",
] as const;

const CT_HERO_WEBP: Record<string, { file: string; alt: string }> = {
  "how-to-ride-after-dark": {
    file: "journal-hero-night-ride.webp",
    alt: "Motorcycle headlight and rider on a dark road with practical night-riding context.",
  },
  "how-riders-choose-a-shirt": {
    file: "journal-v2-shirt-hero.webp",
    alt: "Rider at a night stop beside a motorcycle, jacket open, plain tee visible under parking-lot light.",
  },
  "bike-night-etiquette": {
    file: "journal-hero-bike-night.webp",
    alt: "Motorcycles parked in a nighttime lot with riders gathered naturally under parking-lot lighting.",
  },
  "garage-culture-as-rider-social-life": {
    file: "journal-hero-garage.webp",
    alt: "Riders in a working garage with motorcycles, tools, and warm social atmosphere after a ride.",
  },
  "group-ride-etiquette": {
    file: "journal-hero-group-ride.webp",
    alt: "Small group of street motorcycles riding together on a real road with safe spacing.",
  },
  "streetwear-vs-riding-gear": {
    file: "journal-hero-streetwear-gear.webp",
    alt: "Rider context showing casual motorcycle apparel versus protective riding gear without infographic text.",
  },
};

function publicVisualPath(file: string): string {
  return `/visual/${file}`;
}

function diskPathForPublicSrc(src: string): string {
  if (!src.startsWith("/")) return src;
  return path.join(process.cwd(), "public", src.replace(/^\//, "").replace(/\//g, path.sep));
}

function diskPathForMediaSrc(src: string): string {
  if (!src.startsWith("/media/")) return diskPathForPublicSrc(src);
  const base = src.replace(/^\/media\//, "");
  const inPublic = path.join(process.cwd(), "public/media", base);
  if (existsSync(inPublic)) return inPublic;
  const inVisualAssets = path.join(visualAssetDir(), base.replace(/^blog\//, "blog-").replace(/\.webp$/i, ".webp"));
  return inVisualAssets;
}

export function resolveMediaFileOnDisk(src: string): { exists: boolean; absolute: string } {
  const absolute = src.startsWith("/media/") ? diskPathForMediaSrc(src) : diskPathForPublicSrc(src);
  return { exists: existsSync(absolute), absolute };
}

function ctBundle(slug: string, postPath: string): BlogArticleMediaBundle {
  const meta = CT_HERO_WEBP[slug]!;
  const src = publicVisualPath(meta.file);
  const cardSrc = src;
  const shirtRecord = slug === "how-riders-choose-a-shirt" ? clubThrottleShirtV10ImageAssets()[0] : undefined;
  const img: BlogArticleMediaImage = {
    src,
    alt: meta.alt,
    width: shirtRecord?.width ?? 1600,
    height: shirtRecord?.height ?? 900,
    source: shirtRecord ? "VENTURE_CREATIVE_V2" : "GENERATED",
    crop_variant: "hero",
    qc_status: "PENDING",
  };
  return {
    venture: "club-throttle",
    slug,
    path: postPath,
    hero_image: img,
    featured_image: { ...img, src: cardSrc, crop_variant: "card" },
    deploy_paths: [`public/visual/${meta.file}`],
    image_record: shirtRecord,
  };
}

function onpvBundle(slug: string, postPath: string): BlogArticleMediaBundle {
  const row = occupancynpvFeaturedEditorialFor(slug);
  const img: BlogArticleMediaImage = {
    src: row.path,
    alt: row.alt,
    width: 1600,
    height: 900,
    source: "EDITORIAL_PHOTOGRAPHY",
    crop_variant: "hero",
    qc_status: "PENDING",
  };
  const deploy = row.path.startsWith("/media/blog/")
    ? [`public${row.path}`, `lib/infinity/venture-website-architecture/visual-assets/${row.asset_file}`]
    : [`public${row.path}`, path.join(visualAssetDir(), row.asset_file)];
  return {
    venture: "occupancynpv",
    slug,
    path: postPath,
    hero_image: img,
    featured_image: { ...img, crop_variant: "card" },
    deploy_paths: deploy,
  };
}

export function blogArticleMediaForPath(articlePath: string): BlogArticleMediaBundle | null {
  const norm = articlePath.replace(/\/+$/, "").toLowerCase();
  const ct = CLUB_THROTTLE_JOURNAL_POSTS.find((p) => p.path.replace(/\/+$/, "").toLowerCase() === norm);
  if (ct) return ctBundle(ct.slug, ct.path);
  const slug = norm.split("/").pop() ?? "";
  if (BLOG_AUTHORIZED_BACKLOG_PATHS.some((p) => p.replace(/\/+$/, "").toLowerCase() === norm)) {
    try {
      return onpvBundle(slug, articlePath.endsWith("/") ? articlePath : `${articlePath}/`);
    } catch {
      return null;
    }
  }
  return null;
}

export function listAuthorizedBacklogMediaBundles(): BlogArticleMediaBundle[] {
  return BLOG_AUTHORIZED_BACKLOG_PATHS.map((p) => blogArticleMediaForPath(p)).filter(Boolean) as BlogArticleMediaBundle[];
}

export function isPlaceholderBlogMediaSrc(src: string): boolean {
  if (!src || src === "#" || /undefined|null/i.test(src)) return true;
  if (/placeholder|coming-soon|journal-cover\.svg/i.test(src)) return true;
  if (/editorialWorldSvg|journal-(night-ride|bike-night|garage|group-ride|gear|shirt)\.svg/i.test(src)) return true;
  if (/\.svg$/i.test(src) && !/viz-|diagram/i.test(src)) return true;
  return false;
}

export function featuredImagePathForBacklogArticle(articlePath: string): string | undefined {
  return blogArticleMediaForPath(articlePath)?.featured_image.src;
}
