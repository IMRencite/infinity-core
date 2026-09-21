import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import type { SemanticNavigationCard } from "./public-authority-standard/semantic-navigation-quality";
import { uniqueCanonicalQuestions } from "./search-validated-question-graph";

export type PolishNavPlan = {
  variant: string;
  title: string;
  cards: SemanticNavigationCard[];
};

const LEGAL = new Set(["/privacy-policy", "/terms-of-service"]);
const SKIP = new Set(["/early-access", ...LEGAL]);

function clean(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

function topicOf(route: string): string {
  return clean(route).split("/").filter(Boolean)[0] ?? "";
}

const ALL_QUESTIONS = [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES].map((page: {
  route: string;
  hub: string;
  question: string;
  description?: string;
}) => ({
  route: clean(page.route),
  hub: clean(page.hub),
  title: page.question,
  description: page.description ?? page.question,
  topic: topicOf(page.route),
}));

const HUBS = SEO_GEO_TOPIC_HUBS.map((hub) => ({
  route: clean(hub.route),
  title: hub.title,
  description: hub.description,
  topic: hub.cluster,
}));

function card(
  href: string,
  title: string,
  description: string,
  icon: string,
  relationship: string,
): SemanticNavigationCard {
  return {
    href: href.endsWith("/") || href === "/" ? href : `${href}/`,
    title: title.replace(/\?$/, ""),
    description: description.split(/(?<=[.!?])\s+/)[0] ?? description,
    icon,
    relationship,
  };
}

function unique(cards: SemanticNavigationCard[], self: string): SemanticNavigationCard[] {
  const seen = new Set<string>([clean(self)]);
  const out: SemanticNavigationCard[] = [];
  for (const item of cards) {
    const key = clean(item.href);
    if (seen.has(key) || out.length >= 6) continue;
    seen.add(key);
    out.push({ ...item, description: item.description.slice(0, 110) });
  }
  return out;
}

function questionsForTopic(topic: string, self: string) {
  return ALL_QUESTIONS.filter((page) => page.topic === topic && page.route !== self);
}

function graphTargets(self: string): string[] {
  const records = uniqueCanonicalQuestions().filter((row) => clean(row.mappedRoute ?? "") === self);
  const related = records.flatMap((row) => row.candidateInternalLinkTargets);
  return [...new Set(related.map(clean).filter((item) => item && item !== self))];
}

function variantFor(route: string): { variant: string; title: string } {
  if (HUBS.some((hub) => hub.route === route)) return { variant: "RELATED_QUESTIONS", title: "Questions in this topic" };
  if (route === "/") return { variant: "USE_THE_TOOL", title: "Use the workflow" };
  if (route === "/compare-commercial-leases") return { variant: "COMPARE_NEXT", title: "Compare the next decision" };
  if (route === "/how-it-works") return { variant: "LEARN_NEXT", title: "Learn the ideas behind the steps" };
  if (route === "/pricing") return { variant: "USE_THE_TOOL", title: "Related product paths" };
  if (route === "/resources") return { variant: "RELATED_TOPICS", title: "Explore the topic map" };
  if (route === "/for/tenant-rep-brokers") return { variant: "FOR_YOUR_ROLE", title: "For your role" };
  if (route === "/faq") return { variant: "QUESTIONS_PEOPLE_ASK_NEXT", title: "Questions people ask next" };
  const page = ALL_QUESTIONS.find((item) => item.route === route);
  const expansion = EXPANSION_QUESTION_PAGES.find((item) => clean(item.route) === route);
  const intent = expansion?.semanticIntent ?? "";
  if (intent === "COMPARISON") return { variant: "COMPARE_NEXT", title: "Compare the next decision" };
  if (intent === "BROKER_PRACTICE" || route.includes("tenant-rep")) return { variant: "FOR_YOUR_ROLE", title: "For your role" };
  if (intent === "COST_COMPONENT" || intent === "SENSITIVITY" || intent === "FORMULA") {
    return { variant: "GO_DEEPER", title: "Go deeper" };
  }
  if (page) return { variant: "LEARN_NEXT", title: "Learn next" };
  return { variant: "RELATED_QUESTIONS", title: "Related questions" };
}

function iconFor(href: string, relationship: string): string {
  if (href.includes("compare") || relationship === "comparison") return "compare";
  if (href.includes("occupancy") || href.includes("cam") || relationship === "cost") return "cost";
  if (href.includes("tenant-rep") || href.startsWith("/for/")) return "role";
  if (href === "/how-it-works" || href === "/compare-commercial-leases" || href === "/early-access") return "tool";
  if (href.split("/").filter(Boolean).length === 1) return "topic";
  if (relationship === "deeper") return "deeper";
  return "question";
}

export function semanticNavigationForRoute(route: string): PolishNavPlan | null {
  const self = clean(route);
  if (SKIP.has(self)) return null;
  const { variant, title } = variantFor(self);
  const topic = topicOf(self);
  const hub = HUBS.find((item) => item.topic === topic);
  const siblings = questionsForTopic(topic, self);
  const graph = graphTargets(self);
  const drafts: SemanticNavigationCard[] = [];

  if (variant === "RELATED_TOPICS") {
    for (const item of HUBS.filter((hubItem) => hubItem.route !== self).slice(0, 5)) {
      drafts.push(card(item.route, item.title, item.description, "topic", "cross-topic"));
    }
    drafts.push(card("/compare-commercial-leases", "Compare two leases", "Put both offers on one timeline.", "compare", "commercial-path"));
  } else if (variant === "USE_THE_TOOL") {
    drafts.push(card("/compare-commercial-leases", "Compare two leases", "See the shared timeline before you pick.", "compare", "commercial-path"));
    drafts.push(card("/how-it-works", "See the workflow", "Four steps from scattered terms to a summary.", "tool", "workflow"));
    drafts.push(card("/pricing", "View pilot pricing", "See what a bounded pilot includes.", "tool", "commercial-path"));
    if (self !== "/occupancy-costs") drafts.push(card("/occupancy-costs", "Occupancy costs", "Face rent is not the full bill.", "cost", "related"));
    drafts.push(card("/commercial-lease-npv", "Commercial lease NPV", "Learn why later cash is not equal to cash today.", "topic", "related"));
  } else if (variant === "FOR_YOUR_ROLE") {
    drafts.push(card("/for/tenant-rep-brokers", "Tenant-rep workflow", "A simple path a client can review.", "role", "persona"));
    drafts.push(card("/tenant-rep-analysis", "Tenant-rep analysis", "Move from proposals to a clear story.", "role", "related"));
    drafts.push(card("/compare-commercial-leases", "Compare two leases", "Use one stack for both offers.", "compare", "commercial-path"));
    drafts.push(card("/how-it-works", "See the workflow", "Show the steps before the number.", "tool", "workflow"));
    const brokerPage = siblings.find((item) => /explain|broker|client/i.test(item.title));
    if (brokerPage) drafts.push(card(brokerPage.route, brokerPage.title, brokerPage.description, "question", "related"));
  } else if (variant === "COMPARE_NEXT") {
    drafts.push(card("/lease-comparison/how-do-you-compare-two-commercial-lease-options", "Compare two commercial leases", "Put both leases on one timeline.", "compare", "comparison"));
    drafts.push(card("/lease-comparison/how-do-you-compare-gross-and-net-leases", "Gross and net leases", "Convert both offers to one occupancy-cost stack.", "compare", "comparison"));
    drafts.push(card("/effective-rent/effective-rent-vs-npv", "Effective rent vs NPV", "One number can hide later cash.", "compare", "comparison"));
    drafts.push(card("/occupancy-costs/what-is-total-occupancy-cost", "What is total occupancy cost?", "Add the extras that sit beside rent.", "cost", "related"));
    drafts.push(card("/compare-commercial-leases", "Use the comparison workflow", "Try the same method on a sample pair.", "tool", "commercial-path"));
  } else {
    if (hub && hub.route !== self) drafts.push(card(hub.route, hub.title, hub.description, "topic", "parent-hub"));
    for (const item of siblings.slice(0, 3)) {
      drafts.push(card(item.route, item.title, item.description, iconFor(item.route, "related"), "related"));
    }
    const deeper = siblings.find((item) => /sensitiv|discount|npv vs|limit/i.test(item.title));
    if (deeper) drafts.push(card(deeper.route, deeper.title, deeper.description, "deeper", "deeper"));
    const cross = ALL_QUESTIONS.find((item) => item.topic !== topic && graph.includes(item.route));
    if (cross) drafts.push(card(cross.route, cross.title, cross.description, iconFor(cross.route, "cross-topic"), "cross-topic"));
    if (variant !== "RELATED_QUESTIONS") {
      drafts.push(card("/compare-commercial-leases", "Compare two leases", "Use one method on both offers.", "compare", "commercial-path"));
    } else {
      drafts.push(card("/how-it-works", "See the workflow", "Turn the topic into a repeatable path.", "tool", "workflow"));
    }
  }

  const cards = unique(drafts, self);
  if (cards.length < 3) {
    const extras = ALL_QUESTIONS.filter((item) => item.route !== self).slice(0, 4).map((item) =>
      card(item.route, item.title, item.description, "question", "related"),
    );
    cards.push(...unique([...cards, ...extras], self).slice(cards.length));
  }
  const finalCards = unique(cards, self).slice(0, 6);
  if (finalCards.length < 3) return null;
  return { variant, title, cards: finalCards };
}

export function polishNavEligibleRoutes(): string[] {
  return [
    "/",
    ...HUBS.map((hub) => hub.route),
    ...ALL_QUESTIONS.map((page) => page.route),
    "/how-it-works",
    "/compare-commercial-leases",
    "/resources",
    "/pricing",
    "/faq",
    "/for/tenant-rep-brokers",
  ].filter((route, index, all) => all.indexOf(route) === index && !SKIP.has(route));
}
