import { readFileSync } from "node:fs";
import path from "node:path";
import { visualAssetDir } from "@/lib/infinity/venture-website-architecture/visual-quality-assets";
import {
  compileFeaturedEditorialPrompt,
  occupancynpvVisualBrandProfile,
} from "@/lib/infinity/commerce/brand/venture-visual-brand-profile";

export type OccupancyFeaturedEditorial = {
  slug: string;
  path: string;
  alt: string;
  subject: string;
  question: string;
  visual_role: "FEATURED_EDITORIAL_IMAGE";
  explanatory_visual?: { path: string; alt: string; required: boolean };
  asset_file: string;
};

export const OCCUPANCYNPV_FEATURED_EDITORIAL: OccupancyFeaturedEditorial[] = [
  {
    slug: "how-interest-rates-affect-commercial-property-values",
    path: "/media/hero-building.webp",
    alt: "Commercial office building exterior at late afternoon light.",
    subject: "A single commercial office building exterior at late afternoon",
    question: "How do interest rates affect commercial property values?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "hero-building.webp",
  },
  {
    slug: "cam-first-year",
    path: "/media/hero-interior.webp",
    alt: "Empty commercial conference room with windows and a city view.",
    subject: "An empty commercial conference room with a city view",
    question: "How should a tenant treat CAM in the first operating year?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "hero-interior.webp",
  },
  {
    slug: "how-is-cap-rate-calculated-for-a-building",
    path: "/media/hero-district.webp",
    alt: "Glass office towers in a downtown business district at dusk.",
    subject: "Downtown business-district office towers at dusk",
    question: "How is cap rate calculated for a commercial building?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    explanatory_visual: {
      path: "/media/viz-cash-flow.svg",
      alt: "Diagram showing future cash flows discounted to present value.",
      required: false,
    },
    asset_file: "hero-district.webp",
  },
  {
    slug: "what-is-occupancy-cost-versus-rent",
    path: "/media/hero-workstation.webp",
    alt: "Desk with lease papers, a calculator, and a laptop for occupancy-cost review.",
    subject: "Lease-analysis workstation with papers and a laptop",
    question: "What is occupancy cost, and how is it different from rent?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "hero-workstation.webp",
  },
  {
    slug: "what-numbers-do-you-need-to-compare-two-leases",
    path: "/media/blog/lease-numbers.png",
    alt: "Commercial lease packets and a printed checklist on a conference table.",
    subject: "Lease packets, a printed checklist, and a laptop on a conference table in a modern office",
    question: "What numbers do you need before you compare two commercial leases?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "blog-lease-numbers.png",
  },
  {
    slug: "how-do-you-compare-two-commercial-lease-options",
    path: "/media/blog/lease-compare.png",
    alt: "Two labeled lease folders on a meeting table with office towers visible through the window.",
    subject: "Two distinct lease folders on a meeting table with a pair of office buildings visible through the window",
    question: "How do you compare two commercial lease options on one timeline?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    explanatory_visual: {
      path: "/media/viz-compare.svg",
      alt: "Side-by-side diagram comparing two lease options on one timeline scale.",
      required: true,
    },
    asset_file: "blog-lease-compare.png",
  },
];

export function occupancynpvFeaturedEditorialFor(slug: string): OccupancyFeaturedEditorial {
  const match = OCCUPANCYNPV_FEATURED_EDITORIAL.find((row) => row.slug === slug);
  if (!match) throw new Error(`OCCUPANCY_FEATURED_EDITORIAL_MISSING:${slug}`);
  return match;
}

export function occupancynpvFeaturedEditorialPrompt(slug: string) {
  const row = occupancynpvFeaturedEditorialFor(slug);
  return compileFeaturedEditorialPrompt({
    profile: occupancynpvVisualBrandProfile(),
    article_question: row.question,
    subject: row.subject,
  });
}

export function loadOccupancyFeaturedEditorialFiles(): Array<{ path: string; content: string; encoding: "base64" }> {
  return OCCUPANCYNPV_FEATURED_EDITORIAL.map((row) => ({
    path: `public${row.path}`,
    content: readFileSync(path.join(visualAssetDir(), row.asset_file)).toString("base64"),
    encoding: "base64" as const,
  }));
}

export function occupancynpvFeaturedImageUniqueness(): { result: "PASS" | "FAIL"; reasons: string[]; paths: string[] } {
  const paths = OCCUPANCYNPV_FEATURED_EDITORIAL.map((row) => row.path);
  const dupes = paths.filter((path, index) => paths.indexOf(path) !== index);
  return {
    result: dupes.length ? "FAIL" : "PASS",
    reasons: dupes.length ? ["duplicate_featured_image"] : [],
    paths,
  };
}
