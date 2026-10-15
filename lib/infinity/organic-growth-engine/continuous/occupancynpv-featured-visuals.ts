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
    path: "/media/blog/occ-v2-interest-rates-capital.webp",
    alt: "Mixed-use commercial office tower beside an analyst desk with financing documents and a laptop, suggesting capital-market property valuation.",
    subject: "A single commercial office building exterior at late afternoon",
    question: "How do interest rates affect commercial property values?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "occ-v2-interest-rates-capital.webp",
  },
  {
    slug: "cam-first-year",
    path: "/media/blog/occ-v2-cam-operations.webp",
    alt: "Commercial property common-area hallway with maintenance clipboard and operating-budget binder on a service cart.",
    subject: "An empty commercial conference room with a city view",
    question: "How should a tenant treat CAM in the first operating year?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "occ-v2-cam-operations.webp",
  },
  {
    slug: "how-is-cap-rate-calculated-for-a-building",
    path: "/media/blog/occ-v2-cap-rate-valuation.webp",
    alt: "Low-rise commercial retail building with valuation worksheets and a calculator on a side table, emphasizing property income analysis.",
    subject: "Downtown business-district office towers at dusk",
    question: "How is cap rate calculated for a commercial building?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    explanatory_visual: {
      path: "/media/viz-cash-flow.svg",
      alt: "Diagram showing future cash flows discounted to present value.",
      required: false,
    },
    asset_file: "occ-v2-cap-rate-valuation.webp",
  },
  {
    slug: "what-is-occupancy-cost-versus-rent",
    path: "/media/blog/occ-v2-occupancy-cost-rent.webp",
    alt: "Tenant office workspace with stacked lease pages and operating-expense folders on a conference table.",
    subject: "Lease-analysis workstation with papers and a laptop",
    question: "What is occupancy cost, and how is it different from rent?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "occ-v2-occupancy-cost-rent.webp",
  },
  {
    slug: "what-numbers-do-you-need-to-compare-two-leases",
    path: "/media/blog/occ-v2-lease-numbers-packets.webp",
    alt: "Two separate commercial lease document packets and a printed checklist on a walnut meeting table.",
    subject: "Lease packets, a printed checklist, and a laptop on a conference table in a modern office",
    question: "What numbers do you need before you compare two commercial leases?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "occ-v2-lease-numbers-packets.webp",
  },
  {
    slug: "gross-lease-vs-net-lease-for-tenants",
    path: "/media/blog/occ-v2-gross-net-structure.webp",
    alt: "Lease proposal folders and a calculator on a desk for gross versus net comparison.",
    subject: "Lease proposal folders and calculator on a desk",
    question: "What is the difference between a gross lease and a net lease for tenants?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    asset_file: "occ-v2-gross-net-structure.webp",
  },
  {
    slug: "how-do-you-compare-two-commercial-lease-options",
    path: "/media/blog/occ-v2-lease-options-properties.webp",
    alt: "Two different commercial building models and site photos laid out for side-by-side lease option evaluation.",
    subject: "Two distinct lease folders on a meeting table with a pair of office buildings visible through the window",
    question: "How do you compare two commercial lease options on one timeline?",
    visual_role: "FEATURED_EDITORIAL_IMAGE",
    explanatory_visual: {
      path: "/media/viz-compare.svg",
      alt: "Side-by-side diagram comparing two lease options on one timeline scale.",
      required: true,
    },
    asset_file: "occ-v2-lease-options-properties.webp",
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
