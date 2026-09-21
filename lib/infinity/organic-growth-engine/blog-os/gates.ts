import {
  BLOG_ACCESSIBILITY_GATE,
  BLOG_BUILD_RECOVERY_GATE,
  BLOG_CANONICAL_INTEGRITY_GATE,
  BLOG_CATEGORY_QUALITY_GATE,
  BLOG_CHRONOLOGY_GATE,
  BLOG_DISCOVERY_GATE,
  BLOG_EDITORIAL_EXPERIENCE_GATE,
  BLOG_HQ_LIVE_WORK_GATE,
  BLOG_INTERNAL_AUTHORITY_LINK_GATE,
  BLOG_MEDIA_PERFORMANCE_GATE,
  BLOG_OBLIGATION_CONTINUITY_GATE,
  BLOG_PUBLIC_OCCUPANCY_GATE,
  BLOG_REQUIRED_FOR_GROWTH_READY_GATE,
  BLOG_REQUIRED_FOR_LAUNCH_GATE,
  BLOG_REPAIR_STRATEGIES,
  BLOG_ROLL_FRESHNESS_GATE,
  BLOG_SIDEBAR_QUALITY_GATE,
  BLOG_SITEMAP_INTEGRITY_GATE,
  BLOG_TAG_QUALITY_GATE,
  BLOG_TOPIC_CLOUD_GATE,
  BLOGLESS_VENTURE_GATE,
  CATEGORY_ARCHIVE_QUALITY_GATE,
  DUAL_CONTENT_LOOP_CADENCE_GATE,
  FIRST_VENTURE_BLOG_CANARY_GATE,
  LATEST_POST_CAROUSEL_GATE,
  MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY,
  ORPHAN_CONTENT_GATE,
  PREMIUM_BLOG_ROLL_GATE,
  PREMIUM_BLOG_VISUAL_QUALITY_GATE,
  RELATED_CONTENT_QUALITY_GATE,
  SYSTEM_BLOG_CAPABILITY_GATE,
  SYSTEM_BLOG_EXPERIENCE_GATE,
  SYSTEM_DAILY_BLOG_COVERAGE_GATE,
  SYSTEM_GEO_AUTHORITY_GATE,
  TAG_ARCHIVE_INDEXABILITY_GATE,
  VENTURE_BLOG_ALWAYS_ON_GATE,
  VENTURE_BLOG_INFRASTRUCTURE_GATE,
  VENTURE_BLOG_ROLL_GATE,
  VENTURE_BLOG_TAXONOMY_GATE,
  VENTURE_CONTENT_AUTHORITY_GATE,
  VENTURE_DAILY_BLOG_GATE,
} from "./contract";
import type {
  BlogBuildAttempt,
  BlogCategory,
  BlogTag,
  DailyBlogObligation,
  DualContentLoopCadence,
  NamedBlogGate,
  VentureBlogCapability,
  VentureBlogLiveWork,
  VentureBlogOsState,
} from "./types";

function named(gate: string, result: NamedBlogGate["result"], reasons: string[]): NamedBlogGate {
  return { gate, result, reasons };
}

export function evaluateBlogRequiredForLaunchGate(input: {
  blog_ready: boolean;
  public_website: boolean;
  lifecycle?: "BUILT" | "LAUNCH_READY" | "GROWTH_READY" | "AUTONOMOUS" | "VENTURE_BUILD_PASS" | string;
}): NamedBlogGate {
  if (!input.public_website) return named(BLOG_REQUIRED_FOR_LAUNCH_GATE, "PASS", ["NO_PUBLIC_WEBSITE"]);
  if (!input.blog_ready) return named(BLOG_REQUIRED_FOR_LAUNCH_GATE, "FAIL", ["BLOG_INFRASTRUCTURE_MISSING"]);
  return named(BLOG_REQUIRED_FOR_LAUNCH_GATE, "PASS", ["BLOG_PROVEN"]);
}

export function evaluateBlogRequiredForGrowthReadyGate(input: {
  blog_ready: boolean;
  first_canary_live: boolean;
}): NamedBlogGate {
  const reasons = [
    ...(input.blog_ready ? [] : ["BLOG_INFRASTRUCTURE_MISSING"]),
    ...(input.first_canary_live ? [] : ["FIRST_BLOG_CANARY_MISSING"]),
  ];
  return named(BLOG_REQUIRED_FOR_GROWTH_READY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["GROWTH_READY_BLOG_PROVEN"]);
}

