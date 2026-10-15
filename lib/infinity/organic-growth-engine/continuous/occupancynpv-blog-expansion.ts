import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import type { ContentCoveragePlan } from "./content-coverage-plan";
import {
  buildBlogQuestionClusterPlan,
  LATEST_BLOGS_CAROUSEL_SCRIPT,
  renderBlogArticleShell,
  renderLatestBlogsCarouselHtml,
} from "./blog-ux";
import type { OrganicDraft } from "./quality";
import { evaluateContentQualityFramework } from "./content-quality-framework";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { occupancynpvUniqueCreativeSvg } from "./occupancynpv-blog-creative";
import { occupancynpvPublishedBlogPosts } from "./occupancynpv-blog-catalog";
import { occupancynpvBlogSequentialNavHtml } from "./occupancynpv-blog-sequential-nav";
import { occupancyCapRateV5Body } from "./occupancy-v5-body-cap-rate";
import { occupancyLeaseCompareV5Body } from "./occupancy-v5-body-lease-compare";
import { occupancyLeaseNumbersV5Body } from "./occupancy-v5-body-lease-numbers";
import { occupancyOccupancyVsRentV5Body } from "./occupancy-v5-body-occupancy-vs-rent";
import { renderCanonicalArticleMain } from "./article-section-renderer";

function permalink(category: string, slug: string): string {
  return `/blog/${category}/${slug}/`;
}

function article(input: {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  tags: string[];
  published: string;
}): OccupancyNpvBlogPost {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    path: permalink(input.category, input.slug),
    category: input.category.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    primaryCategory: input.category.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    tags: input.tags,
    image: input.image,
    image_alt: occupancynpvFeaturedEditorialFor(input.slug).alt,
    published: input.published,
    modified: "2026-09-25",
    reading_time: "11 min",
    featured: false,
    draft: false,
    unpublished: false,
  };
}

export const OCCUPANCYNPV_EXPANSION_POSTS: OccupancyNpvBlogPost[] = [
  article({
    slug: "how-is-cap-rate-calculated-for-a-building",
    category: "valuation",
    title: "How is cap rate calculated for a commercial building?",
    excerpt: "Cap rate is NOI divided by value or price. Name the NOI, name the price, and do not treat a tenant occupancy-cost number as a property yield.",
    image: occupancynpvFeaturedEditorialFor("how-is-cap-rate-calculated-for-a-building").path,
    tags: ["Cap Rates", "Valuation", "NOI"],
    published: "2026-09-20",
  }),
  article({
    slug: "what-is-occupancy-cost-versus-rent",
    category: "occupancy-costs",
    title: "What is occupancy cost, and how is it different from rent?",
    excerpt: "Rent is one line. Occupancy cost is rent plus the recoverable and tenant-paid operating lines on the same timeline.",
    image: occupancynpvFeaturedEditorialFor("what-is-occupancy-cost-versus-rent").path,
    tags: ["Occupancy Costs", "Rent", "CAM"],
    published: "2026-09-21",
  }),
  article({
    slug: "what-numbers-do-you-need-to-compare-two-leases",
    category: "leasing",
    title: "What numbers do you need before you compare two commercial leases?",
    excerpt: "A checklist of rent, recoveries, free rent, TI, and term. Missing one line is how a cheaper face rent still loses.",
    image: occupancynpvFeaturedEditorialFor("what-numbers-do-you-need-to-compare-two-leases").path,
    tags: ["Leasing", "Checklist", "Occupancy Costs"],
    published: "2026-09-22",
  }),
  article({
    slug: "how-do-you-compare-two-commercial-lease-options",
    category: "leasing",
    title: "How do you compare two commercial lease options on one timeline?",
    excerpt: "Put both occupancy-cost paths on the same years, discount them, and keep tenant NPV separate from a building cap rate.",
    image: occupancynpvFeaturedEditorialFor("how-do-you-compare-two-commercial-lease-options").path,
    tags: ["Leasing", "NPV", "Comparison"],
    published: "2026-09-23",
  }),
];

const SHARED_LINKS = [
  "/blog/occupancy-costs/cam-first-year/",
  "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  "/commercial-lease-npv/how-is-cap-rate-calculated/",
  "/compare-commercial-leases",
  "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
];

