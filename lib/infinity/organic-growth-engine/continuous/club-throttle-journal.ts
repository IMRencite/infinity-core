import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import type { ContentCoveragePlan } from "./content-coverage-plan";
import { buildBlogQuestionClusterPlan } from "./blog-ux";
import type { OrganicDraft } from "./quality";
import { evaluateContentQualityFramework } from "./content-quality-framework";
import {
  evaluateCrossArticleTemplateSimilarityGate,
  evaluateCustomerFacingLanguageGate,
  evaluateGenericContentPatternGate,
  evaluateInternalProcessLanguageGate,
  evaluateVentureIsolationGate,
} from "@/lib/infinity/venture-isolation/venture-isolation";
import {
  renderFeaturedBlogsCarouselHtml,
  renderFeaturedReadsBottomHtml,
  renderMainBlogRollHtml,
  renderBlogArticleShell,
  LATEST_BLOGS_CAROUSEL_SCRIPT,
  OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
} from "./blog-ux";
import { selectPopularOrFeaturedBlogs } from "@/lib/infinity/performance-intelligence-engine/popular-blogs";
import { renderCanonicalArticleMain } from "./article-section-renderer";
import { clubThrottleShirtV5Body } from "./club-throttle-v5-body-shirt";
import { clubThrottleAfterDarkV5Body } from "./club-throttle-v5-body-after-dark";
import { clubThrottleBikeNightV5Body } from "./club-throttle-v5-body-bike-night";
import { clubThrottleGarageV5Body } from "./club-throttle-v5-body-garage";
import { clubThrottleGroupRideV5Body } from "./club-throttle-v5-body-group-ride";
import { clubThrottleStreetwearGearV5Body } from "./club-throttle-v5-body-streetwear-gear";
import {
  CLUB_THROTTLE_ORIGIN,
  clubThrottleJournalArticleMetadata,
  clubThrottleJournalArticleSchemaGraph,
  clubThrottleJournalIndexCanonical,
} from "./club-throttle-journal-publication-metadata";

export const CLUB_THROTTLE_JOURNAL_ROOT = "/journal/" as const;

function permalink(category: string, slug: string): string {
  return `/journal/${category}/${slug}/`;
}

function article(input: {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  featured?: boolean;
  tags: string[];
}): OccupancyNpvBlogPost {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    path: permalink(input.category, input.slug),
    category: input.category.replace(/-/g, " "),
    primaryCategory: input.category.replace(/-/g, " "),
    tags: input.tags,
    image: input.image,
    image_alt: input.title,
    published: "2026-09-25",
    modified: "2026-09-25",
    reading_time: "9 min",
    featured: input.featured ?? true,
    draft: false,
    unpublished: false,
  };
}

export const CLUB_THROTTLE_JOURNAL_POSTS: OccupancyNpvBlogPost[] = [
  article({ slug: "how-to-ride-after-dark", category: "night-riding", title: "How to ride after dark without turning the night into a stunt", excerpt: "A practical night-ride checklist: light, layers, sight lines, and the mistakes that make late pavement worse than it has to be.", image: "/visual/journal-night-ride.svg", tags: ["night riding", "checklist", "safety"] }),
  article({ slug: "how-riders-choose-a-shirt", category: "apparel", title: "How riders choose a shirt that survives the ride home", excerpt: "Weight, print placement, and wash rules matter more than a slogan. Compare layers before you buy another thin catalog tee.", image: "/visual/journal-shirt.svg", tags: ["apparel", "layers", "heavyweight"] }),
  article({ slug: "bike-night-etiquette", category: "culture", title: "Bike-night etiquette that keeps the lot from turning into a show", excerpt: "Arrive, park, talk, leave. The rules are social, not a race brief, and they keep a weeknight meet usable.", image: "/visual/journal-bike-night.svg", tags: ["bike night", "etiquette", "meetup"] }),
  article({ slug: "garage-culture-as-rider-social-life", category: "culture", title: "Garage culture is rider social life, not a repair-shop costume", excerpt: "What a working garage actually is: light, time, and people who stay after the ride. Not a fake outlaw set.", image: "/visual/journal-garage.svg", tags: ["garage", "culture", "identity"] }),
  article({ slug: "group-ride-etiquette", category: "rides", title: "Group-ride etiquette for street bikes that are not a race", excerpt: "Spacing, signals, fuel stops, and how to leave a group without making the last rider invent a new plan.", image: "/visual/journal-group-ride.svg", tags: ["group ride", "etiquette", "street"] }),
  article({ slug: "streetwear-vs-riding-gear", category: "apparel", title: "Streetwear versus riding gear: what a shirt can and cannot do", excerpt: "A comparison table for when a heavyweight tee is clothes and when you still need real protective gear.", image: "/visual/journal-gear.svg", tags: ["streetwear", "gear", "comparison"] }),
];