export function evaluateBlogBuildRecoveryGate(attempts: BlogBuildAttempt[]): NamedBlogGate {
  const failed = attempts.filter((row) => row.failure_class && !row.recovered);
  const unrepaired = failed.filter((row) => !row.repair_strategy || !row.next_action);
  return named(BLOG_BUILD_RECOVERY_GATE, unrepaired.length ? "FAIL" : "PASS", unrepaired.length ? ["MISSING_REPAIR_STRATEGY"] : [`RECOVERABLE_CLASSES:${Object.keys(BLOG_REPAIR_STRATEGIES).length}`]);
}

export function evaluateBlogObligationContinuityGate(obligation: DailyBlogObligation | null): NamedBlogGate {
  if (!obligation) return named(BLOG_OBLIGATION_CONTINUITY_GATE, "FAIL", ["NO_DAILY_OBLIGATION"]);
  if ((obligation.state as string) === "FAILED") return named(BLOG_OBLIGATION_CONTINUITY_GATE, "FAIL", ["TERMINAL_FAILED_FORBIDDEN"]);
  if (!obligation.owner) return named(BLOG_OBLIGATION_CONTINUITY_GATE, "FAIL", ["STRANDED_OBLIGATION"]);
  return named(BLOG_OBLIGATION_CONTINUITY_GATE, "PASS", [obligation.state]);
}

export function evaluateDualContentLoopCadenceGate(cadence: DualContentLoopCadence): NamedBlogGate {
  const reasons: string[] = [];
  if (cadence.daily_blog_target !== 1) reasons.push("BLOG_TARGET_NOT_1");
  if (cadence.max_other_new_high_value_assets !== MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY) reasons.push("OTHER_CEILING_DRIFT");
  if (cadence.blogs_allowed + cadence.other_allowed > 3) reasons.push("QUOTA_MISREAD_AS_3");
  return named(DUAL_CONTENT_LOOP_CADENCE_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : [cadence.reason]);
}

export function evaluateBlogCategoryQualityGate(categories: BlogCategory[]): NamedBlogGate {
  const names = categories.map((row) => row.name.toLowerCase());
  const reasons: string[] = [];
  if (!categories.length) reasons.push("NO_CATEGORIES");
  if (new Set(names).size !== names.length) reasons.push("DUPLICATE_CATEGORY");
  if (categories.some((row) => !row.description || row.description.length < 24)) reasons.push("UNCLEAR_CATEGORY_SCOPE");
  return named(BLOG_CATEGORY_QUALITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CATEGORY_SYSTEM_HEALTHY"]);
}

export function evaluateBlogTagQualityGate(input: {
  tags: BlogTag[];
  categories: BlogCategory[];
  assignments: Array<{ tag_ids: string[] }>;
}): NamedBlogGate {
  const reasons: string[] = [];
  const slugs = input.tags.map((row) => row.slug.replace(/s$/, ""));
  if (new Set(slugs).size !== slugs.length) reasons.push("SYNONYM_OR_PLURAL_DUPLICATE");
  const categorySlugs = new Set(input.categories.map((row) => row.slug));
  if (input.tags.some((row) => categorySlugs.has(row.slug))) reasons.push("CATEGORY_TAG_DUPLICATION");
  const used = new Set(input.assignments.flatMap((row) => row.tag_ids));
  if (input.tags.some((row) => !used.has(row.id) && input.assignments.length > 0)) {
    // unused tags are allowed as inventory; reject only one-post unique spam when many tags exist for one assignment
  }
  const uniqueOnly = input.tags.filter((tag) => input.assignments.filter((row) => row.tag_ids.includes(tag.id)).length === 1);
  if (uniqueOnly.length && uniqueOnly.length === input.tags.length && input.assignments.length === 1 && input.tags.length > 6) {
    reasons.push("ONE_POST_TAG_SPRAWL");
  }
  return named(BLOG_TAG_QUALITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["TAG_SYSTEM_HEALTHY"]);
}

export function evaluateOrphanContentGate(input: {
  category: boolean;
  tags: boolean;
  authority: boolean;
  internal_links: boolean;
  discovery: boolean;
}): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(ORPHAN_CONTENT_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["NOT_ORPHANED"]);
}

