import Link from "next/link";
import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import {
  filterPostsByCategory,
  filterPostsByTag,
  taxonomySlug,
  type BlogTaxonomyKind,
  evaluateBlogTaxonomyArchiveTruthGate,
  evaluateTaxonomyIndexation,
} from "./blog-taxonomy";
import { CLUB_THROTTLE_JOURNAL_POSTS } from "./club-throttle-journal-posts";
import { renderBlogSidebarHtml } from "./blog-ux";
import {
  blogTaxonomyArchiveCapabilityProfile,
  evaluateBlogTaxonomyArchiveRequirementQc,
  evaluateBlogTaxonomySidebarStaticHtmlQc,
  htmlHasBrokenSidebarClassNameAttribute,
} from "./blog-taxonomy-archive-qc";
import { clubThrottleJournalIndexCanonical, CLUB_THROTTLE_ORIGIN } from "./club-throttle-journal-publication-metadata";
export function clubThrottleCategoryArchivePath(categoryLabel: string): string {
  return `/journal/category/${taxonomySlug(categoryLabel)}/`;
}

export function clubThrottleTagArchivePath(tagLabel: string): string {
  return `/journal/tag/${taxonomySlug(tagLabel)}/`;
}

function taxonomyDisplayLabel(label: string): string {
  return label
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function clubThrottleTaxonomyLabelFromSlug(kind: BlogTaxonomyKind, slug: string): string | null {
  const posts = CLUB_THROTTLE_JOURNAL_POSTS;
  if (kind === "category") {
    for (const post of posts) {
      const label = post.primaryCategory ?? post.category;
      if (taxonomySlug(label) === slug) return label;
    }
    return null;
  }
  for (const post of posts) {
    for (const tag of post.tags) {
      if (taxonomySlug(tag) === slug) return tag;
    }
  }
  return null;
}

export function clubThrottleCategoryDescription(category: string): string {
  const map: Record<string, string> = {
    "night riding": "Night-ride notes: light, layers, and pavement discipline after dark — not stunt content.",
    apparel: "Garment decisions for riders: weight, print placement, and what survives the ride home.",
    culture: "Garage, bike-night, and rider social life — practical culture without costume outlaw cosplay.",
    rides: "Group-ride spacing, signals, and street etiquette when the pack is not a race.",
  };
  return map[taxonomySlug(category)] ?? map[category.toLowerCase()] ?? `${category} articles from the Club Throttle journal.`;
}

export function clubThrottleTagDescription(tag: string): string {
  const slug = taxonomySlug(tag);
  const map: Record<string, string> = {
    etiquette: "Meet, lot, and group-ride etiquette — how to show up without turning a weeknight into a show.",
    "bike-night": "Bike-night social rules: park once, idle short, leave a lane.",
    "group-ride": "Street group-ride spacing and signals — not a race brief.",
    "night-riding": "After-dark riding checklists and visibility habits.",
    apparel: "Shirts, layers, and print placement for real rides.",
    layers: "Layering and garment weight for changing temperature.",
    heavyweight: "Heavyweight blanks and why riders reach for them.",
    meetup: "Parking-lot meetups done without blocking the path.",
    garage: "Garage culture as social life, not repair-shop costume.",
    culture: "Identity and social habits around bikes.",
    identity: "How riders describe themselves without cosplay.",
    street: "Street-bike context for etiquette and gear.",
    checklist: "Actionable checklists you can run before you roll.",
    safety: "Visibility and safety notes aligned with public guidance.",
  };
  return map[slug] ?? `Journal articles tagged ${tag} — filtered roll, same cards as the main journal index.`;
}

export function clubThrottleJournalTaxonomyInventory(): {
  categories: Array<{ slug: string; label: string; count: number }>;
  tags: Array<{ slug: string; label: string; count: number }>;
} {
  const categories = new Map<string, { label: string; count: number }>();
  const tags = new Map<string, { label: string; count: number }>();
  for (const post of CLUB_THROTTLE_JOURNAL_POSTS) {
    if (post.draft || post.unpublished) continue;
    const cat = post.primaryCategory ?? post.category;
    const catSlug = taxonomySlug(cat);
    categories.set(catSlug, { label: cat, count: (categories.get(catSlug)?.count ?? 0) + 1 });
    for (const tag of post.tags) {
      const tagSlug = taxonomySlug(tag);
      tags.set(tagSlug, { label: tag, count: (tags.get(tagSlug)?.count ?? 0) + 1 });
    }
  }
  return {
    categories: [...categories.entries()].map(([slug, row]) => ({ slug, label: row.label, count: row.count })),
    tags: [...tags.entries()].map(([slug, row]) => ({ slug, label: row.label, count: row.count })),
  };
}

function TaxonomyChip({ kind, label }: { kind: BlogTaxonomyKind; label: string }) {
  const href = kind === "category" ? clubThrottleCategoryArchivePath(label) : clubThrottleTagArchivePath(label);
  const display = kind === "category" ? `[ ${label.toUpperCase()} ]` : `[ ${label} ]`;
  return (
    <Link
      href={href}
      className="onpv-taxonomy-chip"
      data-blog-taxonomy-link={kind}
      data-blog-taxonomy-chip="true"
      data-blog-taxonomy-kind={kind}
      data-blog-taxonomy-surface="light"
      {...(kind === "category" ? { "data-blog-category": label } : { "data-blog-tag": label })}
    >
      {display}
    </Link>
  );
}

export function ClubThrottleJournalRollCard({ post, index }: { post: OccupancyNpvBlogPost; index: number }) {
  const category = post.primaryCategory ?? post.category;
  const flip = index % 2 === 1 ? " onpv-blog-row--flip" : "";
  return (
    <article
      className={`onpv-blog-row${flip}`}
      data-blog-card="true"
      data-blog-roll-card="true"
      data-blog-row="full-width"
      data-editorial-card="substantial"
      data-blog-archive-card="true"
      data-category={category}
    >
      <Link className="onpv-blog-row__media" href={post.path}>
        <img src={post.image} alt={post.image_alt} width={720} height={405} loading="lazy" />
      </Link>
      <div className="onpv-blog-row__copy">
        <p className="pv-eyebrow">
          <TaxonomyChip kind="category" label={category} />
        </p>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <p>
          <time dateTime={post.published}>{post.published}</time>
          {post.reading_time ? ` · ${post.reading_time}` : ""}
        </p>
        <p>
          {post.tags.slice(0, 3).map((tag) => (
            <TaxonomyChip key={tag} kind="tag" label={tag} />
          ))}
        </p>
        <Link className="onpv-blog-roll-card__cta" href={post.path}>
          Read article
        </Link>
      </div>
    </article>
  );
}

function blogDiscoverySidebarDomHtml(): string {
  return renderBlogSidebarHtml(CLUB_THROTTLE_JOURNAL_POSTS, undefined, {
    venture_id: "club-throttle",
    archive_root: "/journal",
  }).replaceAll("className=", "class=");
}

export function ClubThrottleJournalTaxonomyArchive({ kind, slug }: { kind: BlogTaxonomyKind; slug: string }) {
  const label = clubThrottleTaxonomyLabelFromSlug(kind, slug);
  if (!label) {
    return (
      <article className="sheet" data-blog-archive="missing" data-blog-taxonomy-missing="true">
        <h1>Archive not found</h1>
        <p>No published journal taxonomy matches this URL.</p>
      </article>
    );
  }
  const matching =
    kind === "category"
      ? filterPostsByCategory(CLUB_THROTTLE_JOURNAL_POSTS, label)
      : filterPostsByTag(CLUB_THROTTLE_JOURNAL_POSTS, label);
  const intro = kind === "category" ? clubThrottleCategoryDescription(label) : clubThrottleTagDescription(label);
  const eyebrow = kind === "category" ? "Category" : "Tag";
  const heroImage = matching[0]?.image ?? "/visual/journal-hero-night-ride.webp";
  const indexation = evaluateTaxonomyIndexation({
    kind,
    label,
    published_count: matching.length,
    intro,
    taxonomy_importance: kind === "category" ? "HIGH" : "NORMAL",
  });

  const selfPath = kind === "category" ? clubThrottleCategoryArchivePath(label) : clubThrottleTagArchivePath(label);

  return (
    <article className="sheet" data-content-surface="journal" data-blog-taxonomy-archive="true">
      <div className="vg-container" data-blog-taxonomy-archive-context="true">
        <nav aria-label="Breadcrumb" data-blog-breadcrumb="true" className="pv-eyebrow">
          <Link href="/journal/">Journal</Link>
          {" · "}
          <Link href={selfPath}>{taxonomyDisplayLabel(label)}</Link>
        </nav>
      </div>
      <section
        className="pv-section"
        data-section-type="INDEX"
        data-blog-taxonomy-archive-shell="true"
        data-blog-archive={kind}
        data-blog-archive-count={matching.length}
        data-blog-taxonomy-kind={kind}
        data-blog-taxonomy-slug={slug}
        data-blog-taxonomy-indexation={indexation.state}
      >
        <header className="onpv-blog-hero" data-blog-hero="true" data-blog-hero-treatment="editorial-panel" data-section-type="HERO">
          <div className="vg-container onpv-blog-hero__grid">
            <div className="onpv-blog-hero__copy">
              <p className="pv-eyebrow">{eyebrow}</p>
              <h1 className="pv-display">{taxonomyDisplayLabel(label)}</h1>
              <p>
                {intro} {matching.length} article{matching.length === 1 ? "" : "s"}.
              </p>
            </div>
            <figure className="onpv-blog-hero__visual" data-blog-hero-visual="true">
              <img src={heroImage} alt={`${label} — Club Throttle Journal`} width={720} height={480} />
            </figure>
          </div>
        </header>
        <div className="vg-container onpv-blog-layout" data-blog-layout="editorial" data-blog-index-layout="true">
          <div className="onpv-blog-main" data-blog-index-main="true">
            <section
              data-blog-all-articles="true"
              data-blog-main-roll="true"
              data-blog-roll="true"
              data-blog-archive-roll="true"
              data-blog-taxonomy-filter={`${kind}:${slug}`}
              data-blog-roll-count={matching.length}
            >
              <h2 className="onpv-blog-section-heading" data-blog-section-heading="true">
                {kind === "category" ? "Articles in this category" : "Articles with this tag"}
              </h2>
              <div className="onpv-blog-rows" data-blog-roll-grid="true">
                {matching.length ? (
                  matching.map((post, index) => <ClubThrottleJournalRollCard key={post.path} post={post} index={index} />)
                ) : (
                  <p>No published posts in this archive.</p>
                )}
              </div>
            </section>
          </div>
          <div dangerouslySetInnerHTML={{ __html: blogDiscoverySidebarDomHtml() }} />
        </div>
      </section>
    </article>
  );
}

export function clubThrottleJournalTaxonomyArchiveMetadata(kind: BlogTaxonomyKind, slug: string) {
  const label = clubThrottleTaxonomyLabelFromSlug(kind, slug);
  const path = kind === "category" ? `/journal/category/${slug}/` : `/journal/tag/${slug}/`;
  const intro = label
    ? kind === "category"
      ? clubThrottleCategoryDescription(label)
      : clubThrottleTagDescription(label)
    : "Club Throttle Journal taxonomy archive.";
  const matching = label
    ? kind === "category"
      ? filterPostsByCategory(CLUB_THROTTLE_JOURNAL_POSTS, label)
      : filterPostsByTag(CLUB_THROTTLE_JOURNAL_POSTS, label)
    : [];
  const indexation = label
    ? evaluateTaxonomyIndexation({
        kind,
        label,
        published_count: matching.length,
        intro,
        taxonomy_importance: kind === "category" ? "HIGH" : "NORMAL",
      })
    : { state: "NOINDEX" as const };
  return {
    title: label ? `${label} · Club Throttle Journal` : "Journal archive · Club Throttle",
    description: intro,
    alternates: { canonical: `${CLUB_THROTTLE_ORIGIN}${path}` },
    robots: indexation.state === "INDEX" ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export function evaluateClubThrottleBlogTaxonomyRenderedQc(html: string): { gate: string; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (html.includes("<ul>") && html.includes("<li>") && !html.includes("data-blog-roll-card")) reasons.push("PLAIN_LIST_ONLY");
  if (!html.includes("data-blog-sidebar")) reasons.push("SIDEBAR_MISSING");
  if (!html.includes("onpv-blog-row")) reasons.push("CARD_PARITY_MISSING");
  if (!html.includes("data-blog-archive-roll")) reasons.push("archive_roll_missing");
  return { gate: "BLOG_TAXONOMY_RENDERED_QC", result: reasons.length ? "FAIL" : "PASS", reasons };
}

function mainRollHtml(html: string): string {
  const start = html.indexOf('data-blog-archive-roll="true"');
  if (start < 0) return html;
  const end = html.indexOf("data-blog-sidebar", start);
  return end > start ? html.slice(start, end) : html.slice(start);
}

export function evaluateClubThrottleJournalTaxonomyGates(input: {
  kind: BlogTaxonomyKind;
  label: string;
  html: string;
  page?: number;
}): Record<string, { result: "PASS" | "FAIL"; reasons?: string[] }> {
  const rollHtml = mainRollHtml(input.html);
  const selfPath =
    input.kind === "category" ? clubThrottleCategoryArchivePath(input.label) : clubThrottleTagArchivePath(input.label);
  const truth = evaluateBlogTaxonomyArchiveTruthGate({
    kind: input.kind,
    label: input.label,
    html: `${rollHtml}\n${selfPath}`,
    catalog: CLUB_THROTTLE_JOURNAL_POSTS,
    page: input.page,
  });
  const rendered = evaluateClubThrottleBlogTaxonomyRenderedQc(input.html);
  const matching =
    input.kind === "category"
      ? filterPostsByCategory(CLUB_THROTTLE_JOURNAL_POSTS, input.label)
      : filterPostsByTag(CLUB_THROTTLE_JOURNAL_POSTS, input.label);
  const unrelatedInRoll = CLUB_THROTTLE_JOURNAL_POSTS.some(
    (post) =>
      !post.draft &&
      !matching.some((row) => row.path === post.path) &&
      rollHtml.includes(post.path),
  );
  const filterPass =
    matching.every((post) => rollHtml.includes(post.title) || rollHtml.includes(post.path)) &&
    !unrelatedInRoll &&
    !rollHtml.includes("<ul>");
  const profile = blogTaxonomyArchiveCapabilityProfile("club-throttle");
  const archiveRequirement = evaluateBlogTaxonomyArchiveRequirementQc({ html: input.html, profile });
  const sidebarStatic = evaluateBlogTaxonomySidebarStaticHtmlQc(input.html);
  const brokenSidebarClass = htmlHasBrokenSidebarClassNameAttribute(input.html);
  return {
    BLOG_TAXONOMY_ARCHIVE_REQUIREMENT_QC: archiveRequirement,
    BLOG_TAXONOMY_FILTER_QC: { result: filterPass ? "PASS" : "FAIL", reasons: truth.reasons },
    BLOG_TAXONOMY_CARD_PARITY_QC: {
      result: input.html.includes("onpv-blog-row") && input.html.includes("onpv-blog-roll-card__cta") ? "PASS" : "FAIL",
    },
    BLOG_TAXONOMY_SIDEBAR_QC: sidebarStatic,
    BLOG_TAXONOMY_SIDEBAR_CLASS_QC: {
      result: brokenSidebarClass ? "FAIL" : "PASS",
      reasons: brokenSidebarClass ? ["SIDEBAR_CLASSNAME_IN_DOM_HTML"] : [],
    },
    BLOG_TAXONOMY_RENDERED_QC: rendered,
    BLOG_TAXONOMY_RESPONSIVE_QC: {
      result: input.html.includes("onpv-blog-layout") && input.html.includes("data-blog-index-layout") ? "PASS" : "FAIL",
    },
  };
}

export function clubThrottleJournalTaxonomySchema(kind: BlogTaxonomyKind, slug: string): Record<string, unknown> {
  const label = clubThrottleTaxonomyLabelFromSlug(kind, slug) ?? slug;
  const path = kind === "category" ? `/journal/category/${slug}/` : `/journal/tag/${slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${label} · Club Throttle Journal`,
        url: `${CLUB_THROTTLE_ORIGIN}${path}`,
        isPartOf: { "@type": "WebSite", name: "Club Throttle", url: CLUB_THROTTLE_ORIGIN },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: CLUB_THROTTLE_ORIGIN },
          { "@type": "ListItem", position: 2, name: "Journal", item: clubThrottleJournalIndexCanonical() },
          { "@type": "ListItem", position: 3, name: label, item: `${CLUB_THROTTLE_ORIGIN}${path}` },
        ],
      },
    ],
  };
}