function journalPlan(input: {
  plan_id: string;
  canonical_url: string;
  primary: string;
  must: Array<{ question: string; tokens: string[] }>;
  secondary: string[];
  definitions: string[];
  mistakes: string[];
  edges: string[];
  decisions: string[];
  examples: string[];
  next: string[];
  links: string[];
  outcomes: string[];
}): ContentCoveragePlan {
  const questions = [
    { question: input.primary, role: "PRIMARY" as const, coverage_tokens: input.must[0]?.tokens ?? ["night"] },
    ...input.must.map((row) => ({ question: row.question, role: "MUST_ANSWER" as const, coverage_tokens: row.tokens })),
    ...input.secondary.map((question) => ({
      question,
      role: "HIGH_VALUE_SECONDARY" as const,
      coverage_tokens: question.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((word) => word.length > 3).slice(0, 3),
    })),
  ];
  return {
    plan_id: input.plan_id,
    asset_id: input.canonical_url,
    canonical_url: input.canonical_url,
    primary_reader_question: input.primary,
    primary_intent: input.primary,
    audience: ["street riders", "night commuters", "people around rider culture"],
    related_questions: input.must.map((row) => row.question),
    follow_up_questions: input.secondary,
    definitions_needed: input.definitions,
    decisions: input.decisions,
    examples_needed: input.examples,
    calculations_needed: [],
    tables_needed: [],
    common_mistakes: input.mistakes,
    edge_cases: input.edges,
    limitations: ["not legal advice", "not automatically"],
    practical_next_steps: input.next,
    internal_link_opportunities: input.links,
    related_site_assets: input.links,
    evidence_needs: ["first-party rider practice", "public safety guidance"],
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
  links: string[];
  citations?: OrganicDraft["citations"];
}): OrganicDraft {
  return {
    title: input.post.title,
    meta_description: input.post.excerpt,
    h1: input.post.title,
    headings: input.headings,
    body: input.body,
    direct_answer: input.answer,
    citations: input.citations ?? [
      { source: "https://www.nhtsa.gov/road-safety/motorcycle-safety", source_type: "authority", retrieved_at: "2026-09-25", claim: "Motorcycle visibility and protective equipment remain public safety guidance." },
      { source: "https://www.iihs.org/topics/motorcycles", source_type: "authority", retrieved_at: "2026-09-25", claim: "Night and other-vehicle visibility are recurring crash factors." },
    ],
    schema: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: input.post.path,
    breadcrumbs: ["Home", "Journal", input.post.primaryCategory ?? input.post.category, input.post.title],
    internal_links: input.links,
    word_count: input.body.split(/\s+/).length,
    visible_faqs: input.faqs,
    speakable_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
    date_published: "2026-09-25",
    date_modified: "2026-09-25",
    page_kind: "BLOG_ARTICLE",
    origin: CLUB_THROTTLE_ORIGIN,
  };
}

const SHARED_LINKS = [
  permalink("night-riding", "how-to-ride-after-dark"),
  permalink("apparel", "how-riders-choose-a-shirt"),
  permalink("apparel", "streetwear-vs-riding-gear"),
  permalink("culture", "bike-night-etiquette"),
  permalink("rides", "group-ride-etiquette"),
  "/collections/after-dark",
  "/shop",
];

