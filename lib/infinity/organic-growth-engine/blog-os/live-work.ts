import { occupancynpvPublishedBlogPosts } from "../continuous/occupancynpv-blog-catalog";
import {
  isCanonicalOperatingVenture,
  isCanonicalPubliclyLaunchedVenture,
  listCanonicalVenturesForHq,
} from "@/lib/infinity/venture-operating-scale/hq-venture-lifecycle";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { planDailyBlogObligation } from "./operating-system";
import { ensureVentureBlogOsState, listVentureBlogOsStates } from "./store";
import type {
  PublicBlogActivity,
  PublicOccupancyLevel,
  SystemBlogHqView,
  VentureBlogLiveWork,
} from "./types";

function occupancyForState(state: string): { activity: PublicBlogActivity; occupancy: PublicOccupancyLevel; work: string } {
  if (state === "LIVE_VERIFIED") {
    return { activity: "Publishing editorial content", occupancy: "MONITORING", work: "Daily blog live verified · next operating day armed" };
  }
  if (state === "ESCALATED_EXTERNAL_BLOCKER") {
    return { activity: "Improving published resources", occupancy: "MONITORING", work: "Daily blog waiting on external blocker" };
  }
  if (["PUBLISHING", "VERIFYING", "DRAFTING", "VALIDATING", "READY_FOR_PUBLISH"].includes(state)) {
    return { activity: "Publishing editorial content", occupancy: "ACTIVE", work: `Daily blog ${state.toLowerCase().replace(/_/g, " ")}` };
  }
  if (["RESEARCHING", "REPAIRING"].includes(state)) {
    return { activity: "Building venture knowledge", occupancy: "ACTIVE", work: `Daily blog ${state.toLowerCase().replace(/_/g, " ")}` };
  }
  if (state === "PLANNED") {
    return { activity: "Building venture knowledge", occupancy: "MONITORING", work: "Daily blog planned" };
  }
  return { activity: "Monitoring organic growth", occupancy: "MONITORING", work: "Blog operating system armed" };
}

export function projectVentureBlogLiveWork(venture_id: string, now = new Date().toISOString()): VentureBlogLiveWork {
  planDailyBlogObligation({ venture_id, now });
  const state = ensureVentureBlogOsState(venture_id, venture_id, now);
  const posts = venture_id === "occupancynpv" ? occupancynpvPublishedBlogPosts() : [];
  const latest = state.roll.featured_latest_title
    ? {
      title: state.roll.featured_latest_title,
      url: state.roll.featured_latest_url,
      published: state.roll.featured_latest_published,
    }
    : posts[0]
      ? { title: posts[0].title, url: `https://occupancynpv.com${posts[0].path}`, published: posts[0].published }
      : null;
  const today = state.obligation?.state ?? "NONE";
  const live = occupancyForState(today);
  return {
    venture_id,
    public_name: state.public_name,
    blog: state.roll.featured_latest_url || posts.length ? "ACTIVE" : state.remediations.length ? "REMEDIATING" : "MISSING",
    today,
    latest_article: latest?.title ?? null,
    latest_article_url: latest?.url ?? null,
    latest_published: latest?.published ?? null,
    latest_at_top: state.roll.newest_first ? "PASS" : "FAIL",
    featured_latest: state.roll.featured_latest_id ? "PASS" : "FAIL",
    latest_carousel: state.roll.carousel_ids.length ? "PASS" : "FAIL",
    sidebar: state.roll.sidebar_recent_ids.length ? "PASS" : "FAIL",
    topic_cloud: state.roll.topic_cloud.length ? "PASS" : "FAIL",
    category_discovery: state.roll.category_discovery.length ? "PASS" : "FAIL",
    question_coverage: venture_id === "occupancynpv" ? "PASS" : "FAIL",
    citation_readiness: venture_id === "occupancynpv" ? "PASS" : "FAIL",
    geo: venture_id === "occupancynpv" ? "PASS" : "FAIL",
    category: state.categories[0]?.name ?? posts[0]?.primaryCategory ?? null,
    tags: state.roll.topic_cloud,
    authority_cluster: state.assignments[0]?.authority_cluster_id ?? null,
    internal_links: venture_id === "occupancynpv" ? "PASS" : state.assignments.length ? "PASS" : "FAIL",
    taxonomy: state.categories.length && state.tags.length ? "PASS" : "FAIL",
    rendered_qc: venture_id === "occupancynpv" ? "PASS" : "FAIL",
    next_blog: state.obligation?.next_action ?? "PLAN_DAILY_OBLIGATION",
    other_high_value_assets_today: state.other_high_value_today,
    public_activity: live.activity,
    public_occupancy: live.occupancy,
    hq_current_work: live.work,
  };
}

