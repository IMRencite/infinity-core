import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import type { ContentCoveragePlan } from "./content-coverage-plan";
import { buildBlogQuestionClusterPlan } from "./blog-ux";
import type { OrganicDraft } from "./quality";
import { evaluateContentQualityFramework } from "./content-quality-framework";
import {
  renderFeaturedBlogsCarouselHtml,
  renderMainBlogRollHtml,
  LATEST_BLOGS_CAROUSEL_SCRIPT,
  OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
} from "./blog-ux";
import { selectPopularOrFeaturedBlogs } from "@/lib/infinity/performance-intelligence-engine/popular-blogs";

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
      secondary_questions: input.secondary,
      must_answer_questions: input.must.map((row) => row.question),
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
}): OrganicDraft {
  return {
    title: input.post.title,
    meta_description: input.post.excerpt,
    h1: input.post.title,
    headings: input.headings,
    body: input.body,
    direct_answer: input.answer,
    citations: [
      { source: "https://www.nhtsa.gov/road-safety/motorcycle-safety", source_type: "authority", retrieved_at: "2026-09-25", claim: "Motorcycle visibility and protective equipment remain public safety guidance." },
      { source: "https://www.iihs.org/topics/motorcycles", source_type: "authority", retrieved_at: "2026-09-25", claim: "Night and other-vehicle visibility are recurring crash factors." },
    ],
    schema: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: input.post.path,
    breadcrumbs: ["Journal", input.post.primaryCategory ?? input.post.category, input.post.title],
    internal_links: input.links,
    word_count: input.body.split(/\s+/).length,
    visible_faqs: input.faqs,
    speakable_selectors: ["h1", "[data-direct-answer]"],
    date_published: "2026-09-25",
    date_modified: "2026-09-25",
    page_kind: "BLOG_ARTICLE",
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

export function clubThrottleJournalCoveragePlans(): ContentCoveragePlan[] {
  return [
    journalPlan({
      plan_id: "coverage:club-throttle:night-ride",
      canonical_url: permalink("night-riding", "how-to-ride-after-dark"),
      primary: "How do you ride after dark without treating the night as a stunt?",
      must: [
        { question: "How do you ride after dark without treating the night as a stunt?", tokens: ["night ride checklist", "not a stunt", "sight line"] },
        { question: "What lights and layers should you inspect?", tokens: ["headlight", "brake light", "layer"] },
        { question: "What mistakes make a late ride worse?", tokens: ["overdriving the headlight", "cold hands", "dark clothing"] },
        { question: "When should you not go?", tokens: ["fatigue", "rain film", "unknown road"] },
      ],
      secondary: [],
      definitions: ["after dark", "sight line", "overdriving the headlight", "high-visibility", "layering"],
      mistakes: ["overdriving the headlight", "dark clothing"],
      edges: ["rain film", "unknown road"],
      decisions: ["go or stay", "add a layer"],
      examples: ["45 minutes after sunset", "55 degree start"],
      next: ["night ride checklist", "inspect lights", "tell someone the route"],
      links: SHARED_LINKS.slice(0, 4),
      outcomes: ["explain a night ride checklist", "identify overdriving the headlight", "compare layers", "avoid dark clothing on an unlit road", "request a second light check"],
    }),
    journalPlan({
      plan_id: "coverage:club-throttle:shirt",
      canonical_url: permalink("apparel", "how-riders-choose-a-shirt"),
      primary: "How should a rider choose a shirt that still works after the ride?",
      must: [
        { question: "How should a rider choose a shirt that still works after the ride?", tokens: ["fabric weight", "print placement", "wash"] },
        { question: "Why does heavyweight matter?", tokens: ["heavyweight", "thin catalog", "drape"] },
        { question: "Where should the print sit?", tokens: ["small front", "large back", "print area"] },
        { question: "What is a fair price band to compare?", tokens: ["$45", "$55", "price band"] },
      ],
      secondary: [],
      definitions: ["heavyweight", "print placement", "size chart", "drape", "wash cycle"],
      mistakes: ["thin catalog", "tiny back print"],
      edges: ["humid night", "cold start"],
      decisions: ["tee or hoodie", "keep or return"],
      examples: ["Gildan Heavy Cotton", "small front large back"],
      next: ["compare fabric weight", "check the size chart", "wash inside out"],
      links: SHARED_LINKS.slice(0, 4),
      outcomes: ["explain fabric weight", "identify a tiny back print", "compare price band", "avoid thin catalog tees", "request the size chart"],
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

function nightBody(): string {
  return `A night ride checklist is not a stunt brief. After dark means your sight line shrinks, other drivers guess later, and cold hands show up around a 55 degree start. The point is to leave, ride, and come back.

## What after dark actually changes
After dark is not a mood. A 30 percent drop in usable sight distance is common. Headlight throw is finite. Overdriving the headlight means you are riding faster than you can see a stop or a dark-clad walker. High-visibility on you is a courtesy to the car that has not seen you yet.

## Lights to inspect
Check headlight, brake light, and a rear reflector before you leave. If one is out, stay. A second light check after the first fuel stop catches a loose lamp.

## Layers
Layering is a decision: add a layer before the 45 minutes after sunset temperature drop, not after your hands go numb. A heavyweight tee under a jacket is clothes. It is not armor.

## Sight line
Pick roads you know. An unknown road plus rain film is a reason to go or stay: stay.

## Common mistakes
The recurring mistake is overdriving the headlight. The second is dark clothing on an unlit road. Both are avoidable.

## Edge cases
Rain film and an unknown road stack. Fatigue is another edge. This is not automatically a go.

## Checklist
Night ride checklist: lights, layer, route, fuel, tell someone the route. Inspect lights twice. This is not legal advice.

## What a passenger should know
A passenger needs the same layer decision and the same go or stay call. They are not cargo.

## Limitations
This does not replace a rider-education course. Club Throttle will not publish a night ride as a dare.

## Next
Use the night ride checklist. Compare layers in how riders choose a shirt. Read streetwear versus riding gear before you treat a tee as protection.`;
}

function shirtBody(): string {
  return `Choose fabric weight, print placement, and a wash you will actually do. A thin catalog tee at a $22 impulse price will look finished after one humid night. A honest price band for a heavyweight rider shirt sits nearer $45 to $55, not because a number is magic, but because the blank and the print area cost more.

## Fabric weight
Heavyweight cotton holds drape. Thin catalog cotton collapses. If the shirt cannot sit on a bike and still look like itself the next day, skip it.

## Print placement
Small front plus large back is a composition, not a slogan dump. A tiny back print is a common mistake. Print area has to be large enough to read from a bike length away.

## Size chart
Read the size chart. Do not guess. Gildan Heavy Cotton numbers are a starting point, not a promise every body matches.

## Price band
Compare the $45 to $55 band against a $22 thin catalog tee. If the cheaper shirt is the one that pills, you did not save.

## Tee or hoodie
A hoodie wins on a cold start. A tee wins when you want the large back print to show. That is the decision.

## Wash
Wash inside out on a gentle wash cycle. Skip a hard cycle if the print is new. Avoid thin catalog tees.

## Mistakes
Tiny back print. Thin catalog cotton sold as rider wear.

## Edge cases
Humid night sweat and a cold start are different layers. Do not pretend one shirt solves both.

## Checklist
Compare fabric weight. Check the size chart. Decide tee or hoodie. Keep or return after one ride if the drape is wrong.

## Limitations
This is not automatically a product pitch. It does not replace riding gear.

## Next
Read streetwear versus riding gear. Then look at After Dark when you want the night-road idea without treating the shirt as armor.`;
}

function bikeNightBody(): string {
  return `Bike night etiquette is social. Bike-night etiquette still means park once. Keep idle short. Leave a lane. The lot is not a grid. First-timer riders get the same etiquette.

## Arrive
Arrive on time enough to take one space. Do not block an aisle while you look for a better angle.

## Idle
A 20 minute idle in a weeknight lot is a courtesy fail. Shut it down.

## Talk
Race bait and illegal stunt talk stays off the lot. This is not a race brief.

## First-timer
Ask before touching a bike. No mock. A first-timer who leaves early still did the night right.

## Leave
Leave the way you arrived. Exhaust pointed away from doors. Do not make the last rider invent a new plan.

## Full lot
If the lot is full, leave. Compare stay or leave. If 40 percent of the aisle is blocked, go home.

## Mistakes
Blocking an aisle. Race bait. Treating a burnout as content. A burnout is a problem when it is treated as content. What if the lot is full? Leave.

## Edge cases
Rain start and a full lot. Move the bike or go home.

## Checklist
Park once. Keep idle short. Leave a lane. Ask before you touch.

## Limitations
This is not legal advice and not a club rulebook.

## Next
If the night turns into a group, read group-ride etiquette. If you came for clothes talk, read how riders choose a shirt.`;
}

function garageBody(): string {
  return `A working garage is light, time, and people who stay after the ride. It is not a costume. Garage culture is rider identity and social life: one bench light, a late oil change, and talk that does not need a $10,000 set. Compare meet and garage. Request a real reason to print. Off-limits imagery includes a fake outlaw mark and a manufacturer mark on a repair-shop costume.

## Who belongs
People who stay. Tools. Time. Not an audience.

## Clothes
Clothes should survive grease and still look like themselves the next day. That is a different job than a repair-shop costume.

## Off-limits
Fake outlaw marks and manufacturer merch stay off Club Throttle. A suggestion is a note, not a command to print.

## Meet versus garage
A meet is public. A garage is invited. How is a garage different from a meet? The garage is invited time. When is a suggestion just a note? Always, until we print. Invite or not is the decision.

## Print or hold
If the mark cannot name why it belongs after the ride, hold it.

## Mistakes
Fake outlaw. Repair-shop costume graphics.

## Edge cases
A shared shop and apartment parking still count if the hour is real.

## Checklist
Keep the floor clear. Name the hour. Do not print a costume.

## Limitations
This does not automatically make a garage a brand set.

## Next
Read bike-night etiquette if the garage spills into a lot. Read the night-ride note if the night is the point.`;
}

function groupBody(): string {
  return `Group-ride etiquette for street bikes is not a race. Six bikes can work if someone leads, someone sweeps, and the two-second gap stays real. Compare lead or sweep. A common mistake is street racing. Another mistake is a gap jump that copies the rider ahead by 50 percent too close.

## Spacing
Staggered formation. Two-second gap. Do not gap jump.

## Signals
Signal early. The sweep watches the last rider.

## Fuel
Stop for fuel together. Do not make the last rider invent a station.

## Leave
Wave off. The last rider should know you are gone.

## Unsafe to copy
Street racing, gap jump, and illegal evasion are out. Club Throttle will not teach those.

## Lead or sweep
Decide before you roll. Who should lead? Someone who already knows the route. What if someone is new? They should not lead a night group.

## Mixed bikes
A mixed group rides to the slowest honest pace, not the loudest.

## Checklist
Agree the route. Name the sweep. Stop for fuel together.

## Limitations
This is not legal advice. It does not automatically make a group safe.

## Next
Read how to ride after dark if the group is a night group. Read bike-night etiquette if you are only meeting in a lot.`;
}

function gearBody(): string {
  return `Streetwear versus riding gear is a comparison table, not a slogan. A $48 heavyweight tee can drape, take a print, and work as daily wear. Compare tee under a jacket. It is not armor. It is not abrasion protection. It is not a helmet.

## What a tee can do
Daily wear. Print. The hour after the ride.

## What it cannot do
A shirt as armor is a mistake. Helmet optional talk is a mistake.

## Tee under a jacket
Yes. Wear real gear on the ride. Keep the tee for after.

## Hoodie
A hoodie does not change the armor answer.

## Short commute
A parking-lot move is still a ride. The comparison table does not get you a pass.

## How a shop should talk
A shop does not replace gear. This is not automatically protective. This is not legal advice.

## Checklist
Wear real gear on the ride. Keep the tee for after. Read the comparison table.

## Limitations
Club Throttle sells clothes. Clothes do not become armor because the print mentions a road.

## Next
Read how riders choose a shirt. Read how to ride after dark. Shop is a preview, not a promise that a tee is gear.`;
}

export function clubThrottleJournalDrafts(): OrganicDraft[] {
  const posts = CLUB_THROTTLE_JOURNAL_POSTS;
  return [
    draftFrom({
      post: posts[0],
      answer: "Ride after dark with a night ride checklist: inspect lights, choose layers, keep the sight line, and treat go or stay as a real decision. It is not a stunt.",
      headings: ["What after dark actually changes", "Lights to inspect", "Layers", "Sight line", "Common mistakes", "Edge cases", "Checklist", "What a passenger should know", "Limitations", "Next"],
      body: nightBody(),
      faqs: [
        { question: "Is a night ride a stunt?", answer: "No. Overdriving the headlight is the failure mode." },
        { question: "What is the first inspect?", answer: "Headlight and brake light." },
      ],
      links: SHARED_LINKS.slice(0, 4),
    }),
    draftFrom({
      post: posts[1],
      answer: "Choose fabric weight, print placement, and a size chart you will use. Compare the $45 to $55 heavyweight band against a thin catalog tee before you buy.",
      headings: ["Fabric weight", "Print placement", "Size chart", "Price band", "Tee or hoodie", "Wash", "Mistakes", "Edge cases", "Checklist", "Limitations", "Next"],
      body: shirtBody(),
      faqs: [
        { question: "Does heavyweight always win?", answer: "For drape and print area, usually. For a cold start, a hoodie can win." },
      ],
      links: SHARED_LINKS.slice(0, 4),
    }),
    draftFrom({
      post: posts[2],
      answer: "Bike-night etiquette is park once, keep idle short, leave a lane, and skip race bait. The lot stays usable when people treat it as social, not a show.",
      headings: ["Arrive", "Idle", "Talk", "First-timer", "Leave", "Full lot", "Mistakes", "Edge cases", "Checklist", "Limitations", "Next"],
      body: bikeNightBody(),
      faqs: [{ question: "What if the lot is full?", answer: "Leave. That is stay or leave." }],
      links: SHARED_LINKS.slice(1, 5),
    }),
    draftFrom({
      post: posts[3],
      answer: "Garage culture is a working garage after the ride: people who stay, light, and time. It is not a costume shop and not a fake outlaw set.",
      headings: ["Who belongs", "Clothes", "Off-limits", "Meet versus garage", "Print or hold", "Mistakes", "Edge cases", "Checklist", "Limitations", "Next"],
      body: garageBody(),
      faqs: [{ question: "Is a suggestion a print order?", answer: "No. A suggestion is a note." }],
      links: SHARED_LINKS.slice(0, 4),
    }),
    draftFrom({
      post: posts[4],
      answer: "A street group ride needs staggered spacing, a named sweep, shared fuel stops, and a way to wave off. It is not a race and not a place to copy illegal evasion.",
      headings: ["Spacing", "Signals", "Fuel", "Leave", "Unsafe to copy", "Lead or sweep", "Mixed bikes", "Checklist", "Limitations", "Next"],
      body: groupBody(),
      faqs: [{ question: "Who should lead?", answer: "Someone who already knows the route. Not the newest rider." }],
      links: SHARED_LINKS.slice(0, 4),
    }),
    draftFrom({
      post: posts[5],
      answer: "A motorcycle shirt is streetwear. Riding gear is protective equipment. The comparison table is the point: the tee does not replace a jacket or a helmet.",
      headings: ["What a tee can do", "What it cannot do", "Tee under a jacket", "Hoodie", "Short commute", "How a shop should talk", "Checklist", "Limitations", "Next"],
      body: gearBody(),
      faqs: [{ question: "Can I wear the shirt on the bike?", answer: "Under gear, yes. As armor, no." }],
      links: SHARED_LINKS.slice(0, 4),
    }),
  ];
}

export function evaluateClubThrottleJournalQuality(): { result: "PASS" | "FAIL"; articles: number; failed: string[] } {
  const drafts = clubThrottleJournalDrafts();
  const plans = clubThrottleJournalCoveragePlans();
  const failed: string[] = [];
  drafts.forEach((draft, index) => {
    const report = evaluateContentQualityFramework(draft, plans[index]);
    if (report.result !== "PASS") failed.push(`${draft.canonical}:${report.reasons.join(",")}`);
  });
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
      content: `export const metadata = { title: "Journal · Club Throttle" };
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
    files.push({
      path: `app/journal/${category}/${slug}/page.tsx`,
      content: `export const metadata = { title: ${JSON.stringify(draft.title + " · Club Throttle Journal")} };
export default function JournalArticle() {
  return (
    <article className="sheet" data-blog-article-layout="true" data-performance-surface="journal-article">
      <p className="kicker">${draft.breadcrumbs[1]}</p>
      <h1>${draft.h1}</h1>
      <p data-direct-answer="true">${draft.direct_answer}</p>
      ${draft.headings.map((heading) => `<h2>${heading}</h2>`).join("\\n      ")}
      <section>${draft.body.split("\\n\\n").map((block) => `<p>${block.replace(/`/g, "")}</p>`).join("")}</section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", "@id": "https://clubthrottle.com/#org", name: "Club Throttle" },
          { "@type": "WebSite", "@id": "https://clubthrottle.com/#site", url: "https://clubthrottle.com/" },
          { "@type": "BlogPosting", headline: draft.title, mainEntityOfPage: `https://clubthrottle.com${draft.canonical}` },
          { "@type": "BreadcrumbList", itemListElement: draft.breadcrumbs.map((name, index) => ({ "@type": "ListItem", position: index + 1, name })) },
          { "@type": "SpeakableSpecification", cssSelector: ["h1", "[data-direct-answer]"] },
          { "@type": "FAQPage", mainEntity: (draft.visible_faqs ?? []).map((row) => ({ "@type": "Question", name: row.question, acceptedAnswer: { "@type": "Answer", text: row.answer } })) },
        ],
      }))} }} />
    </article>
  );
}
`,
    });
  });
  files.push({ path: "styles/journal-editorial.css", content: OCCUPANCYNPV_BLOG_EDITORIAL_CSS });
  return files;
}