function featuredReadsFor(slug: string): string {
  const shirt = { href: permalink("apparel", "how-riders-choose-a-shirt"), label: "How riders choose a shirt", dek: "Weight, print, fit, and wash." };
  const gear = { href: permalink("apparel", "streetwear-vs-riding-gear"), label: "Streetwear versus riding gear", dek: "When a shirt is clothes and when you still need a jacket." };
  const night = { href: permalink("night-riding", "how-to-ride-after-dark"), label: "How to ride after dark", dek: "Lights, layers, and a named road." };
  const bike = { href: permalink("culture", "bike-night-etiquette"), label: "Bike-night etiquette", dek: "One space, short idle, open path." };
  const garage = { href: permalink("culture", "garage-culture-as-rider-social-life"), label: "Garage culture", dek: "The hour after the ride, not a costume." };
  const group = { href: permalink("rides", "group-ride-etiquette"), label: "Group-ride etiquette", dek: "Spacing, sweep, and a wave-off." };
  const bySlug: Record<string, Array<{ href: string; label: string; dek: string }>> = {
    "how-riders-choose-a-shirt": [gear, night],
    "streetwear-vs-riding-gear": [shirt],
    "how-to-ride-after-dark": [shirt, group],
    "bike-night-etiquette": [garage, group],
    "garage-culture-as-rider-social-life": [bike, shirt],
    "group-ride-etiquette": [night, bike],
  };
  return renderFeaturedReadsBottomHtml(bySlug[slug] ?? []);
}