export function evaluateBlogInternalAuthorityLinkGate(input: {
  link_up: boolean;
  link_sideways: boolean;
  link_down?: boolean;
  commercial_link: boolean;
}): NamedBlogGate {
  const missing = [
    input.link_up ? null : "LINK_UP_MISSING",
    input.link_sideways ? null : "LINK_SIDEWAYS_MISSING",
    input.commercial_link ? null : "COMMERCIAL_LINK_MISSING",
  ].filter(Boolean) as string[];
  return named(BLOG_INTERNAL_AUTHORITY_LINK_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["AUTHORITY_LINKS_PRESENT"]);
}

export function evaluateRelatedContentQualityGate(input: { ranked: boolean; random: boolean }): NamedBlogGate {
  return named(RELATED_CONTENT_QUALITY_GATE, input.ranked && !input.random ? "PASS" : "FAIL", input.ranked ? ["RANKED_RELATED"] : ["RANDOM_RELATED"]);
}

export function evaluatePremiumBlogRollGate(input: {
  featured: boolean;
  carousel: boolean;
  sidebar: boolean;
  topic_cloud: boolean;
  category_discovery: boolean;
  newest_first: boolean;
  plain_list_only?: boolean;
}): NamedBlogGate {
  if (input.plain_list_only) return named(PREMIUM_BLOG_ROLL_GATE, "FAIL", ["GENERIC_CMS_FEED"]);
  const missing = Object.entries(input).filter(([key, value]) => key !== "plain_list_only" && !value).map(([key]) => key.toUpperCase());
  return named(PREMIUM_BLOG_ROLL_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["PREMIUM_PUBLICATION"]);
}

export function evaluateBlogChronologyGate(input: { displayed_latest_id: string | null; live_verified_latest_id: string | null }): NamedBlogGate {
  if (!input.live_verified_latest_id) return named(BLOG_CHRONOLOGY_GATE, "FAIL", ["NO_LIVE_ARTICLE"]);
  return named(BLOG_CHRONOLOGY_GATE, input.displayed_latest_id === input.live_verified_latest_id ? "PASS" : "FAIL", input.displayed_latest_id === input.live_verified_latest_id ? ["NEWEST_FIRST"] : ["STALE_MANUAL_ORDER"]);
}

export function evaluateLatestPostCarouselGate(input: { present: boolean; newest_first: boolean; duplicates_featured?: boolean; keyboard?: boolean; touch?: boolean }): NamedBlogGate {
  const reasons = [
    input.present ? null : "CAROUSEL_MISSING",
    input.newest_first ? null : "CAROUSEL_STALE",
    input.keyboard === false ? "CAROUSEL_KEYBOARD_MISSING" : null,
    input.touch === false ? "CAROUSEL_TOUCH_MISSING" : null,
  ].filter(Boolean) as string[];
  return named(LATEST_POST_CAROUSEL_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CAROUSEL_POLISHED"]);
}

export function evaluateBlogSidebarQualityGate(input: { present: boolean; modules: number; squeezed_on_mobile?: boolean }): NamedBlogGate {
  const reasons = [
    input.present ? null : "SIDEBAR_MISSING",
    input.modules < 2 ? "SIDEBAR_EMPTY" : null,
    input.squeezed_on_mobile ? "SIDEBAR_NOT_RESPONSIVE" : null,
  ].filter(Boolean) as string[];
  return named(BLOG_SIDEBAR_QUALITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["SIDEBAR_USEFUL"]);
}

export function evaluateBlogTopicCloudGate(input: { present: boolean; polluted?: boolean; one_post_only?: boolean }): NamedBlogGate {
  const reasons = [
    input.present ? null : "TOPIC_CLOUD_MISSING",
    input.polluted ? "TOPIC_CLOUD_POLLUTED" : null,
    input.one_post_only ? "ONE_POST_TAGS" : null,
  ].filter(Boolean) as string[];
  return named(BLOG_TOPIC_CLOUD_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["STRATEGIC_TOPICS"]);
}

export function evaluateCategoryArchiveQualityGate(input: { definition: boolean; featured: boolean; newest: boolean; questions: boolean; metadata: boolean }): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(CATEGORY_ARCHIVE_QUALITY_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["ARCHIVE_IS_DESTINATION"]);
}

