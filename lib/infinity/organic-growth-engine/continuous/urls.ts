import { slugifyOrganic } from "./graph";
import type { OrganicNamedGate, PlannedOrganicUrl } from "./types";
import { ORGANIC_URL_HIERARCHY_GATE } from "./contract";

const CRE_ROOT = "commercial-real-estate";
export const OCCUPANCYNPV_LIVE_CAP_RATE_PATH = "/commercial-lease-npv/how-is-cap-rate-calculated/" as const;

export function planOrganicUrl(input: {
  pillar: string;
  cluster?: string;
  question?: string;
  content_type?: string;
}): PlannedOrganicUrl {
  const pillarSlug = slugifyOrganic(input.pillar);
  const clusterSlug = input.cluster ? slugifyOrganic(input.cluster.replace(/s$/, "")) : "";
  const questionSlug = input.question ? slugifyOrganic(questionSlugFromQuestion(input.question, clusterSlug)) : "";
  const type = input.content_type ?? (input.question ? "EVERGREEN_QUESTION" : input.cluster ? "CLUSTER_HUB" : "PILLAR");
  const segments = [CRE_ROOT, pillarSlug];
  if (type === "CLUSTER_HUB" && clusterSlug && clusterSlug !== pillarSlug) segments.push(clusterSlug);
  else if (type === "EVERGREEN_QUESTION" && questionSlug) segments.push(questionSlug);
  else if (type !== "PILLAR") {
    if (clusterSlug && clusterSlug !== pillarSlug) segments.push(clusterSlug);
    if (questionSlug && questionSlug !== clusterSlug) segments.push(questionSlug);
  }
  const path = `/${segments.join("/")}/`;
  const breadcrumbs = ["Commercial Real Estate", titleCase(input.pillar)];
  if (input.cluster && type !== "EVERGREEN_QUESTION") breadcrumbs.push(titleCase(input.cluster));
  if (input.question && type === "EVERGREEN_QUESTION") breadcrumbs.push(input.question.replace(/\?+$/, ""));
  return {
    path,
    slug: segments[segments.length - 1] ?? pillarSlug,
    breadcrumbs,
    parent_path: segments.length > 2 ? `/${segments.slice(0, -1).join("/")}/` : `/${CRE_ROOT}/`,
    depth: segments.length,
    distinct: true,
  };
}

function questionSlugFromQuestion(question: string, clusterSlug: string): string {
  const slug = slugifyOrganic(question);
  if (slug.startsWith("how-is-") || slug.startsWith("how-does-") || slug.startsWith("what-is-") || slug.startsWith("why-")) {
    return slug;
  }
  if (clusterSlug && slug === clusterSlug) return slug;
  return slug;
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function planOccupancyNpvLiveUrl(input: {
  question: string;
  live_hub?: string;
}): PlannedOrganicUrl {
  const hub = (input.live_hub ?? "/commercial-lease-npv").replace(/\/+$/, "");
  const questionSlug = slugifyOrganic(input.question);
  const path = `${hub}/${questionSlug}/`.replace(/\/{2,}/g, "/");
  return {
    path: path.startsWith("/") ? path : `/${path}`,
    slug: questionSlug,
    breadcrumbs: ["Home", "Commercial lease NPV", input.question.replace(/\?+$/, "")],
    parent_path: `${hub}/`,
    depth: path.split("/").filter(Boolean).length,
    distinct: true,
  };
}

export function evaluateOrganicUrlHierarchyGate(url: PlannedOrganicUrl): OrganicNamedGate {
  const reasons: string[] = [];
  if (!url.path.startsWith("/") || !url.path.endsWith("/")) reasons.push("unstable_path");
  if (url.depth < 2 || url.depth > 5) reasons.push("inappropriate_depth");
  if (url.breadcrumbs.length < 2) reasons.push("broken_breadcrumbs");
  if (/--/.test(url.path) || /\/\//.test(url.path.slice(1))) reasons.push("dirty_slug");
  const tokens = url.path.split("/").filter(Boolean);
  const repeats = tokens.filter((token, index) => tokens.indexOf(token) !== index);
  if (repeats.length) reasons.push("keyword_repetition");
  return {
    gate: ORGANIC_URL_HIERARCHY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}
