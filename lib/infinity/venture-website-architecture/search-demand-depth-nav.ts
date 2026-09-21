import { semanticNavigationForRoute, type PolishNavPlan } from "./authority-final-polish-nav";
import { DEPTH_QUESTION_PAGES } from "./search-demand-depth-catalog";
import { SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";

function clean(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

export function searchDepthNavigationForRoute(route: string): PolishNavPlan | null {
  const existing = semanticNavigationForRoute(route);
  const self = clean(route);
  const page = DEPTH_QUESTION_PAGES.find((item) => clean(item.route) === self);
  if (!page) return existing;
  const hub = SEO_GEO_TOPIC_HUBS.find((item) => item.cluster === page.topic);
  const siblings = DEPTH_QUESTION_PAGES.filter((item) => item.topic === page.topic && clean(item.route) !== self).slice(0, 3);
  const cards = [
    hub
      ? {
          href: `${hub.route}/`,
          title: hub.title.replace(/\?$/, ""),
          description: hub.description.split(/(?<=[.!?])\s+/)[0] ?? hub.description,
          icon: "topic",
          relationship: "parent-hub",
        }
      : null,
    ...siblings.map((item) => ({
      href: item.route.endsWith("/") ? item.route : `${item.route}/`,
      title: item.title.replace(/\?$/, ""),
      description: item.description.split(/(?<=[.!?])\s+/)[0] ?? item.description,
      icon: "question",
      relationship: "related",
    })),
    {
      href: "/compare-commercial-leases",
      title: "Compare two leases",
      description: "Use one method on both offers.",
      icon: "compare",
      relationship: "commercial-path",
    },
    {
      href: "/how-it-works",
      title: "See the workflow",
      description: "Turn the topic into a repeatable path.",
      icon: "tool",
      relationship: "workflow",
    },
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  return {
    variant: page.semanticIntent === "COMPARISON" ? "COMPARE_NEXT" : "LEARN_NEXT",
    title: page.semanticIntent === "COMPARISON" ? "Compare the next decision" : "Learn next",
    cards: cards.slice(0, 6),
  };
}