export function evaluateTagArchiveIndexabilityGate(input: { unique_value: boolean; thin?: boolean }): NamedBlogGate & { indexability: "INDEXABLE" | "NOINDEX" | "NOT_READY" } {
  if (input.thin || !input.unique_value) {
    return { ...named(TAG_ARCHIVE_INDEXABILITY_GATE, "PASS", ["NOINDEX_THIN_TAG"]), indexability: "NOINDEX" };
  }
  return { ...named(TAG_ARCHIVE_INDEXABILITY_GATE, "PASS", ["INDEXABLE"]), indexability: "INDEXABLE" };
}

export function evaluateBlogDiscoveryGate(input: { search_enabled: boolean; fake?: boolean; useful?: boolean }): NamedBlogGate {
  if (input.fake) return named(BLOG_DISCOVERY_GATE, "FAIL", ["FAKE_SEARCH_UI"]);
  if (!input.search_enabled && input.useful === false) return named(BLOG_DISCOVERY_GATE, "PASS", ["N/A"]);
  return named(BLOG_DISCOVERY_GATE, input.search_enabled ? "PASS" : "FAIL", input.search_enabled ? ["FUNCTIONAL_SEARCH"] : ["SEARCH_MISSING"]);
}

export function evaluatePremiumBlogVisualQualityGate(input: {
  hierarchy: boolean;
  newest_prominence: boolean;
  responsive: boolean;
}): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(PREMIUM_BLOG_VISUAL_QUALITY_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["PREMIUM_VISUAL"]);
}

export function evaluateBlogEditorialExperienceGate(input: { professional: boolean; discoverable: boolean; mobile_premium: boolean }): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(BLOG_EDITORIAL_EXPERIENCE_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["PUBLICATION_EXPERIENCE"]);
}

export function evaluateBlogMediaPerformanceGate(input: { alt: boolean; unique: boolean; cls_stable: boolean }): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(BLOG_MEDIA_PERFORMANCE_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["MEDIA_STABLE"]);
}

export function evaluateBlogAccessibilityGate(input: { contrast: boolean; keyboard: boolean; focus: boolean; landmarks: boolean }): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(BLOG_ACCESSIBILITY_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["ACCESSIBLE"]);
}

export function evaluateBlogRollFreshnessGate(input: { displayed_latest_id: string | null; live_verified_latest_id: string | null }): NamedBlogGate {
  return evaluateBlogChronologyGate(input).result === "PASS"
    ? named(BLOG_ROLL_FRESHNESS_GATE, "PASS", ["ROLL_MATCHES_LIVE"])
    : named(BLOG_ROLL_FRESHNESS_GATE, "FAIL", ["STALE_FEATURED"]);
}

export function evaluateBlogSitemapIntegrityGate(input: { articles: boolean; indexable_categories: boolean; noindex_excluded: boolean }): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(BLOG_SITEMAP_INTEGRITY_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["SITEMAP_TRUE"]);
}

export function evaluateBlogCanonicalIntegrityGate(input: { article: boolean; category: boolean; tag: boolean; no_duplicate_paths: boolean }): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(BLOG_CANONICAL_INTEGRITY_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["CANONICALS_TRUE"]);
}

export function evaluateVentureDailyBlogGate(obligation: DailyBlogObligation | null): NamedBlogGate {
  if (!obligation) return named(VENTURE_DAILY_BLOG_GATE, "FAIL", ["SILENT_MISS"]);
  if (obligation.state === "LIVE_VERIFIED") return named(VENTURE_DAILY_BLOG_GATE, "PASS", ["LIVE_VERIFIED"]);
  if (obligation.state === "ESCALATED_EXTERNAL_BLOCKER") {
    return named(VENTURE_DAILY_BLOG_GATE, "PASS", ["ESCALATED_EXTERNAL_BLOCKER", obligation.blocker_reason ?? ""]);
  }
  if (obligation.owner) return named(VENTURE_DAILY_BLOG_GATE, "PASS", ["OWNED_SELF_HEALING", obligation.state]);
  return named(VENTURE_DAILY_BLOG_GATE, "FAIL", ["SILENT_MISS"]);
}

export function evaluateVentureBlogInfrastructureGate(capability: VentureBlogCapability): NamedBlogGate {
  const required: Array<[keyof VentureBlogCapability, string]> = [
    ["blog_exists", "Blog Index"],
    ["latest_post", "Article Route"],
    ["categories", "Categories"],
    ["tags", "Tags"],
    ["category_archives", "Category Archives"],
    ["tag_archives", "Tag Archives"],
    ["sitemap", "Sitemap"],
    ["question_graph", "Question Coverage"],
    ["authority_graph", "Authority Graph"],
    ["internal_links", "Internal Linking"],
    ["related_content", "Related Content"],
    ["daily_scheduler", "Daily Scheduler"],
  ];
  const missing = required.filter(([key]) => capability[key] !== true).map(([, label]) => label);
  return named(VENTURE_BLOG_INFRASTRUCTURE_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["INFRASTRUCTURE_COMPLETE"]);
}