function plan(input: {
  plan_id: string;
  canonical_url: string;
  primary: string;
  must: Array<{ question: string; tokens: string[] }>;
  definitions: string[];
  mistakes: string[];
  edges: string[];
  decisions: string[];
  examples: string[];
  next: string[];
  outcomes: string[];
}): ContentCoveragePlan {
  const questions = [
    { question: input.primary, role: "PRIMARY" as const, coverage_tokens: input.must[0]?.tokens ?? ["cap rate"] },
    ...input.must.map((row) => ({ question: row.question, role: "MUST_ANSWER" as const, coverage_tokens: row.tokens })),
  ];
  return {
    plan_id: input.plan_id,
    asset_id: input.canonical_url,
    canonical_url: input.canonical_url,
    primary_reader_question: input.primary,
    primary_intent: input.primary,
    audience: ["tenants", "owners", "tenant-rep readers"],
    related_questions: input.must.map((row) => row.question),
    follow_up_questions: [],
    definitions_needed: input.definitions,
    decisions: input.decisions,
    examples_needed: input.examples,
    calculations_needed: [],
    tables_needed: [],
    common_mistakes: input.mistakes,
    edge_cases: input.edges,
    limitations: ["not legal advice", "not automatically"],
    practical_next_steps: input.next,
    internal_link_opportunities: SHARED_LINKS.slice(0, 4),
    related_site_assets: SHARED_LINKS,
    evidence_needs: ["valuation identity", "lease occupancy-cost practice"],
    faq_opportunities: input.must.map((row) => row.question).slice(0, 4),
    cluster: buildBlogQuestionClusterPlan({
      primary_question: input.primary,
      questions,
    }),
    sources: ["TOPIC_GRAPH", "SEARCH_DEMAND", "AUTHORITATIVE_RESEARCH"],
    learning_outcomes: input.outcomes,
  };
}

function draftFrom(input: {
  post: OccupancyNpvBlogPost;
  answer: string;
  headings: string[];
  body: string;
  faqs: Array<{ question: string; answer: string }>;
}): OrganicDraft {
  return {
    title: input.post.title,
    meta_description: input.post.excerpt,
    h1: input.post.title,
    headings: input.headings,
    body: input.body,
    direct_answer: input.answer,
    citations: [
      { source: "https://www.appraisalinstitute.org/", source_type: "authority", retrieved_at: "2026-09-25", claim: "Capitalization is a defined valuation identity, not a tenant cash-flow shortcut." },
      { source: "https://www.naiop.org/", source_type: "authority", retrieved_at: "2026-09-25", claim: "Occupancy-cost lines sit beside rent in commercial lease practice." },
      { source: "https://www.occ.gov/", source_type: "authority", retrieved_at: "2026-09-25", claim: "Financing and credit terms are separate from a property going-in yield." },
    ],
    schema: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: input.post.path,
    breadcrumbs: ["Blog", input.post.primaryCategory ?? input.post.category, input.post.title],
    internal_links: SHARED_LINKS.slice(0, 4),
    word_count: input.body.split(/\s+/).length,
    visible_faqs: input.faqs,
    speakable_selectors: ["h1", "[data-direct-answer]"],
    date_published: input.post.published,
    date_modified: "2026-09-25",
    page_kind: "BLOG_ARTICLE",
  };
}

