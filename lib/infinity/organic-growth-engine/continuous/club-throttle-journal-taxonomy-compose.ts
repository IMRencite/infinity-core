import { CLUB_THROTTLE_JOURNAL_POSTS } from "./club-throttle-journal-posts";
import { renderBlogSidebarHtml } from "./blog-ux";
import {
  clubThrottleJournalTaxonomyInventory,
  clubThrottleJournalTaxonomyArchiveMetadata,
  clubThrottleJournalTaxonomySchema,
  clubThrottleTagDescription,
  clubThrottleCategoryDescription,
} from "./club-throttle-journal-taxonomy";

function taxonomyArchivePageSource(kind: "tag" | "category"): string {
  const param = kind === "tag" ? "tag" : "category";
  const sidebarHtml = renderBlogSidebarHtml(CLUB_THROTTLE_JOURNAL_POSTS, undefined, {
    venture_id: "club-throttle",
    archive_root: "/journal",
  });
  const inv = clubThrottleJournalTaxonomyInventory();
  const slugs = kind === "tag" ? inv.tags.map((row) => row.slug) : inv.categories.map((row) => row.slug);
  const metadataBySlug: Record<string, ReturnType<typeof clubThrottleJournalTaxonomyArchiveMetadata>> = {};
  const schemaBySlug: Record<string, Record<string, unknown>> = {};
  for (const slug of slugs) {
    metadataBySlug[slug] = clubThrottleJournalTaxonomyArchiveMetadata(kind, slug);
    schemaBySlug[slug] = clubThrottleJournalTaxonomySchema(kind, slug);
  }
  const descriptions =
    kind === "tag"
      ? Object.fromEntries(inv.tags.map((row) => [row.slug, clubThrottleTagDescription(row.label)]))
      : Object.fromEntries(inv.categories.map((row) => [row.slug, clubThrottleCategoryDescription(row.label)]));

  const isCategory = kind === "category";

  return `import Link from "next/link";

const POSTS = ${JSON.stringify(CLUB_THROTTLE_JOURNAL_POSTS)};
const METADATA_BY_SLUG = ${JSON.stringify(metadataBySlug)};
const SCHEMA_BY_SLUG = ${JSON.stringify(schemaBySlug)};
const DESCRIPTIONS = ${JSON.stringify(descriptions)};
const LABEL_ROWS = ${JSON.stringify(kind === "tag" ? inv.tags : inv.categories)};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function displayLabel(label: string) {
  return label.split(/\\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function labelFromSlug(slug: string) {
  return LABEL_ROWS.find((row) => row.slug === slug)?.label ?? null;
}

function matchingPosts(slug: string) {
  return POSTS.filter((post) => {
    if (post.draft || post.unpublished) return false;
    if (${isCategory}) {
      const cat = post.primaryCategory ?? post.category;
      return slugify(cat) === slug;
    }
    return post.tags.some((tag) => slugify(tag) === slug);
  });
}

function chipHref(kind: "category" | "tag", label: string) {
  const s = slugify(label);
  return kind === "category" ? \`/journal/category/\${s}/\` : \`/journal/tag/\${s}/\`;
}

function TaxonomyChip({ kind, label }: { kind: "category" | "tag"; label: string }) {
  const display = kind === "category" ? \`[ \${label.toUpperCase()} ]\` : \`[ \${label} ]\`;
  return (
    <Link
      href={chipHref(kind, label)}
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

function RollCard({ post, index }: { post: (typeof POSTS)[number]; index: number }) {
  const category = post.primaryCategory ?? post.category;
  const flip = index % 2 === 1 ? " onpv-blog-row--flip" : "";
  return (
    <article
      className={\`onpv-blog-row\${flip}\`}
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
          {post.reading_time ? \` · \${post.reading_time}\` : ""}
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

export async function generateMetadata({ params }: { params: Promise<{ ${param}: string }> }) {
  const { ${param} } = await params;
  const meta = METADATA_BY_SLUG as Record<string, { title: string; description?: string; alternates?: { canonical: string }; robots?: { index: boolean; follow: boolean } }>;
  return meta[${param}] ?? { title: "Journal archive · Club Throttle" };
}

export default async function Journal${kind === "tag" ? "Tag" : "Category"}({ params }: { params: Promise<{ ${param}: string }> }) {
  const { ${param} } = await params;
  const slug = ${param};
  const label = labelFromSlug(slug);
  if (!label) {
    return (
      <article className="sheet" data-blog-archive="missing">
        <h1>Archive not found</h1>
      </article>
    );
  }
  const matching = matchingPosts(slug);
  const descMap = DESCRIPTIONS as Record<string, string>;
  const intro = descMap[slug] ?? "";
  const selfPath = ${isCategory ? "`/journal/category/${slug}/`" : "`/journal/tag/${slug}/`"};
  const heroImage = matching[0]?.image ?? "/visual/journal-hero-night-ride.webp";
  const schemaMap = SCHEMA_BY_SLUG as Record<string, Record<string, unknown>>;
  const schema = schemaMap[slug] ?? {};

  return (
    <>
      <article className="sheet" data-content-surface="journal" data-blog-taxonomy-archive="true">
        <div className="vg-container" data-blog-taxonomy-archive-context="true">
          <nav aria-label="Breadcrumb" data-blog-breadcrumb="true" className="pv-eyebrow">
            <Link href="/journal/">Journal</Link>
            {" · "}
            <Link href={selfPath}>{displayLabel(label)}</Link>
          </nav>
        </div>
        <section
          className="pv-section"
          data-section-type="INDEX"
          data-blog-taxonomy-archive-shell="true"
          data-blog-archive="${kind}"
          data-blog-archive-count={matching.length}
          data-blog-taxonomy-kind="${kind}"
          data-blog-taxonomy-slug={slug}
        >
          <header className="onpv-blog-hero" data-blog-hero="true" data-blog-hero-treatment="editorial-panel" data-section-type="HERO">
            <div className="vg-container onpv-blog-hero__grid">
              <div className="onpv-blog-hero__copy">
                <p className="pv-eyebrow">${kind === "category" ? "Category" : "Tag"}</p>
                <h1 className="pv-display">{displayLabel(label)}</h1>
                <p>{intro} {matching.length} article{matching.length === 1 ? "" : "s"}.</p>
              </div>
              <figure className="onpv-blog-hero__visual" data-blog-hero-visual="true">
                <img src={heroImage} alt={\`\${displayLabel(label)} — Club Throttle Journal\`} width={720} height={480} />
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
                data-blog-taxonomy-filter={\`${kind}:\${slug}\`}
                data-blog-roll-count={matching.length}
              >
                <h2 className="onpv-blog-section-heading" data-blog-section-heading="true">
                  ${kind === "category" ? "Articles in this category" : "Articles with this tag"}
                </h2>
                <div className="onpv-blog-rows" data-blog-roll-grid="true">
                  {matching.length ? matching.map((post, index) => <RollCard key={post.path} post={post} index={index} />) : <p>No published posts in this archive.</p>}
                </div>
              </section>
            </div>
            ${sidebarHtml}
          </div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </>
  );
}
`;
}

export function clubThrottleJournalTagArchivePageSource(): string {
  return taxonomyArchivePageSource("tag");
}

export function clubThrottleJournalCategoryArchivePageSource(): string {
  return taxonomyArchivePageSource("category");
}