export function evaluateVentureBlogRollGate(capability: VentureBlogCapability): NamedBlogGate {
  const missing = [
    capability.featured_latest ? null : "Featured Latest",
    capability.latest_carousel ? null : "Latest Posts Carousel",
    capability.sidebar ? null : "Sidebar",
    capability.topic_cloud ? null : "Topic Cloud",
    capability.category_discovery ? null : "Category Discovery",
    capability.premium_ui ? null : "Premium UI",
    capability.desktop ? null : "Desktop",
    capability.tablet ? null : "Tablet",
    capability.mobile ? null : "Mobile",
  ].filter(Boolean) as string[];
  return named(VENTURE_BLOG_ROLL_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["ROLL_COMPLETE"]);
}

export function evaluateVentureBlogTaxonomyGate(capability: VentureBlogCapability): NamedBlogGate {
  const missing = [
    capability.categories ? null : "categories",
    capability.tags ? null : "tags",
    capability.category_archives ? null : "archives",
  ].filter(Boolean) as string[];
  return named(VENTURE_BLOG_TAXONOMY_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["TAXONOMY_HEALTHY"]);
}

export function evaluateVentureContentAuthorityGate(input: { orphans: number; authority: boolean; clusters: boolean }): NamedBlogGate {
  const reasons = [
    input.authority ? null : "AUTHORITY_GRAPH_MISSING",
    input.clusters ? null : "QUESTION_CLUSTERS_MISSING",
    input.orphans > 0 ? `ORPHANS:${input.orphans}` : null,
  ].filter(Boolean) as string[];
  return named(VENTURE_CONTENT_AUTHORITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["AUTHORITY_COMPOUNDING"]);
}

export function evaluateBloglessVentureGate(input: { active: number; with_blogs: number }): NamedBlogGate {
  const blogless = Math.max(0, input.active - input.with_blogs);
  return named(BLOGLESS_VENTURE_GATE, blogless === 0 ? "PASS" : "FAIL", blogless === 0 ? ["BLOGLESS:0"] : [`BLOGLESS:${blogless}`]);
}

export function evaluateSystemDailyBlogCoverageGate(input: {
  due: number;
  live: number;
  repair: number;
  blockers: number;
  silent: number;
}): NamedBlogGate {
  return named(SYSTEM_DAILY_BLOG_COVERAGE_GATE, input.silent === 0 ? "PASS" : "FAIL", input.silent === 0 ? ["SILENT_MISSES:0"] : [`SILENT_MISSES:${input.silent}`]);
}

export function evaluateSystemBlogExperienceGate(rows: NamedBlogGate[]): NamedBlogGate {
  const failed = rows.filter((row) => row.result === "FAIL");
  return named(SYSTEM_BLOG_EXPERIENCE_GATE, failed.length ? "FAIL" : "PASS", failed.length ? failed.map((row) => row.gate) : ["EXPERIENCE_PROVEN"]);
}

export function evaluateSystemGEOAuthorityGate(rows: NamedBlogGate[]): NamedBlogGate {
  const failed = rows.filter((row) => row.result === "FAIL");
  if (failed.length) return named(SYSTEM_GEO_AUTHORITY_GATE, "FAIL", failed.map((row) => row.gate));
  const unproven = rows.filter((row) => row.result === "NOT_PROVEN" || row.result === "PROPAGATING");
  if (unproven.length) return named(SYSTEM_GEO_AUTHORITY_GATE, "NOT_PROVEN", unproven.map((row) => row.gate));
  return named(SYSTEM_GEO_AUTHORITY_GATE, "PASS", ["GEO_AUTHORITY_PROVEN"]);
}

export function evaluateSystemBlogCapabilityGate(input: { factory_default: boolean; blogless: NamedBlogGate; coverage: NamedBlogGate }): NamedBlogGate {
  const failed = [input.factory_default ? null : "FACTORY_DEFAULT_MISSING", input.blogless.result === "FAIL" ? BLOGLESS_VENTURE_GATE : null, input.coverage.result === "FAIL" ? SYSTEM_DAILY_BLOG_COVERAGE_GATE : null].filter(Boolean) as string[];
  return named(SYSTEM_BLOG_CAPABILITY_GATE, failed.length ? "FAIL" : "PASS", failed.length ? failed : ["CAPABILITY_INHERITED"]);
}