export function occupancynpvExpansionCoveragePlans(): ContentCoveragePlan[] {
  return [
    plan({
      plan_id: "coverage:occupancynpv:cap-rate-building",
      canonical_url: permalink("valuation", "how-is-cap-rate-calculated-for-a-building"),
      primary: "How is cap rate calculated for a commercial building?",
      must: [
        { question: "How is cap rate calculated for a commercial building?", tokens: ["NOI divided", "going-in", "not a tenant"] },
        { question: "What NOI belongs in the formula?", tokens: ["stabilized NOI", "one-time capex", "trailing"] },
        { question: "Why is occupancy-cost NPV not a cap rate?", tokens: ["tenant occupancy-cost", "property yield", "separate question"] },
        { question: "What mistake turns a 6 percent yield into a wrong price?", tokens: ["wrong NOI", "mixing tenant recoveries", "same percentage"] },
      ],
      definitions: ["cap rate", "NOI", "going-in yield", "indicated value", "stabilized"],
      mistakes: ["same percentage", "mixing tenant recoveries"],
      edges: ["dark store", "partial occupancy"],
      decisions: ["hold vs sell", "reprice the bid"],
      examples: ["$120,000 NOI", "6 percent going-in"],
      next: ["name the NOI", "name the price", "open the cap-rate hub"],
      outcomes: ["explain cap rate as NOI divided by price", "identify a wrong NOI", "compare going-in yield", "avoid mixing tenant recoveries", "request the stabilized NOI"],
    }),
    plan({
      plan_id: "coverage:occupancynpv:occupancy-vs-rent",
      canonical_url: permalink("occupancy-costs", "what-is-occupancy-cost-versus-rent"),
      primary: "What is occupancy cost, and how is it different from rent?",
      must: [
        { question: "What is occupancy cost, and how is it different from rent?", tokens: ["rent plus", "same timeline", "recoverable"] },
        { question: "Which lines sit beside rent?", tokens: ["CAM", "tax", "insurance"] },
        { question: "When does a cheaper face rent lose?", tokens: ["higher recoveries", "occupancy-cost table", "year-one cash"] },
        { question: "How should first-year CAM be labeled?", tokens: ["labeled occupancy-cost estimate", "not a finished bill", "reconcile"] },
      ],
      definitions: ["occupancy cost", "face rent", "CAM", "recovery", "expense stop"],
      mistakes: ["rent-only compare", "finished bill"],
      edges: ["stub year", "base year"],
      decisions: ["accept the estimate", "ask for backup"],
      examples: ["$24 rent", "CAM $8"],
      next: ["build an occupancy-cost table", "label first-year CAM", "compare on one timeline"],
      outcomes: ["explain occupancy cost versus rent", "identify a rent-only compare", "compare recoveries", "avoid treating CAM as a finished bill", "request the included-expenses list"],
    }),
    plan({
      plan_id: "coverage:occupancynpv:lease-numbers",
      canonical_url: permalink("leasing", "what-numbers-do-you-need-to-compare-two-leases"),
      primary: "What numbers do you need before you compare two commercial leases?",
      must: [
        { question: "What numbers do you need before you compare two commercial leases?", tokens: ["checklist", "free rent", "tenant improvement"] },
        { question: "Which recovery terms change cash?", tokens: ["expense stop", "base year", "gross-up"] },
        { question: "What term and option facts belong in the file?", tokens: ["commencement", "option rent", "early termination"] },
        { question: "What is still missing if you only have face rent?", tokens: ["CAM estimate", "tax", "insurance"] },
      ],
      definitions: ["face rent", "free rent", "tenant improvement", "expense stop", "gross-up"],
      mistakes: ["rent-only file", "ignoring free rent"],
      edges: ["mid-year occupancy", "option to expand"],
      decisions: ["ask for the packet", "hold the compare"],
      examples: ["$40,000 TI", "3 months free"],
      next: ["complete the checklist", "request prior-year reconciliation", "put both leases on one timeline"],
      outcomes: ["explain the lease-number checklist", "identify a rent-only file", "compare free rent", "avoid ignoring recoveries", "request the CAM backup"],
    }),
    plan({
      plan_id: "coverage:occupancynpv:lease-compare",
      canonical_url: permalink("leasing", "how-do-you-compare-two-commercial-lease-options"),
      primary: "How do you compare two commercial lease options on one timeline?",
      must: [
        { question: "How do you compare two commercial lease options on one timeline?", tokens: ["same years", "occupancy-cost path", "discount"] },
        { question: "Why can a lower rent still lose?", tokens: ["higher recoveries", "shorter free rent", "occupancy-cost NPV"] },
        { question: "How is tenant NPV different from a building cap rate?", tokens: ["tenant occupancy-cost", "not a property cap rate", "separate question"] },
        { question: "What stress-test belongs in the workbook?", tokens: ["stress-test", "CAM plus 10 percent", "discount rate"] },
      ],
      definitions: ["occupancy-cost NPV", "discount rate", "free rent", "recovery", "timeline"],
      mistakes: ["one-for-one", "property cap rate as tenant NPV"],
      edges: ["early termination", "expansion option"],
      decisions: ["pick lease A or B", "re-run the stress-test"],
      examples: ["Lease A $32", "Lease B $28 plus CAM"],
      next: ["align the years", "discount both paths", "open the compare tool"],
      outcomes: ["explain one-timeline lease compare", "identify a lower rent that loses", "compare occupancy-cost NPV", "avoid using a property cap rate as tenant NPV", "request both recovery estimates"],
    }),
  ];
}

function bodyCap(): { headings: string[]; body: string; answer: string; faqs: Array<{ question: string; answer: string }> } {
  return occupancyCapRateV5Body();
}

