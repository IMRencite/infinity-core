import {
  FOUNDER_DAILY_REPORT,
  FOUNDER_HQ_TIMEZONE,
  type FounderDailyOperationsReport,
  type FounderDailyReportItem,
  type FounderDailyReportSection,
  type FounderDailyReportSources,
} from "./types";
import { portfolioOperatingFounderDailyItems } from "./portfolio-operations-v1";

export function reportDateInTimezone(now: string, timezone: string = FOUNDER_HQ_TIMEZONE): string {
  const date = new Date(now);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return parts;
}

export function reportIdFor(date: string, version = 1): string {
  return `daily:${date}:v${version}`;
}

export function generateFounderDailyReport(sources: FounderDailyReportSources, prior?: FounderDailyOperationsReport | null): FounderDailyOperationsReport {
  const timezone = sources.timezone ?? FOUNDER_HQ_TIMEZONE;
  const report_date = reportDateInTimezone(sources.now, timezone);
  const today = report_date === reportDateInTimezone(sources.now, timezone);
  const version = prior && prior.report_date === report_date ? prior.version : 1;
  const items: FounderDailyReportItem[] = [];
  const pages = sources.organic_pages_published ?? 0;
  const blogs = sources.blogs_published ?? 0;
  const refreshed = sources.blogs_refreshed ?? 0;
  const sent = sources.outreach_sent ?? 0;
  const prospects = sources.prospects_added ?? 0;
  const deployments = sources.deployments ?? [];
  if (pages) items.push(item("organic", "COMPLETED", `Published ${pages} organic page${pages === 1 ? "" : "s"}`, ["organic-growth"]));
  if (blogs) items.push(item("organic", "COMPLETED", `Published ${blogs} blog resource${blogs === 1 ? "" : "s"}`, ["organic-growth-blog"]));
  if (refreshed) items.push(item("organic", "COMPLETED", `Expanded ${refreshed} blog resource${refreshed === 1 ? "" : "s"}`, ["organic-growth-blog-refresh"]));
  for (const event of sources.blog_ux_events ?? []) {
    items.push(item("organic", "COMPLETED", event, [`blog-ux:${event}`]));
  }
  for (const event of sources.blog_qc_events ?? []) {
    items.push(item("organic", "COMPLETED", event, [`blog-qc:${event}`]));
  }
  if (sources.organic_rejects) items.push(item("organic", "COMPLETED", `${sources.organic_rejects} content item${sources.organic_rejects === 1 ? "" : "s"} rejected by QC`, ["organic-qc"]));
  if (sent) items.push(item("sales", "COMPLETED", `Outreach accepted/sent: ${sent}`, ["outbound"]));
  for (const event of sources.outbound_events ?? []) {
    items.push(item("sales", "COMPLETED", event, [`outbound-event:${event}`]));
  }
  if (prospects) items.push(item("prospects", "COMPLETED", `Prospect records added: ${prospects}`, ["prospect-intelligence"]));
  if (sources.discovery_last_scanner_at) {
    items.push(
      item(
        "discovery",
        "COMPLETED",
        `Last opportunity scanner: ${sources.discovery_last_scanner_at}`,
        ["venture-discovery-scanner"],
      ),
    );
  }
  if (sources.discovery_next_scheduled_scan) {
    items.push(
      item(
        "discovery",
        "PLANNED",
        `Next scheduled scanner: ${sources.discovery_next_scheduled_scan}`,
        ["venture-discovery-schedule"],
      ),
    );
  }
  if (sources.discovery_fresh_candidate_count != null && sources.discovery_fresh_candidate_count > 0) {
    items.push(
      item(
        "discovery",
        "COMPLETED",
        `Fresh discovery candidates (latest cycle): ${sources.discovery_fresh_candidate_count}`,
        ["venture-discovery-candidates"],
      ),
    );
  }
  if (sources.discovery_build_decision_count != null) {
    items.push(
      item(
        "discovery",
        sources.discovery_build_decision_count > 0 ? "COMPLETED" : "PLANNED",
        `BUILD decisions (latest selection): ${sources.discovery_build_decision_count}`,
        ["venture-discovery-build-decisions"],
      ),
    );
  }
  if (sources.discovery_factory_handoff) {
    items.push(
      item("discovery", "IN_PROGRESS", sources.discovery_factory_handoff, ["build-factory-handoff"]),
    );
  }
  if (sources.discovery_scanner_errors) {
    items.push(item("discovery", "BLOCKED", sources.discovery_scanner_errors, ["venture-discovery-error"]));
  }
  if (sources.discovery_validate_candidate_count != null) {
    items.push(
      item(
        "discovery",
        "PLANNED",
        `VALIDATE queue: ${sources.discovery_validate_candidate_count} candidate(s)`,
        ["venture-validate-queue"],
      ),
    );
  }
  if (sources.discovery_revalidation_due_count != null && sources.discovery_revalidation_due_count > 0) {
    items.push(
      item(
        "discovery",
        "IN_PROGRESS",
        `Due for autonomous revalidation: ${sources.discovery_revalidation_due_count}`,
        ["venture-revalidation-due"],
      ),
    );
  }
  for (const deployment of deployments) {
    items.push(item("deploy", "COMPLETED", `Deployment ${deployment.id} → ${deployment.target} (${deployment.status})`, [deployment.id], `/dashboard/builds`));
  }
  if (sources.portfolio_operating) {
    const po = sources.portfolio_operating;
    items.push(
      ...portfolioOperatingFounderDailyItems({
        ventures_operated: po.ventures_operated ?? 0,
        assets_considered: po.assets_considered ?? 0,
        assets_published: po.assets_published ?? 0,
        quality_holds: po.quality_holds ?? 0,
        self_heal_attempts: po.self_heal_attempts ?? 0,
        self_heal_recoveries: po.self_heal_recoveries ?? 0,
        product_concepts: po.product_concepts ?? 0,
        products_advanced_beyond_concept: po.products_advanced_beyond_concept ?? 0,
        blockers: po.blockers ?? [],
      }),
    );
  }
  if (sources.organic_in_progress) {
    items.push(item("organic", "IN_PROGRESS", `Organic queue working ${sources.organic_in_progress} item${sources.organic_in_progress === 1 ? "" : "s"}`, ["organic-queue"]));
  }
  for (const plan of sources.organic_planned ?? []) {
    items.push(item("organic", "PLANNED", plan, ["organic-plan"]));
  }
  for (const blocker of sources.blockers ?? []) {
    items.push(item("runtime", "BLOCKED", blocker, ["blocker"]));
  }
  const attention = (sources.founder_attention ?? []).map((title) => item("founder", "BLOCKED", title, ["founder-attention"], "/dashboard/governance"));
  if (!items.length && !attention.length) {
    items.push(item("runtime", "PLANNED", "Monitoring only. No fabricated accomplishments.", ["quiet-day"]));
  }
  const completed = items.filter((row) => row.status === "COMPLETED");
  const inProgress = items.filter((row) => row.status === "IN_PROGRESS");
  const planned = items.filter((row) => row.status === "PLANNED");
  const blocked = items.filter((row) => row.status === "BLOCKED");
  const sections: FounderDailyReportSection[] = [
    { id: "completed", title: "Completed", items: completed },
    { id: "in_progress", title: "In Progress", items: inProgress },
    { id: "planned", title: "Planned Today", items: planned },
    { id: "blocked", title: "Blocked", items: blocked },
    { id: "organic", title: "Organic Growth", items: items.filter((row) => row.engine === "organic") },
    { id: "sales", title: "Sales / Outreach", items: items.filter((row) => row.engine === "sales") },
    { id: "prospects", title: "Prospect Intelligence", items: items.filter((row) => row.engine === "prospects") },
    { id: "deployments", title: "Deployments", items: items.filter((row) => row.engine === "deploy") },
    { id: "portfolio", title: "Portfolio Operations", items: items.filter((row) => row.engine === "portfolio") },
    { id: "attention", title: "Founder Attention Needed", items: attention },
  ].filter((section) => section.items.length);
  const summary = completed.length
    ? `Infinity recorded ${completed.length} completed item${completed.length === 1 ? "" : "s"}, ${inProgress.length} in progress, ${planned.length} planned, and ${blocked.length + attention.length} blocked or founder-attention items.`
    : "Quiet operating day. Monitoring only. No fabricated accomplishments.";
  return {
    report_id: reportIdFor(report_date, version),
    report_date,
    timezone,
    status: today ? "LIVE" : prior?.status === "AMENDED" ? "AMENDED" : "FINAL",
    version,
    generated_at: prior?.generated_at ?? sources.now,
    updated_at: sources.now,
    finalized_at: today ? null : prior?.finalized_at ?? sources.now,
    summary,
    completed_count: completed.length,
    in_progress_count: inProgress.length,
    planned_count: planned.length,
    blocked_count: blocked.length + attention.length,
    venture_ids: sources.venture_ids ?? ["occupancynpv"],
    source_event_ids: items.flatMap((row) => row.source_ids),
    organic_pages: pages,
    blogs: blogs + refreshed,
    outreach_sent: sent,
    prospects_added: prospects,
    deployments: deployments.length,
    founder_attention: attention,
    treasury_verification: sources.treasury_verification ?? "UNKNOWN",
    sections,
  };
}