export function clubThrottleJournalCoveragePlans(): ContentCoveragePlan[] {
  return [
    journalPlan({
      plan_id: "coverage:club-throttle:night-ride",
      canonical_url: permalink("night-riding", "how-to-ride-after-dark"),
      primary: "How to ride after dark without turning the night into a stunt",
      must: [
        { question: "How to ride after dark without turning the night into a stunt", tokens: ["headlight", "visibility", "after dark"] },
        { question: "How far can you trust your headlight?", tokens: ["headlight", "overdriving", "stopping"] },
        { question: "What should you inspect before a night ride?", tokens: ["checklist", "lights", "visor"] },
        { question: "When should you postpone a night ride?", tokens: ["postpone", "fatigue", "fog"] },
      ],
      secondary: [],
      definitions: ["headlight reach", "dark adaptation", "overdriving the headlight", "high-visibility", "following distance"],
      mistakes: ["overdriving the headlight", "dark clothing"],
      edges: ["fog", "unknown road"],
      decisions: ["postpone", "clear visor"],
      examples: ["30 percent", "two seconds"],
      next: ["inspect lights", "tell someone the route", "check the visor"],
      links: [
        permalink("apparel", "how-riders-choose-a-shirt"),
        permalink("apparel", "streetwear-vs-riding-gear"),
        permalink("culture", "bike-night-etiquette"),
        "/shop",
      ],
      outcomes: [
        "explain headlight reach",
        "identify overdriving the headlight",
        "compare clear versus tinted visors",
        "avoid dark clothing on an unlit road",
        "request a pre-ride checklist",
      ],
    }),
    journalPlan({
      plan_id: "coverage:club-throttle:shirt",
      canonical_url: permalink("apparel", "how-riders-choose-a-shirt"),
      primary: "How riders choose a shirt that survives the ride home",
      must: [
        { question: "How riders choose a shirt that survives the ride home", tokens: ["fabric weight", "size chart", "print"] },
        { question: "Why does heavyweight matter for riders?", tokens: ["heavyweight", "GSM", "drape"] },
        { question: "Where should the print sit on a lifestyle tee?", tokens: ["front print", "back print", "placement"] },
        { question: "How should a rider judge value without a fake price chart?", tokens: ["keep or return", "value", "compare two shirts"] },
      ],
      secondary: [],
      definitions: ["heavyweight", "GSM", "drape", "size chart", "screen print", "DTG"],
      mistakes: ["thin catalog", "tiny back print"],
      edges: ["humid night", "cold start"],
      decisions: ["tee or hoodie", "keep or return"],
      examples: ["six ounce", "200 GSM"],
      next: ["compare fabric weight", "check the size chart", "wash inside out"],
      links: [
        permalink("apparel", "streetwear-vs-riding-gear"),
        "/shop",
        "/collections/after-dark",
        permalink("night-riding", "how-to-ride-after-dark"),
      ],
      outcomes: [
        "explain fabric weight and GSM",
        "identify a tiny back print",
        "compare tee versus hoodie",
        "avoid treating a shirt as armor",
        "request the size chart",
      ],
    }),
    journalPlan({
      plan_id: "coverage:club-throttle:bike-night",
      canonical_url: permalink("culture", "bike-night-etiquette"),
      primary: "What bike-night etiquette keeps a lot usable?",
      must: [
        { question: "What bike-night etiquette keeps a lot usable?", tokens: ["bike-night etiquette", "park once", "idle"] },
        { question: "How should you arrive and leave?", tokens: ["arrive", "leave", "exhaust"] },
        { question: "What talk stays off the lot?", tokens: ["race bait", "illegal", "stunt"] },
        { question: "How do you treat a first-timer?", tokens: ["first-timer", "ask before touching", "no mock"] },
      ],
      secondary: [],
      definitions: ["bike night", "lot", "idle", "first-timer", "etiquette"],
      mistakes: ["race bait", "blocking an aisle"],
      edges: ["full lot", "rain start"],
      decisions: ["stay or leave", "move the bike"],
      examples: ["weeknight lot", "20 minute idle"],
      next: ["park once", "keep idle short", "leave a lane"],
      links: SHARED_LINKS.slice(1, 5),
      outcomes: ["explain bike-night etiquette", "identify blocking an aisle", "compare stay or leave", "avoid race bait", "request space before you park"],
    }),
    journalPlan({
      plan_id: "coverage:club-throttle:garage",
      canonical_url: permalink("culture", "garage-culture-as-rider-social-life"),
      primary: "What is garage culture if it is not a costume shop?",
      must: [
        { question: "What is garage culture if it is not a costume shop?", tokens: ["working garage", "not a costume", "after the ride"] },
        { question: "Who belongs in that room?", tokens: ["people who stay", "tools", "time"] },
        { question: "What should clothes do there?", tokens: ["survive grease", "still look like themselves", "next day"] },
        { question: "What imagery is off-limits?", tokens: ["fake outlaw", "manufacturer mark", "repair-shop costume"] },
      ],
      secondary: [],
      definitions: ["garage culture", "working garage", "costume", "after the ride", "identity"],
      mistakes: ["fake outlaw", "repair-shop costume"],
      edges: ["shared shop", "apartment parking"],
      decisions: ["invite or not", "print or hold"],
      examples: ["one bench light", "late oil change"],
      next: ["keep the floor clear", "name the hour", "do not print a costume"],
      links: SHARED_LINKS.slice(0, 4),
      outcomes: ["explain working garage culture", "identify a repair-shop costume", "compare meet and garage", "avoid fake outlaw marks", "request a real reason to print"],
    }),
    journalPlan({
      plan_id: "coverage:club-throttle:group-ride",
      canonical_url: permalink("rides", "group-ride-etiquette"),
      primary: "How should a street group ride work without becoming a race?",
      must: [
        { question: "How should a street group ride work without becoming a race?", tokens: ["group-ride etiquette", "not a race", "staggered"] },
        { question: "What spacing and signals matter?", tokens: ["staggered", "signal", "two-second"] },
        { question: "How do you leave the group?", tokens: ["wave off", "fuel stop", "last rider"] },
        { question: "What is unsafe to copy?", tokens: ["street racing", "gap jump", "illegal evasion"] },
      ],
      secondary: [],
      definitions: ["staggered formation", "sweep", "fuel stop", "wave off", "two-second gap"],
      mistakes: ["street racing", "gap jump"],
      edges: ["night group", "mixed bikes"],
      decisions: ["lead or sweep", "leave the group"],
      examples: ["six bikes", "two-second gap"],
      next: ["agree the route", "name the sweep", "stop for fuel together"],
      links: SHARED_LINKS.slice(0, 4),
      outcomes: ["explain group-ride etiquette", "identify a two-second gap", "compare lead or sweep", "avoid street racing", "request a named sweep"],
    }),
    journalPlan({
      plan_id: "coverage:club-throttle:gear",
      canonical_url: permalink("apparel", "streetwear-vs-riding-gear"),
      primary: "When is a motorcycle shirt clothes, and when do you still need gear?",
      must: [
        { question: "When is a motorcycle shirt clothes, and when do you still need gear?", tokens: ["streetwear versus riding gear", "not armor", "comparison table"] },
        { question: "What can a heavyweight tee do?", tokens: ["drape", "print", "daily wear"] },
        { question: "What can it not do?", tokens: ["not armor", "not abrasion", "not a helmet"] },
        { question: "How should a shop talk about this?", tokens: ["does not replace", "not automatically", "not legal advice"] },
      ],
      secondary: [],
      definitions: ["streetwear", "riding gear", "abrasion", "armor", "heavyweight tee"],
      mistakes: ["shirt as armor", "helmet optional"],
      edges: ["short commute", "parking-lot move"],
      decisions: ["jacket on or off", "tee under gear"],
      examples: ["comparison table", "tee under a jacket"],
      next: ["wear real gear on the ride", "keep the tee for after", "read the comparison table"],
      links: SHARED_LINKS.slice(0, 4),
      outcomes: ["explain streetwear versus riding gear", "identify a shirt as not armor", "compare tee under a jacket", "avoid helmet optional talk", "request a real jacket for the ride"],
    }),
  ];
}