function bodyCapLegacyUnused(): { headings: string[]; body: string; answer: string; faqs: Array<{ question: string; answer: string }> } {
  return {
    answer: "Cap rate is net operating income divided by the value or price you are testing. Same NOI at a higher going-in yield is a lower indicated value. That is a property-valuation identity. It is not a tenant occupancy-cost NPV and not automatically a market average.",
    headings: [
      "What the formula actually is",
      "Which NOI belongs in the numerator",
      "Value, price, and indicated value",
      "Why occupancy-cost NPV is a separate question",
      "A labeled teaching sample",
      "Common mistakes",
      "Edge cases",
      "Limitations",
      "Practical next steps",
    ],
    body: `Cap rate is NOI divided by value or price. A 6 percent going-in yield on $120,000 NOI implies $2,000,000. The same NOI at 7 percent is about $1,714,286. That arithmetic is a teaching sample, not a finished appraisal.

Stabilized NOI is the income the formula should see. Strip one-time capex, one-time lease-up, and owner personal expenses unless you are doing a trailing-actuals case and you label it. Trailing NOI can sit below stabilized NOI. Using the wrong NOI is how a 6 percent story prints a wrong price.

Indicated value is the output of the identity. Price is the bid that can clear. Do not treat them as the same line until a buyer writes it.

Tenant occupancy-cost NPV discounts rent and recoveries a tenant pays. A property yield discounts building income a buyer buys. Mixing tenant recoveries into NOI, or treating occupancy-cost NPV as a cap rate, is a category error.

Checklist before you quote a cap rate: name the NOI, name whether it is trailing or stabilized, name the price or value, and write the percent. Stress-test the same NOI at one higher yield.

The common mistake is applying the same percentage haircut to every asset, or mixing tenant recoveries into the numerator. Another misconception is that a Fed headline moves every cap rate one-for-one.

Edge cases include a dark store with near-zero occupancy and a partial-occupancy lease-up. Those change NOI first. They do not rewrite the identity.

This is not legal advice and not automatically a market-average cap rate. It does not replace the evergreen hub. The decision is hold vs sell, or reprice the bid, once you request the stabilized NOI.

Practical next steps: name the NOI, name the price, and open How is cap rate calculated? then the interest-rate note if financing is the question. Compare two leases on occupancy cost if you are the tenant, not the buyer.`,
    faqs: [
      { question: "Is cap rate the same as occupancy-cost NPV?", answer: "No. Cap rate is a property yield. Occupancy-cost NPV is a tenant cash-flow question." },
      { question: "Can I use trailing NOI?", answer: "Yes if you label it trailing. Stabilized NOI is the usual going-in numerator." },
    ],
  };
}

function bodyOcc(): { headings: string[]; body: string; answer: string; faqs: Array<{ question: string; answer: string }> } {
  return {
    answer: "Occupancy cost is rent plus the recoverable and tenant-paid operating lines on the same timeline. Face rent can look cheaper and still lose once CAM, tax, and insurance sit beside it. First-year CAM is a labeled occupancy-cost estimate, not a finished bill.",
    headings: [
      "Rent is one line",
      "What sits beside rent",
      "When cheaper face rent loses",
      "How to label first-year CAM",
      "A two-lease sketch",
      "Common mistakes",
      "Edge cases",
      "Limitations",
      "Practical next steps",
    ],
    body: `Rent is the contractual base. Occupancy cost is rent plus CAM, tax, insurance, and other recoveries the tenant actually pays in the same year.

CAM, tax, and insurance are the usual companions. An expense stop or base year changes which dollars move. A gross-up clause can change the CAM estimate even when the suite is not fully occupied.

A cheaper face rent loses when recoveries are higher on the same timeline. Use this checklist: $24 rent plus CAM $8 versus $28 plus $3. Build an occupancy-cost table before you celebrate. If CAM is $8 versus $3, year-one cash can flip.

Treat first-year CAM as a labeled occupancy-cost estimate, not a finished bill. It may reconcile later. Accept the estimate only after you ask for backup: the included-expenses list and the prior-year reconciliation.

Teaching sample: Lease A $24 plus $8 CAM is $32 occupancy cash. Lease B $28 plus $3 CAM is $31. The lower rent lost. These are labeled dollars, not a client result.

The common mistake is a rent-only compare, or treating the CAM line as a finished bill. That misconception shows up in first-year files that never request backup.

Edge cases include a stub year and a mid-year occupancy. Those are not twelve months of CAM cash.

This is not legal advice and not automatically the lease you should sign. It does not replace the CAM first-year article.

Practical next steps: build an occupancy-cost table, label first-year CAM, and compare on one timeline. Then read How should a tenant treat CAM in the first operating year?`,
    faqs: [
      { question: "Is occupancy cost just CAM?", answer: "No. Occupancy cost is rent plus recoveries. CAM is one recovery line." },
      { question: "Is first-year CAM a bill?", answer: "No. Label it as an estimate and expect reconciliation." },
    ],
  };
}