export function upsertDailyReport(existing: FounderDailyOperationsReport | null, next: FounderDailyOperationsReport): FounderDailyOperationsReport {
  if (!existing) return next;
  if (existing.report_date !== next.report_date) return next;
  if (existing.status === "FINAL" || existing.status === "AMENDED") {
    return { ...existing, version: existing.version };
  }
  const nextIds = new Set(next.source_event_ids);
  const priorItems = existing.sections.flatMap((section) => section.items);
  const extras = priorItems.filter((item, index) => {
    if (item.status !== "COMPLETED") return false;
    if (item.source_ids.every((id) => nextIds.has(id))) return false;
    return priorItems.findIndex((row) => row.item_id === item.item_id) === index;
  });
  if (!extras.length) {
    return {
      ...next,
      report_id: existing.report_id,
      version: existing.version,
      generated_at: existing.generated_at,
      blogs: Math.max(next.blogs, existing.blogs),
      organic_pages: Math.max(next.organic_pages, existing.organic_pages),
      deployments: Math.max(next.deployments, existing.deployments),
    };
  }
  const completed = [
    ...next.sections.find((section) => section.id === "completed")?.items ?? [],
    ...extras,
  ];
  const uniqueCompleted = completed.filter((item, index) => completed.findIndex((row) => row.item_id === item.item_id) === index);
  const sections = next.sections.map((section) => {
    if (section.id !== "completed") return section;
    return { ...section, items: uniqueCompleted };
  });
  if (!sections.some((section) => section.id === "completed") && uniqueCompleted.length) {
    sections.unshift({ id: "completed", title: "Completed", items: uniqueCompleted });
  }
  const uniqueDeploys = uniqueCompleted.filter((item) => item.engine === "deploy").length;
  const inferredBlogs = uniqueCompleted.filter((item) =>
    item.source_ids.some((id) => id === "organic-growth-blog" || id === "organic-growth-blog-refresh"),
  ).length;
  const inferredPages = uniqueCompleted.some((item) => item.source_ids.includes("organic-growth")) ? Math.max(existing.organic_pages, 1) : existing.organic_pages;
  return {
    ...next,
    report_id: existing.report_id,
    version: existing.version,
    generated_at: existing.generated_at,
    completed_count: uniqueCompleted.length,
    blogs: Math.max(next.blogs, existing.blogs, inferredBlogs),
    organic_pages: Math.max(next.organic_pages, existing.organic_pages, inferredPages),
    deployments: uniqueDeploys,
    source_event_ids: [...new Set([...next.source_event_ids, ...extras.flatMap((item) => item.source_ids)])],
    sections,
    summary: `Infinity recorded ${uniqueCompleted.length} completed item${uniqueCompleted.length === 1 ? "" : "s"}, ${next.in_progress_count} in progress, ${next.planned_count} planned, and ${next.blocked_count} blocked or founder-attention items.`,
  };
}

function item(engine: string, status: FounderDailyReportItem["status"], title: string, source_ids: string[], href?: string): FounderDailyReportItem {
  return { item_id: `${engine}:${status}:${source_ids[0]}`, status, engine, title, href, source_ids };
}

void FOUNDER_DAILY_REPORT;