export function clubThrottleJournalDrafts(): OrganicDraft[] {
  const posts = CLUB_THROTTLE_JOURNAL_POSTS;
  const night = clubThrottleAfterDarkV5Body();
  const shirt = clubThrottleShirtV5Body();
  const bike = clubThrottleBikeNightV5Body();
  const garage = clubThrottleGarageV5Body();
  const group = clubThrottleGroupRideV5Body();
  const gear = clubThrottleStreetwearGearV5Body();
  return [
    draftFrom({
      post: posts[0],
      answer: night.answer,
      headings: night.headings,
      body: night.body,
      faqs: night.faqs,
      links: [
        permalink("apparel", "how-riders-choose-a-shirt"),
        permalink("apparel", "streetwear-vs-riding-gear"),
        permalink("culture", "bike-night-etiquette"),
        "/shop",
      ],
      citations: [
        { source: "https://www.nhtsa.gov/road-safety/motorcycle-safety", source_type: "authority", retrieved_at: "2026-09-27", claim: "Motorcycle visibility and protective equipment guidance for night riding context." },
        { source: "https://www.iihs.org/topics/motorcycles", source_type: "authority", retrieved_at: "2026-09-27", claim: "Crash factors involving visibility and other road users." },
      ],
    }),
    draftFrom({
      post: posts[1],
      answer: shirt.answer,
      headings: shirt.headings,
      body: shirt.body,
      faqs: shirt.faqs,
      links: [permalink("apparel", "streetwear-vs-riding-gear"), "/shop", "/collections/after-dark", permalink("night-riding", "how-to-ride-after-dark")],
      citations: [
        { source: "https://www.cottoninc.com/cotton-from-field-to-fabric/", source_type: "authority", retrieved_at: "2026-09-27", claim: "Cotton fiber structure influences breathability, hand, and shrink behavior in knits." },
        { source: "https://www.printing.org/", source_type: "authority", retrieved_at: "2026-09-27", claim: "Screen printing and digital print methods differ in ink film, durability, and hand on fabric." },
      ],
    }),
    draftFrom({ post: posts[2], answer: bike.answer, headings: bike.headings, body: bike.body, faqs: bike.faqs, links: SHARED_LINKS.slice(1, 5) }),
    draftFrom({ post: posts[3], answer: garage.answer, headings: garage.headings, body: garage.body, faqs: garage.faqs, links: SHARED_LINKS.slice(0, 4) }),
    draftFrom({ post: posts[4], answer: group.answer, headings: group.headings, body: group.body, faqs: group.faqs, links: SHARED_LINKS.slice(0, 4) }),
    draftFrom({ post: posts[5], answer: gear.answer, headings: gear.headings, body: gear.body, faqs: gear.faqs, links: SHARED_LINKS.slice(0, 4) }),
  ];
}