function bodyNumbers(): { headings: string[]; body: string; answer: string; faqs: Array<{ question: string; answer: string }> } {
  return {
    answer: "You need face rent, free rent, tenant improvement, CAM, tax, insurance, term, options, and commencement before a two-lease compare is honest. A rent-only file is how a cheaper face rent still loses. Complete the checklist, then put both paths on one timeline.",
    headings: [
      "The checklist",
      "Recovery terms that change cash",
      "Term and option facts",
      "What a rent-only file still misses",
      "A packet you can request",
      "Common mistakes",
      "Edge cases",
      "Limitations",
      "Practical next steps",
    ],
    body: `The lease-number checklist is face rent, free rent, tenant improvement, CAM estimate, tax, insurance, commencement, term, and option rent. Missing one line is enough to invert a compare. Avoid ignoring recoveries. Request the CAM backup with the packet.

Expense stop, base year, and gross-up change who pays the next dollar of operating cost. Write the mechanism, not just a CAM number.

Commencement, early termination, and option rent belong in the same file. A five-year deal with a cheap option is not the same timeline as a seven-year deal with none.

If you only have face rent you still miss the CAM estimate, tax, and insurance. You also miss $40,000 of TI or 3 months free that move year-one cash.

Request a packet: the included-expenses list, the prior-year reconciliation, and the recovery clause. Stress-test CAM plus 10 percent before you treat the estimate as done.

The common mistake is a rent-only file, or ignoring free rent while celebrating a lower starting number.

Edge cases include mid-year occupancy and an option to expand. Those change the months you should put on the timeline.

This is not legal advice and not automatically a complete diligence file. If the packet is incomplete, hold the compare.

Practical next steps: complete the checklist, request prior-year reconciliation, and put both leases on one timeline. Use the numbers hub next to this note.`,
    faqs: [
      { question: "Do I need TI to compare?", answer: "Yes if one deal funds it and the other does not. TI is occupancy cash too." },
      { question: "Is free rent optional to model?", answer: "No. Ignoring free rent is a common mistake." },
    ],
  };
}

function bodyCompare(): { headings: string[]; body: string; answer: string; faqs: Array<{ question: string; answer: string }> } {
  return {
    answer: "Put both occupancy-cost paths on the same years, include recoveries and free rent, and discount them. A lower face rent can still lose. Tenant occupancy-cost NPV is not a property cap rate. Stress-test CAM plus 10 percent before you pick.",
    headings: [
      "One timeline",
      "Why a lower rent can lose",
      "Tenant NPV versus a building cap rate",
      "The stress-test",
      "A two-lease sketch",
      "Common mistakes",
      "Edge cases",
      "Limitations",
      "Practical next steps",
    ],
    body: `Align the years first. A four-year path and a seven-year path are not the same compare until you name the leftover years.

Lease A at $32 all-in can beat Lease B at $28 plus a fat CAM line. Higher recoveries and shorter free rent are how the cheaper face rent loses on occupancy-cost NPV.

Tenant occupancy-cost NPV discounts what the tenant pays. A property cap rate is a buyer yield on NOI. Using a property cap rate as tenant NPV is a category error and not a property cap rate substitute. Name the recovery and the discount rate on the same timeline, then request both recovery estimates before you pick.

Stress-test CAM plus 10 percent and name the discount rate. If the winner flips, re-run the stress-test and pick lease A or B only after the paths stay stable.

Teaching sample: Lease A $32 for five years. Lease B $28 plus CAM that prints $6. Year-one occupancy cash is $34 on B. Discount both paths. These are labeled dollars, not a client result. 1,200 square feet at those numbers is a classroom, not a bid.

The common mistake is a one-for-one rent compare, or treating tenant NPV as a property cap rate.

Edge cases include early termination and an expansion option. Model them as separate paths, not as decoration.

This is not legal advice and not automatically the lease you should sign.

Practical next steps: align the years, discount both paths, and open the compare tool. Keep the CAM first-year article next to the workbook.`,
    faqs: [
      { question: "Can I compare different terms?", answer: "Yes if you put leftover years on the timeline and label the assumption." },
      { question: "Is cap rate part of tenant NPV?", answer: "No. That is a separate property-valuation question." },
    ],
  };
}