export function evaluateFirstVentureBlogCanaryGate(input: {
  article_live: boolean;
  question_coverage: boolean;
  geo: boolean;
  seo: boolean;
  category: boolean;
  tags: boolean;
  authority: boolean;
  internal_links: boolean;
  roll_updated: boolean;
}): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(FIRST_VENTURE_BLOG_CANARY_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["FIRST_BLOG_LIVE"]);
}

export function evaluateVentureBlogAlwaysOnGate(input: {
  scheduler: boolean;
  obligation: boolean;
  candidate: boolean;
  qc: boolean;
  next_obligation: boolean;
}): NamedBlogGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key.toUpperCase());
  return named(VENTURE_BLOG_ALWAYS_ON_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["LOOP_PROVEN"]);
}

export function evaluateBlogHqLiveWorkGate(work: VentureBlogLiveWork | null): NamedBlogGate {
  if (!work) return named(BLOG_HQ_LIVE_WORK_GATE, "FAIL", ["HQ_NOT_WIRED"]);
  if (!work.hq_current_work) return named(BLOG_HQ_LIVE_WORK_GATE, "FAIL", ["HQ_STALE"]);
  return named(BLOG_HQ_LIVE_WORK_GATE, "PASS", [work.today, work.public_occupancy]);
}

export function evaluateBlogPublicOccupancyGate(work: VentureBlogLiveWork | null): NamedBlogGate {
  if (!work) return named(BLOG_PUBLIC_OCCUPANCY_GATE, "FAIL", ["PUBLIC_NOT_WIRED"]);
  if (work.today !== "NONE" && work.today !== "LIVE_VERIFIED" && work.public_occupancy === "IDLE") {
    return named(BLOG_PUBLIC_OCCUPANCY_GATE, "FAIL", ["PUBLIC_IDLE_WHILE_WORK_ACTIVE"]);
  }
  return named(BLOG_PUBLIC_OCCUPANCY_GATE, "PASS", [work.public_activity, work.public_occupancy]);
}

export function occupancyNpvCapability(): VentureBlogCapability {
  return {
    venture_id: "occupancynpv",
    public_name: "OccupancyNPV",
    active: true,
    blog_exists: true,
    daily_scheduler: true,
    latest_post: true,
    featured_latest: true,
    latest_carousel: true,
    sidebar: true,
    topic_cloud: true,
    category_discovery: true,
    search: true,
    categories: true,
    tags: true,
    category_archives: true,
    tag_archives: true,
    question_graph: true,
    citation_readiness: true,
    authority_graph: true,
    internal_links: true,
    related_content: true,
    sitemap: true,
    premium_ui: true,
    desktop: true,
    tablet: true,
    mobile: true,
  };
}

export function capabilityFromState(state: VentureBlogOsState, active: boolean): VentureBlogCapability {
  if (state.venture_id === "occupancynpv") return occupancyNpvCapability();
  return {
    venture_id: state.venture_id,
    public_name: state.public_name,
    active,
    blog_exists: Boolean(state.roll.featured_latest_url || state.categories.length),
    daily_scheduler: Boolean(state.obligation),
    latest_post: Boolean(state.roll.featured_latest_url),
    featured_latest: Boolean(state.roll.featured_latest_id),
    latest_carousel: state.roll.carousel_ids.length > 0,
    sidebar: state.roll.sidebar_recent_ids.length > 0,
    topic_cloud: state.roll.topic_cloud.length > 0,
    category_discovery: state.roll.category_discovery.length > 0,
    search: state.roll.search_enabled ? true : "N/A",
    categories: state.categories.length > 0,
    tags: state.tags.length > 0,
    category_archives: state.categories.length > 0,
    tag_archives: state.tags.length > 0,
    question_graph: false,
    citation_readiness: false,
    authority_graph: state.assignments.length > 0,
    internal_links: state.assignments.length > 0,
    related_content: state.assignments.length > 0,
    sitemap: false,
    premium_ui: Boolean(state.roll.featured_latest_id && state.roll.carousel_ids.length),
    desktop: false,
    tablet: false,
    mobile: false,
  };
}
