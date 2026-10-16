/** Topic-specific OccupancyNPV blog hero briefs — no shared portrait template. */
export type OccupancyBlogVisualSubject =
  | "CAPITAL_MARKETS_AND_PROPERTY"
  | "CAP_RATE_VALUATION"
  | "OCCUPANCY_COST_ECONOMICS"
  | "LEASE_NUMBERS_COMPARISON"
  | "LEASE_OPTIONS_TIMELINE"
  | "CAM_OPERATIONS_BUDGET";

export type OccupancyBlogImageBrief = {
  slug: string;
  visual_concept_id: string;
  primary_subject: OccupancyBlogVisualSubject;
  /** Registry path under /media/blog/ */
  asset_file: string;
  public_path: string;
  alt: string;
  required_visual_elements: string[];
  forbidden: string[];
  generation_prompt: string;
  portrait_primary: false;
};

export const OCCUPANCY_BLOG_IMAGE_BRIEFS: OccupancyBlogImageBrief[] = [
  {
    slug: "how-interest-rates-affect-commercial-property-values",
    visual_concept_id: "occ-v2-interest-rates-capital",
    primary_subject: "CAPITAL_MARKETS_AND_PROPERTY",
    asset_file: "occ-v2-interest-rates-capital.webp",
    public_path: "/media/blog/occ-v2-interest-rates-capital.webp",
    alt: "Mixed-use commercial office tower beside an analyst desk with financing documents and a laptop, suggesting capital-market property valuation.",
    required_visual_elements: ["commercial building exterior", "financial workspace", "documents or model context"],
    forbidden: ["headshot", "single executive portrait", "window portrait"],
    generation_prompt:
      "Editorial photograph, wide shot: modern commercial office or mixed-use building exterior beside a desk with blurred financing documents, calculator, and laptop. Capital markets and property underwriting mood. No people in frame. No readable text, numbers, charts, or logos. Premium CRE editorial, natural light, realistic architecture.",
    portrait_primary: false,
  },
  {
    slug: "how-is-cap-rate-calculated-for-a-building",
    visual_concept_id: "occ-v2-cap-rate-valuation",
    primary_subject: "CAP_RATE_VALUATION",
    asset_file: "occ-v2-cap-rate-valuation.webp",
    public_path: "/media/blog/occ-v2-cap-rate-valuation.webp",
    alt: "Low-rise commercial retail building with valuation worksheets and a calculator on a side table, emphasizing property income analysis.",
    required_visual_elements: ["commercial property", "valuation or underwriting materials"],
    forbidden: ["headshot", "downtown glass tower only", "same scene as interest rates"],
    generation_prompt:
      "Editorial photograph: suburban or urban commercial retail or office building in three-quarter view, foreground table with blank valuation worksheets, calculator, and pen. Property valuation context, not a portrait. No people. No readable text or fake cap rates on paper. Realistic architecture, clean CRE editorial style.",
    portrait_primary: false,
  },
  {
    slug: "what-is-occupancy-cost-versus-rent",
    visual_concept_id: "occ-v2-occupancy-cost-rent",
    primary_subject: "OCCUPANCY_COST_ECONOMICS",
    asset_file: "occ-v2-occupancy-cost-rent.webp",
    public_path: "/media/blog/occ-v2-occupancy-cost-rent.webp",
    alt: "Tenant office workspace with stacked lease pages and operating-expense folders on a conference table.",
    required_visual_elements: ["lease or expense documents", "tenant workspace context"],
    forbidden: ["executive portrait", "empty conference room only"],
    generation_prompt:
      "Editorial photograph: commercial tenant office corner with conference table, stacked lease binders, operating expense folders, and closed laptop. Occupancy cost versus base rent analysis context. No people visible. No readable dollar amounts or lease clauses. Warm office light, realistic documents without legible text.",
    portrait_primary: false,
  },
  {
    slug: "what-numbers-do-you-need-to-compare-two-leases",
    visual_concept_id: "occ-v2-lease-numbers-packets",
    primary_subject: "LEASE_NUMBERS_COMPARISON",
    asset_file: "occ-v2-lease-numbers-packets.webp",
    public_path: "/media/blog/occ-v2-lease-numbers-packets.webp",
    alt: "Two separate commercial lease document packets and a printed checklist on a walnut meeting table.",
    required_visual_elements: ["two lease packets", "checklist or notebook", "comparison setup"],
    forbidden: ["single folder", "portrait", "city window background"],
    generation_prompt:
      "Editorial photograph, top-down three-quarter angle: two clearly separate commercial lease document packets with different colored covers, printed checklist, pen, and calculator on a walnut conference table. Comparison-before-reading mood. No people. No readable lease text or numbers. Distinct from skyline or portrait compositions.",
    portrait_primary: false,
  },
  {
    slug: "how-do-you-compare-two-commercial-lease-options",
    visual_concept_id: "occ-v2-lease-options-properties",
    primary_subject: "LEASE_OPTIONS_TIMELINE",
    asset_file: "occ-v2-lease-options-properties.webp",
    public_path: "/media/blog/occ-v2-lease-options-properties.webp",
    alt: "Two different commercial building models and site photos laid out for side-by-side lease option evaluation.",
    required_visual_elements: ["two distinct properties or sites", "decision layout"],
    forbidden: ["duplicate lease-packet-only shot", "portrait"],
    generation_prompt:
      "Editorial photograph: meeting table with two distinct commercial property reference photos or architectural models side by side, plus two slim lease folders and a timeline notepad. Evaluating two real estate alternatives. No people. No readable text on models or paper. Visually different from a single-table lease-packet scene.",
    portrait_primary: false,
  },
  {
    slug: "how-free-rent-affects-occupancy-cost-for-tenants",
    visual_concept_id: "occ-v2-free-rent-abatement",
    primary_subject: "LEASE_CONCESSION_SCHEDULE",
    asset_file: "occ-v2-lease-numbers-packets.webp",
    public_path: "/media/blog/occ-v2-lease-numbers-packets.webp",
    alt: "Commercial lease abatement schedule and CAM estimate worksheets on a conference table.",
    required_visual_elements: ["rent schedule or concession summary", "CAM worksheet", "meeting table context"],
    forbidden: ["portrait", "readable dollar amounts"],
    generation_prompt:
      "Editorial photograph: conference table with commercial lease rent schedule showing abatement months, separate CAM estimate printout, and TI allowance summary sheet. Tenant modeling free rent versus recoveries. No people. No readable text or numbers.",
    portrait_primary: false,
  },
  {
    slug: "expense-stop-vs-base-year-for-tenants",
    visual_concept_id: "occ-v2-expense-stop-base-year",
    primary_subject: "LEASE_RECOVERY_MECHANICS",
    asset_file: "occ-v2-lease-numbers-packets.webp",
    public_path: "/media/blog/occ-v2-lease-numbers-packets.webp",
    alt: "Commercial lease packets with expense recovery clauses highlighted beside an occupancy-cost worksheet.",
    required_visual_elements: ["lease packets", "worksheet or checklist", "recovery context"],
    forbidden: ["portrait", "readable clause text"],
    generation_prompt:
      "Editorial photograph: walnut meeting table with two commercial lease folders, printed occupancy-cost worksheet, and highlighter marking recovery language sections. Tenant reviewing expense stop versus base year mechanics. No people. No readable text.",
    portrait_primary: false,
  },
  {
    slug: "gross-lease-vs-net-lease-for-tenants",
    visual_concept_id: "occ-v2-gross-net-structure",
    primary_subject: "LEASE_NUMBERS_COMPARISON",
    asset_file: "occ-v2-gross-net-structure.webp",
    public_path: "/media/blog/occ-v2-gross-net-structure.webp",
    alt: "Lease proposal folders and a calculator on a desk for gross versus net comparison.",
    required_visual_elements: ["lease folders or packets", "calculator or worksheet", "desk comparison context"],
    forbidden: ["headshot", "identical lease-compare skyline shot", "readable dollar amounts"],
    generation_prompt:
      "Editorial photograph: walnut desk with two labeled commercial lease proposal folders (gross-style versus net-style), calculator, and pen. Tenant comparing lease structures before occupancy-cost modeling. No people. No readable text or numbers on folders. Distinct from side-by-side building models composition.",
    portrait_primary: false,
  },
  {
    slug: "cam-first-year",
    visual_concept_id: "occ-v2-cam-operations",
    primary_subject: "CAM_OPERATIONS_BUDGET",
    asset_file: "occ-v2-cam-operations.webp",
    public_path: "/media/blog/occ-v2-cam-operations.webp",
    alt: "Commercial property common-area hallway with maintenance clipboard and operating-budget binder on a service cart.",
    required_visual_elements: ["common area or building operations", "budget or CAM context"],
    forbidden: ["empty conference room", "portrait at window"],
    generation_prompt:
      "Editorial photograph: commercial property interior common-area corridor with polished floor, service cart holding maintenance clipboard, operating budget binder, and keys. CAM and first-year operating expense context. No people. No readable budget figures. Property operations mood, not corporate portrait.",
    portrait_primary: false,
  },
];

export function occupancyBlogImageBriefForSlug(slug: string): OccupancyBlogImageBrief {
  const row = OCCUPANCY_BLOG_IMAGE_BRIEFS.find((b) => b.slug === slug);
  if (!row) throw new Error(`OCCUPANCY_BLOG_IMAGE_BRIEF_MISSING:${slug}`);
  return row;
}

export function legacyOccupancyHeroPaths(): string[] {
  return [
    "/media/hero-building.webp",
    "/media/hero-district.webp",
    "/media/hero-interior.webp",
    "/media/hero-workstation.webp",
    "/media/blog/lease-numbers.webp",
    "/media/blog/lease-compare.webp",
  ];
}