export function occupancynpvExpansionDrafts(): OrganicDraft[] {
  const [cap, occ, numbers, compare] = OCCUPANCYNPV_EXPANSION_POSTS;
  return [
    draftFrom({ post: cap!, ...occupancyCapRateV5Body() }),
    draftFrom({ post: occ!, ...occupancyOccupancyVsRentV5Body() }),
    draftFrom({ post: numbers!, ...occupancyLeaseNumbersV5Body() }),
    draftFrom({ post: compare!, ...occupancyLeaseCompareV5Body() }),
  ];
}

export { occupancynpvExpansionPublishedRecords } from "./occupancynpv-expansion-records";

export function evaluateOccupancyExpansionQuality(): { result: "PASS" | "FAIL"; reasons: string[] } {
  const plans = occupancynpvExpansionCoveragePlans();
  const failed = occupancynpvExpansionDrafts()
    .map((draft, index) => evaluateContentQualityFramework(draft, plans[index]))
    .filter((row) => row.result === "FAIL");
  return {
    result: failed.length ? "FAIL" : "PASS",
    reasons: failed.flatMap((row) => row.reasons),
  };
}

export function occupancynpvExpansionPageSource(draft: OrganicDraft): string {
  const post = OCCUPANCYNPV_EXPANSION_POSTS.find((row) => row.path === draft.canonical)!;
  const page: PlannedPage = {
    route: post.path.replace(/\/+$/, ""),
    role: "EDUCATIONAL_ARTICLE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: `${post.title} — OccupancyNPV`,
    metaDescription: post.excerpt,
    canonical: post.path,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: post.category,
    pageOpportunityId: `occupancynpv-${post.slug}`,
  };
  const featured = occupancynpvFeaturedEditorialFor(post.slug);
  const posts = occupancynpvPublishedBlogPosts();
  const explanatory = featured.explanatory_visual
    ? `<figure data-visual-role="EXPLANATORY_VISUAL"><img src="${featured.explanatory_visual.path}" alt=${JSON.stringify(featured.explanatory_visual.alt)} width={720} height={220} loading="lazy" decoding="async" /><figcaption>${featured.explanatory_visual.alt}</figcaption></figure>`
    : "";
  const main = `
            ${renderCanonicalArticleMain({ headings: draft.headings, body: draft.body, faqs: draft.visible_faqs })}
            ${explanatory}
            <section data-section-type="RELATED_CONTENT" aria-label="Related resources">
              <h2>Related resources</h2>
              <p><a href="/blog/occupancy-costs/cam-first-year/">CAM in the first year</a> · <a href="/blog/valuation/how-interest-rates-affect-commercial-property-values/">Interest rates and value</a> · <a href="/commercial-lease-npv/how-is-cap-rate-calculated/">Cap rate hub</a> · <a href="/compare-commercial-leases">Compare leases</a></p>
            </section>
            ${renderLatestBlogsCarouselHtml({ posts, excludePath: post.path, hideWhenNoDiscovery: true, surface: "article" })}
            ${occupancynpvBlogSequentialNavHtml(post.path, posts)}`;
  const body = `${renderBlogArticleShell({
    category: post.primaryCategory ?? post.category,
    date: post.published,
    title: post.title,
    dek: draft.direct_answer ?? post.excerpt,
    featured_image: featured.path,
    featured_alt: featured.alt,
    tags: post.tags,
    main_html: main,
    posts,
    path: post.path,
  })}
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(LATEST_BLOGS_CAROUSEL_SCRIPT)} }} />`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify([
      { href: "/", label: "Home" },
      { href: "/blog", label: "Blog" },
      { href: `/blog/${post.category.toLowerCase().replace(/\s+/g, "-")}/`, label: post.primaryCategory ?? post.category },
      { href: post.path, label: post.title },
    ])}} />`,
  );
}

export function occupancynpvExpansionAssetFiles(): Array<{ path: string; content: string }> {
  return [
    { path: "public/media/blog/cap-rates.svg", content: occupancynpvUniqueCreativeSvg("cap-rates") },
    { path: "public/media/blog/topic-hub.svg", content: occupancynpvUniqueCreativeSvg("topic-hub") },
    { path: "public/media/blog/commercial-real-estate.svg", content: occupancynpvUniqueCreativeSvg("commercial-real-estate") },
    { path: "public/media/blog/valuation-category.svg", content: occupancynpvUniqueCreativeSvg("valuation") },
  ];
}