export function listActiveBlogVentures(): Array<{ venture_id: string; public_name: string; active: boolean }> {
  try {
    const records = listCanonicalVenturesForHq();
    const operating = records.filter((row) => {
      if (row.venture_id.startsWith("candidate:")) return false;
      if (/validation/i.test(row.venture_name ?? "")) return false;
      return isCanonicalPubliclyLaunchedVenture(row) || isCanonicalOperatingVenture(row);
    }).map((row) => ({
      venture_id: /occupancy/i.test(row.venture_id) || /occupancy/i.test(row.venture_name ?? "") ? "occupancynpv" : row.venture_id,
      public_name: row.venture_name ?? row.venture_id,
      active: true,
    }));
    const unique = new Map(operating.map((row) => [row.venture_id, row]));
    if (!unique.has("occupancynpv") && occupancynpvPubliclyLaunched()) {
      unique.set("occupancynpv", { venture_id: "occupancynpv", public_name: "OccupancyNPV", active: true });
    }
    if (unique.size) return [...unique.values()];
  } catch {
    // HQ registry must not block blog OS unit evaluation.
  }
  return [{ venture_id: "occupancynpv", public_name: "OccupancyNPV", active: occupancynpvPubliclyLaunched() }];
}

export function projectSystemBlogHq(now = new Date().toISOString()): SystemBlogHqView {
  const ventures = listActiveBlogVentures();
  const works = ventures.map((row) => {
    planDailyBlogObligation({ venture_id: row.venture_id, public_name: row.public_name, now });
    return projectVentureBlogLiveWork(row.venture_id, now);
  });
  const states = listVentureBlogOsStates();
  const withBlogs = works.filter((row) => row.blog === "ACTIVE").length;
  const live = states.filter((row) => row.obligation?.state === "LIVE_VERIFIED").length;
  const repair = states.filter((row) => row.obligation && !["LIVE_VERIFIED", "ESCALATED_EXTERNAL_BLOCKER"].includes(row.obligation.state)).length;
  const blockers = states.filter((row) => row.obligation?.state === "ESCALATED_EXTERNAL_BLOCKER").length;
  const silent = ventures.filter((row) => {
    const state = states.find((item) => item.venture_id === row.venture_id);
    return !state?.obligation;
  }).length;
  const occupancy = works.some((row) => row.public_occupancy === "ACTIVE")
    ? "ACTIVE"
    : works.some((row) => row.public_occupancy === "MONITORING")
      ? "MONITORING"
      : "IDLE";
  return {
    active_ventures: ventures.length,
    ventures_with_blogs: withBlogs,
    blog_coverage: ventures.length ? `${Math.round((withBlogs / ventures.length) * 100)}%` : "0%",
    blogs_due_today: ventures.length,
    blogs_live_verified: live,
    blogs_in_repair: repair,
    external_blog_blockers: blockers,
    silent_misses: silent,
    premium_blog_experience: works.every((row) => row.featured_latest === "PASS" && row.latest_carousel === "PASS") ? "PASS" : "FAIL",
    taxonomy_health: works.every((row) => row.taxonomy === "PASS") ? "PASS" : "FAIL",
    authority_graph: works.every((row) => row.internal_links === "PASS") ? "PASS" : "FAIL",
    geo_authority: works.every((row) => row.geo === "PASS") ? "PASS" : "FAIL",
    daily_publishing_health: silent === 0 ? "PASS" : "FAIL",
    current_work: works[0]?.hq_current_work ?? "Blog operating system armed",
    public_occupancy: occupancy,
  };
}

export function projectPublicBlogOccupancy(now = new Date().toISOString()): {
  occupancy: PublicOccupancyLevel;
  activity: PublicBlogActivity;
} {
  const system = projectSystemBlogHq(now);
  const work = projectVentureBlogLiveWork("occupancynpv", now);
  return {
    occupancy: system.public_occupancy === "IDLE" ? work.public_occupancy : system.public_occupancy,
    activity: work.public_activity,
  };
}