export function clubThrottleJournalPublishedRecords() {
  return CLUB_THROTTLE_JOURNAL_POSTS.map((post) => ({
    venture_id: "club-throttle" as const,
    asset_id: `journal-${post.slug}`,
    obligation_id: `obl:club-throttle:${post.slug}`,
    content_version: `${post.slug}-v1`,
    visual_version: "journal-cover-v1",
    publication_status: "PUBLISHED" as const,
    title: post.title,
    slug: post.slug,
    path: post.path,
    canonical_url: `https://clubthrottle.com${post.path}`,
    excerpt: post.excerpt,
    primary_category: post.primaryCategory ?? post.category,
    secondary_categories: [],
    tags: post.tags,
    featured_image: post.image,
    featured_image_alt: post.image_alt,
    published_at: `${post.published}T00:00:00.000Z`,
    updated_at: `${post.modified}T00:00:00.000Z`,
    indexability: true,
    discovery_eligibility: true,
    featured: Boolean(post.featured),
    reading_time: post.reading_time,
    schema: { type: "Article", id: `journal-${post.slug}` },
    publication_evidence: "STOREFRONT_COMPOSE",
  }));
}

export function evaluateClubThrottleJournalQuality(): { result: "PASS" | "FAIL"; articles: number; failed: string[] } {
  const drafts = clubThrottleJournalDrafts();
  const plans = clubThrottleJournalCoveragePlans();
  const failed: string[] = [];
  drafts.forEach((draft, index) => {
    const report = evaluateContentQualityFramework(draft, plans[index]);
    if (report.result !== "PASS") failed.push(`${draft.canonical}:${report.reasons.join(",")}`);
    const isolation = evaluateVentureIsolationGate({ venture_id: "club-throttle", html_or_text: `${draft.body}\n${draft.internal_links.join(" ")}` });
    if (isolation.result === "FAIL") failed.push(`${draft.canonical}:${isolation.reasons.join(",")}`);
    const leak = evaluateInternalProcessLanguageGate(draft.body);
    if (leak.result === "FAIL") failed.push(`${draft.canonical}:${leak.reasons.join(",")}`);
    const voice = evaluateCustomerFacingLanguageGate(draft.body);
    if (voice.result === "FAIL") failed.push(`${draft.canonical}:${voice.reasons.join(",")}`);
  });
  const bodies = drafts.map((draft) => draft.body);
  const pattern = evaluateGenericContentPatternGate(bodies);
  if (pattern.result === "FAIL") failed.push(`journal:${pattern.reasons.join(",")}`);
  const template = evaluateCrossArticleTemplateSimilarityGate(bodies);
  if (template.result === "FAIL") failed.push(`journal:${template.reasons.join(",")}`);
  return { result: failed.length ? "FAIL" : "PASS", articles: drafts.length, failed };
}

export function clubThrottleJournalIndexHtml(): string {
  const selection = selectPopularOrFeaturedBlogs({ posts: CLUB_THROTTLE_JOURNAL_POSTS });
  return `${renderMainBlogRollHtml(CLUB_THROTTLE_JOURNAL_POSTS)}
${renderFeaturedBlogsCarouselHtml(selection.posts, { public_label: selection.public_label, mode: selection.mode })}
<section data-blog-featured-reads="true" data-blog-featured-reads-position="bottom">
                <h2 className="onpv-blog-section-heading">Featured Reads</h2>
                <ul className="onpv-blog-featured-reads">
                  <li><a href="${permalink("apparel", "streetwear-vs-riding-gear")}">Streetwear versus riding gear</a><p>When a shirt is clothes and when you still need a jacket.</p></li>
                  <li><a href="${permalink("night-riding", "how-to-ride-after-dark")}">How to ride after dark</a><p>A checklist that is not a stunt brief.</p></li>
                  <li><a href="${permalink("rides", "group-ride-etiquette")}">Group-ride etiquette</a><p>Spacing, sweep, and how to leave without becoming a race.</p></li>
                </ul>
              </section>
<script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(LATEST_BLOGS_CAROUSEL_SCRIPT)} }} />`;
}

export function composeClubThrottleJournalFiles(): Array<{ path: string; content: string }> {
  const posts = CLUB_THROTTLE_JOURNAL_POSTS;
  const drafts = clubThrottleJournalDrafts();
  const files: Array<{ path: string; content: string }> = [
    {
      path: "app/journal/page.tsx",
      content: `export const metadata = { title: "Journal · Club Throttle", alternates: { canonical: ${JSON.stringify(clubThrottleJournalIndexCanonical())} } };
export default function JournalPage() {
  return (
    <article className="sheet" data-blog-layout="editorial" data-content-surface="journal">
      <p className="kicker">Journal</p>
      <h1>Notes from the shop and the road</h1>
      <p data-direct-answer="true">The journal is Club Throttle's blog: rider notes, garment decisions, and the rules of a night that is not a stunt.</p>
      ${clubThrottleJournalIndexHtml()}
    </article>
  );
}
`,
    },
    {
      path: "app/blog/page.tsx",
      content: `import { redirect } from "next/navigation";
export default function BlogRedirect() { redirect("/journal/"); }
`,
    },
    {
      path: "app/journal/category/[category]/page.tsx",
      content: `import Link from "next/link";
const POSTS = ${JSON.stringify(posts.map((row) => ({ title: row.title, path: row.path, category: row.primaryCategory, tags: row.tags })))};
export default async function JournalCategory({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const rows = POSTS.filter((row) => row.category.replace(/\\s+/g, "-") === category);
  return <article className="sheet" data-blog-archive="category"><h1>{category.replace(/-/g, " ")}</h1><ul>{rows.map((row) => <li key={row.path}><Link href={row.path}>{row.title}</Link></li>)}</ul></article>;
}
`,
    },
    {
      path: "app/journal/tag/[tag]/page.tsx",
      content: `import Link from "next/link";
const POSTS = ${JSON.stringify(posts.map((row) => ({ title: row.title, path: row.path, tags: row.tags })))};
export default async function JournalTag({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const rows = POSTS.filter((row) => row.tags.some((item) => item.replace(/\\s+/g, "-") === tag));
  return <article className="sheet" data-blog-archive="tag"><h1>{tag.replace(/-/g, " ")}</h1><ul>{rows.map((row) => <li key={row.path}><Link href={row.path}>{row.title}</Link></li>)}</ul></article>;
}
`,
    },
  ];
  drafts.forEach((draft) => {
    const slug = draft.canonical.split("/").filter(Boolean).slice(-1)[0];
    const category = draft.canonical.split("/").filter(Boolean)[1];
    const post = CLUB_THROTTLE_JOURNAL_POSTS.find((row) => row.slug === slug);
    const mainHtml = renderCanonicalArticleMain({
      headings: draft.headings,
      body: draft.body,
      faqs: draft.visible_faqs,
    });
    const shell = renderBlogArticleShell({
      category: draft.breadcrumbs[1] ?? category,
      date: post?.published ?? "2026-09-25",
      title: draft.h1,
      dek: draft.direct_answer ?? "",
      featured_image: post?.image ?? "/visual/journal-night-ride.svg",
      featured_alt: post?.image_alt ?? draft.h1,
      tags: post?.tags,
      path: draft.canonical,
      posts: CLUB_THROTTLE_JOURNAL_POSTS,
      main_html: mainHtml,
      venture_id: "club-throttle",
      archive_root: "/journal",
      featured_reads_html: featuredReadsFor(slug),
    });
    const metadata = clubThrottleJournalArticleMetadata(draft);
    const schemaGraph = clubThrottleJournalArticleSchemaGraph({ draft, post: post!, shell_html: shell });
    files.push({
      path: `app/journal/${category}/${slug}/page.tsx`,
      content: `export const metadata = ${JSON.stringify(metadata, null, 2)};
export default function JournalArticle() {
  return (
    <div data-page-type="BLOG_ARTICLE" data-performance-surface="journal-article">
      ${shell}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(JSON.stringify(schemaGraph))} }} />
    </div>
  );
}
`,
    });
  });
  files.push({ path: "styles/journal-editorial.css", content: OCCUPANCYNPV_BLOG_EDITORIAL_CSS });
  return files;
}
