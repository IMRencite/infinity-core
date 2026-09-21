import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import type { OrganicDraft } from "./quality";
import { buildConnectedSchemaGraph, occupancynpvOrganization, type SchemaFaqItem } from "./schema-standard";
import {
  LATEST_BLOGS_CAROUSEL_SCRIPT,
  renderBlogHeroHtml,
  renderBlogSidebarHtml,
  renderLatestBlogsCarouselHtml,
  sequentialBlogNeighbors,
} from "./blog-ux";
import {
  blogCategoryArchivePath,
  blogTagArchivePath,
  evaluateTaxonomyIndexation,
  occupancynpvCategoryDescription,
  occupancynpvTagDescription,
  renderTaxonomyArchiveRollHtml,
  taxonomyChipHtml,
  taxonomySlug,
} from "./blog-taxonomy";
import {
  OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
  OCCUPANCYNPV_BLOG_INDEX_PATH,
  OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
  occupancynpvActiveTags,
  occupancynpvPublishedBlogPosts,
} from "./occupancynpv-blog-catalog";
import { occupancynpvEntityCreative } from "./occupancynpv-blog-creative";

export {
  OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
  OCCUPANCYNPV_BLOG_INDEX_PATH,
  OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
  occupancynpvActiveCategories,
  occupancynpvPublishedBlogPosts,
  occupancynpvTagCloud,
} from "./occupancynpv-blog-catalog";

const FEATURED_IMAGE = occupancynpvEntityCreative("article", OCCUPANCYNPV_BLOG_ARTICLE_QUESTION).src;
const FEATURED_ALT = occupancynpvEntityCreative("article", OCCUPANCYNPV_BLOG_ARTICLE_QUESTION).alt;

export function occupancynpvBlogIndexPage(): PlannedPage {
  return {
    route: "/blog",
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/",
    title: "OccupancyNPV Blog — lease, valuation, and occupancy economics",
    metaDescription:
      "Editorial resources on interest rates, cap rates, and why tenant lease NPV is a different question from property valuation.",
    canonical: OCCUPANCYNPV_BLOG_INDEX_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "editorial",
    pageOpportunityId: "occupancynpv-blog-index",
  };
}

export function occupancynpvBlogArticlePage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_BLOG_ARTICLE_PATH.replace(/\/+$/, ""),
    role: "EDUCATIONAL_ARTICLE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: "How interest rates affect commercial property values — OccupancyNPV",
    metaDescription:
      "How financing costs move required yields, why the same NOI can imply a lower value, and what owners can stress-test. Not a tenant lease NPV.",
    canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "valuation",
    pageOpportunityId: "occupancynpv-blog-interest-rates",
  };
}

export function occupancynpvBlogCategoryArchivePage(category = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY): PlannedPage {
  const path = blogCategoryArchivePath(category);
  return {
    route: path.replace(/\/+$/, ""),
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: `${category} — OccupancyNPV Blog`,
    metaDescription: occupancynpvCategoryDescription(category),
    canonical: path,
    indexable: evaluateTaxonomyIndexation({
      kind: "category",
      label: category,
      published_count: occupancynpvPublishedBlogPosts().filter((post) => (post.primaryCategory ?? post.category) === category).length,
      intro: occupancynpvCategoryDescription(category),
      taxonomy_importance: "HIGH",
    }).state === "INDEX",
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList", "ItemList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: taxonomySlug(category),
    pageOpportunityId: `occupancynpv-blog-category-${taxonomySlug(category)}`,
  };
}

export function occupancynpvBlogTagArchivePage(tag: string): PlannedPage {
  const path = blogTagArchivePath(tag);
  const count = occupancynpvActiveTags().find((row) => row.tag === tag)?.count ?? 0;
  const intro = occupancynpvTagDescription(tag);
  return {
    route: path.replace(/\/+$/, ""),
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: `${tag} — OccupancyNPV Blog`,
    metaDescription: intro,
    canonical: path,
    indexable: evaluateTaxonomyIndexation({ kind: "tag", label: tag, published_count: count, intro }).state === "INDEX",
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList", "ItemList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: taxonomySlug(tag),
    pageOpportunityId: `occupancynpv-blog-tag-${taxonomySlug(tag)}`,
  };
}

export function occupancynpvBlogIndexSource(): string {
  const page = occupancynpvBlogIndexPage();
  const posts = occupancynpvPublishedBlogPosts();
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const latestCarousel = renderLatestBlogsCarouselHtml({
    posts,
    excludePath: posts.length > 1 ? featured?.path : undefined,
    surface: "index",
  });
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
  ];
  const featuredCard = featured
    ? `<article className="onpv-blog-featured" data-blog-featured-card="true" data-featured-image-size="editorial">
              <div className="onpv-blog-featured__media">
                <img src="${featured.image}" alt=${JSON.stringify(featured.image_alt)} width={640} height={400} />
              </div>
              <div className="onpv-blog-featured__copy">
                <p className="pv-eyebrow" data-blog-featured-eyebrow="true">${taxonomyChipHtml("category", featured.primaryCategory ?? featured.category)}</p>
                <h2>${featured.title}</h2>
                <p>${featured.excerpt}</p>
                <p><time dateTime="${featured.published}">${featured.published}</time>${featured.reading_time ? ` · ${featured.reading_time}` : ""}</p>
                <p>${featured.tags.map((tag) => taxonomyChipHtml("tag", tag)).join(" ")}</p>
                <a className="onpv-blog-featured__cta" data-blog-featured-cta="true" href="${featured.path}">Read article</a>
              </div>
            </article>`
    : "<p>No published posts yet.</p>";
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Editorial",
          title: "OccupancyNPV blog",
          description: "Practical valuation and occupancy-cost resources for owners, buyers, and tenant-rep readers. These notes sit next to evergreen hubs. They are not a substitute for them.",
          image: FEATURED_IMAGE,
          image_alt: FEATURED_ALT,
        })}
        <section className="pv-section" data-section-type="INDEX">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial">
            <div className="onpv-blog-main">
              <section data-blog-featured="true">
                <h2 className="onpv-blog-section-heading" data-blog-section-heading="true">Featured</h2>
                ${featuredCard}
              </section>
              ${latestCarousel}
              ${posts.length <= 6 ? "" : '<p data-blog-pagination="true">Load more when the archive grows.</p>'}
              <section data-section-type="RELATED_CONTENT">
                <RelatedContent items={[
                  { href: "/resources", label: "Resource library" },
                  { href: "/commercial-lease-npv/", label: "Commercial lease NPV hub" },
                  { href: "/commercial-lease-npv/how-is-cap-rate-calculated/", label: "How is cap rate calculated?" },
                  { href: "/compare-commercial-leases", label: "Compare commercial leases" },
                ]} />
              </section>
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(LATEST_BLOGS_CAROUSEL_SCRIPT)} }} />`;
  return innerPageShell({ page, importDepth: "../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvBlogArticleFaqs(): SchemaFaqItem[] {
  return [
    {
      question: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
      answer:
        "When borrowing costs rise, buyers often require a higher income yield to pay the same price. Same NOI at a higher cap rate implies a lower value. That is a buyer-yield story, not a tenant occupancy-cost NPV.",
    },
    {
      question: "Do higher interest rates always lower property values?",
      answer: "No. A higher required yield pressures price only if NOI, liquidity, and risk do not offset it. NOI growth can recover part of the gap. A one-for-one cut is not automatic.",
    },
    {
      question: "How quickly do cap rates react?",
      answer: "Cap rates reprice when bids clear, not when a policy rate prints. Thin markets can sit with a wide bid-ask until someone yields or NOI improves.",
    },
    {
      question: "What matters more: cap rate or NOI?",
      answer: "Both. Value is NOI divided by the going-in cap rate. A durable NOI path can offset a higher yield. A weaker NOI path amplifies it.",
    },
    {
      question: "How do interest rates affect refinancing?",
      answer: "A higher coupon raises debt service on the same principal. Coverage, LTV, and cash-on-cash can fail even when occupancy looks unchanged. Model maturity, balloon risk, and the new rate together.",
    },
    {
      question: "Can rents offset higher interest rates?",
      answer: "Sometimes. Rent growth that survives occupancy, concessions, and unrecovered expenses can lift NOI. Do not treat a rent ask as cash until rollover is modeled.",
    },
    {
      question: "Which commercial property types are most sensitive?",
      answer: "Assets with short leases, weak recovery, or heavy near-term rollover usually transmit a rate move faster. Long, credit-strong industrial or net-lease stacks can hold NOI while office or short retail stacks are still marking vacancy.",
    },
    {
      question: "Should owners sell when rates rise?",
      answer: "Not as a reflex. Compare hold NOI, refinance proceeds, and the bid you can actually clear. A wider bid-ask can make a sale more expensive than waiting if the income path is intact.",
    },
    {
      question: "How should buyers model changing rates?",
      answer: "Hold NOI fixed and change the going-in yield. Then change NOI. Then change leverage, DSCR, and equity. Report all three rather than one headline cut.",
    },
    {
      question: "What happens when rates fall?",
      answer: "Required yields can compress and loan proceeds can rise, but credit spreads and liquidity still matter. A lower policy rate does not restore every prior mark.",
    },
    {
      question: "What is the difference between Fed rates and commercial mortgage rates?",
      answer: "The Federal Reserve sets a policy rate. Commercial mortgages price from Treasury yields plus a credit spread and lender appetite. Those layers can move at different times.",
    },
    {
      question: "Is that the same as a tenant lease NPV?",
      answer: "No. Financing-cost valuation is a buyer-yield story. Tenant NPV is occupancy cost over time. See the evergreen NPV page rather than reusing a property cap rate as a lease discount rate.",
    },
  ];
}

export function occupancynpvBlogSequentialNavHtml(currentPath: string, posts = occupancynpvPublishedBlogPosts()): string {
  const neighbors = sequentialBlogNeighbors(posts, currentPath);
  const previous = neighbors.previous
    ? `<a href="${neighbors.previous.path}" data-blog-seq-previous="true" aria-label=${JSON.stringify(`Previous blog: ${neighbors.previous.title}`)}><span>← Previous blog</span><strong>${neighbors.previous.title}</strong></a>`
    : "";
  const next = neighbors.next
    ? `<a href="${neighbors.next.path}" data-blog-seq-next="true" aria-label=${JSON.stringify(`Next blog: ${neighbors.next.title}`)}><span>Next blog →</span><strong>${neighbors.next.title}</strong></a>`
    : "";
  return `<nav className="onpv-blog-seq" data-blog-sequential-nav="true" aria-label="Previous and next blog">${previous}${next}</nav>`;
}

export function occupancynpvBlogIndexCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
  ];
}

export function occupancynpvBlogArticleCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
    { name: OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY, item: blogCategoryArchivePath(OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY) },
    { name: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION, item: OCCUPANCYNPV_BLOG_ARTICLE_PATH },
  ];
}

export function occupancynpvBlogCategoryCrumbs(category = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY) {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
    { name: category, item: blogCategoryArchivePath(category) },
  ];
}

export function occupancynpvBlogTagCrumbs(tag: string) {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
    { name: "Tag", item: "/blog/tag/" },
    { name: tag, item: blogTagArchivePath(tag) },
  ];
}

export function occupancynpvBlogArticleSchema() {
  const page = occupancynpvBlogArticlePage();
  const post = occupancynpvPublishedBlogPosts()[0]!;
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_ARTICLE",
      url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
      breadcrumbs: occupancynpvBlogArticleCrumbs(),
      visible_breadcrumbs: occupancynpvBlogArticleCrumbs(),
      speakable_css_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
      faqs: occupancynpvBlogArticleFaqs(),
      visible_faqs: occupancynpvBlogArticleFaqs(),
      date_published: post.published,
      date_modified: post.modified,
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      image: FEATURED_IMAGE,
      article_section: post.primaryCategory ?? post.category,
      about: ["interest rates", "commercial property values", "capitalization rate"],
      mentions: ["NOI", "commercial lease NPV", "debt-service coverage"],
      link_canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      item_list: occupancynpvPublishedBlogPosts().map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

export function occupancynpvBlogIndexSchema() {
  const page = occupancynpvBlogIndexPage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_INDEX",
      url: OCCUPANCYNPV_BLOG_INDEX_PATH,
      canonical: OCCUPANCYNPV_BLOG_INDEX_PATH,
      title: page.title,
      description: page.metaDescription,
      breadcrumbs: occupancynpvBlogIndexCrumbs(),
      visible_breadcrumbs: occupancynpvBlogIndexCrumbs(),
      link_canonical: OCCUPANCYNPV_BLOG_INDEX_PATH,
      item_list: occupancynpvPublishedBlogPosts().map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

export function occupancynpvBlogCategoryArchiveSchema(category = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY) {
  const page = occupancynpvBlogCategoryArchivePage(category);
  const posts = occupancynpvPublishedBlogPosts().filter((post) => (post.primaryCategory ?? post.category) === category);
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_INDEX",
      url: page.canonical,
      canonical: page.canonical,
      title: page.title,
      description: page.metaDescription,
      breadcrumbs: occupancynpvBlogCategoryCrumbs(category),
      visible_breadcrumbs: occupancynpvBlogCategoryCrumbs(category),
      link_canonical: page.canonical,
      item_list: posts.map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

export function occupancynpvBlogTagArchiveSchema(tag: string) {
  const page = occupancynpvBlogTagArchivePage(tag);
  const posts = occupancynpvPublishedBlogPosts().filter((post) => post.tags.includes(tag));
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "TOPIC_HUB",
      url: page.canonical,
      canonical: page.canonical,
      title: page.title,
      description: page.metaDescription,
      breadcrumbs: occupancynpvBlogTagCrumbs(tag),
      visible_breadcrumbs: occupancynpvBlogTagCrumbs(tag),
      link_canonical: page.canonical,
      item_list: posts.map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

export function occupancynpvBlogArticleSource(): string {
  const page = occupancynpvBlogArticlePage();
  const posts = occupancynpvPublishedBlogPosts();
  const post = posts[0]!;
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: blogCategoryArchivePath(post.primaryCategory ?? post.category), label: post.primaryCategory ?? post.category },
    { href: page.route, label: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION },
  ];
  const faqs = occupancynpvBlogArticleFaqs();
  const body = `
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO">
          <figure className="pv-hero-media">
            <img src="${FEATURED_IMAGE}" alt=${JSON.stringify(FEATURED_ALT)} width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow onpv-taxonomy-row">${taxonomyChipHtml("category", post.primaryCategory ?? post.category, "hero")} <time dateTime="${post.published}">${post.published}</time></p>
            <h1 className="pv-display">${OCCUPANCYNPV_BLOG_ARTICLE_QUESTION}</h1>
            <p className="onpv-taxonomy-row">${post.tags.map((tag) => taxonomyChipHtml("tag", tag, "hero")).join(" ")}</p>
            <div id="direct-answer"><p>When borrowing costs rise, buyers often require a higher unlevered income yield to pay the same price. Same NOI at a higher capitalization rate is a lower indicated value. That is a property-valuation story. It is not a tenant occupancy-cost NPV.</p></div>
            <div id="summary"><p>Rates change the cost of capital. Owners should stress-test refinance, NOI after rollover, and indicated value at a higher going-in yield before treating a headline rate move as a one-size price cut.</p></div>
          </div>
        </header>
        <article className="pv-section onpv-blog-article-shell" data-section-type="ARTICLE" data-blog-article-shell="true">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial" data-blog-article-layout="true" data-blog-article-sidebar="true">
          <div className="onpv-blog-main pv-reading">
            <h2>Which interest rates are relevant to commercial real estate</h2>
            <p>A Federal Reserve policy rate is not the same as a commercial mortgage coupon. Treasuries are a risk-free benchmark. Credit spreads sit on top of those yields. Local lender risk appetite and the specific loan then set the quote you can actually close.</p>
            <p>Those layers can move at different times. A policy-rate cut can leave commercial mortgage rates sticky if credit spreads widen or lenders pull proceeds. A Treasury move can matter more than a press-conference line. Name the rate you are using before you translate it into value.</p>
            <h2>Why this matters commercially</h2>
            <p>A rate headline is not a completed price. Owners, buyers, and lenders still have to name NOI, leverage, and the bid that can actually clear. The commercial question is whether the same building still supports the same loan, the same equity check, and the same hold-versus-sell decision after the coupon moves.</p>
            <h2>Why borrowing costs matter</h2>
            <p>Debt service is cash the loan requires before equity sees residual cash. Higher rates raise that service for the same principal. At a fixed loan-to-value, coverage can fall unless NOI rises or the buyer reduces leverage and brings more cash equity.</p>
            <p>Unlevered buyers still reprice. Their opportunity cost of capital moved even if they never draw a loan. The required return conversation is larger than one coupon.</p>
            <div className="onpv-blog-flow" data-supporting-visual="rate-to-value">
              <span>Rate</span><span>Financing cost</span><span>Required return</span><span>Cap rate</span><span>Value</span>
            </div>
            <p>That chain is a teaching map, not a mechanical formula. Liquidity, tenant credit, and lease structure can interrupt any step.</p>
            <h2>How interest rates influence required returns</h2>
            <p>Buyers compare a going-in yield with the cost of debt and with other uses of equity. If debt is more expensive, a leveraged buyer may accept a lower price for the same NOI so the going-in yield still covers a tighter debt-service cushion.</p>
            <p>Cap rates do not move 1:1 with Treasury or Fed rates. Credit-spread, property-specific risk, and transaction liquidity sit between the benchmark and the bid. A 100-basis-point policy move is not a 100-basis-point cap-rate move on every asset.</p>
            <p>This page sits beside the evergreen resource <a href="/commercial-lease-npv/how-is-cap-rate-calculated/">How is cap rate calculated?</a>. Use that page for the formula. Use this page for the financing-context implication.</p>
            <h2>Valuation: NOI, cap rate, and property-specific risk</h2>
            <p>Indicated value is NOI divided by the going-in capitalization rate. Same NOI at a higher cap rate is a lower indicated value. NOI growth can offset part of that pressure. NOI decline can amplify it.</p>
            <p>Property-specific risk still matters. Tenant credit, remaining term, expense recovery, and deferred capital can keep two buildings from sharing one yield. Market liquidity matters too: a thin bid pool can sit with a wide bid-ask even when the arithmetic is clear.</p>
            <h2>Financing: LTV, DSCR, debt yield, and loan structure</h2>
            <p>Loan-to-value is principal divided by value or price. Debt-service coverage (DSCR) is NOI divided by annual debt service. Debt yield is NOI divided by loan amount. A higher coupon can fail a coverage or debt-yield test before the cap-rate story finishes.</p>
            <p>Interest-only periods can hide pressure until amortization starts. Floating-rate loans transmit a rate move into debt service before a sale. Balloon and maturity risk appear when proceeds no longer support the same LTV. An assumable loan can keep an older coupon in place for a buyer. Those edges change which cash-flow line moves first. They do not cancel the going-in yield conversation.</p>
            <h2>Buyer impact</h2>
            <p>Higher rates often mean lower leverage capacity, a higher cash-equity requirement, and a higher return hurdle. Pricing discipline shows up as sensitivity analysis: hold NOI fixed and change yield, then change NOI, then change leverage. Report all three.</p>
            <h2>Seller impact</h2>
            <p>The buyer pool can shrink when proceeds and coverage tighten. Pricing expectations that last marked a lower yield meet a wider bid-ask. Time-on-market can stretch until someone yields or NOI improves. Hold vs sell is a comparison of the bid you can clear against the hold income path, not a slogan about “rates.”</p>
            <h2>Owner and operator impact</h2>
            <p>Lease rollover, tenant quality, and expense control move NOI while the rate story is happening. Capital-expenditure plans and the refinancing timeline belong in the same workbook. A clean occupancy print does not prove coverage will survive a new coupon.</p>
            <h2>How different property types can react</h2>
            <p>Office stacks with near-term rollover and tenant-improvement spend often transmit a rate move through NOI as well as through yield. Retail depends on recovery and credit. Industrial with remaining term and recovered expenses can hold NOI while the bid still reprices. Multifamily can reprice rents faster than a long industrial lease. That can offset some yield pressure. It can also add expense and turnover cost. Other CRE types follow the same rule: shared rate, different income path. Do not invent one percentage decline for every asset class.</p>
            <h2>Market context without a fake forecast</h2>
            <p>Federal Reserve policy, Treasury yields, credit spreads, and lender risk appetite are separate inputs. Local supply and demand and transaction liquidity decide whether a bid clears. This page does not publish a current market-average cap rate or a dated Fed path. Those need a source with a retrieval date.</p>
            <h2>Scenario analysis</h2>
            <p>These are labeled teaching samples. They are not market averages and not client results.</p>
            <div className="pv-table-shell" data-supporting-visual="valuation-scenarios">
              <table className="pv-fin-table">
                <caption className="pv-caption">Indicative value = NOI ÷ going-in cap rate</caption>
                <thead><tr><th scope="col">Case</th><th scope="col">NOI</th><th scope="col">Cap rate</th><th scope="col">Indicated value</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Starting</th><td>$120,000</td><td>6%</td><td>$2,000,000</td></tr>
                  <tr><th scope="row">Higher required yield</th><td>$120,000</td><td>7%</td><td>$1,714,286</td></tr>
                  <tr><th scope="row">NOI growth offset</th><td>$135,000</td><td>7%</td><td>$1,928,571</td></tr>
                </tbody>
              </table>
            </div>
            <p>Same income at 7 percent instead of 6 percent cuts indicated value by about $286,000. Raising NOI to $135,000 at the same 7 percent recovers most of that gap ($1,928,571) but does not automatically restore the $2,000,000 starting mark. Higher rates do not always lower values by the same amount. The lesson is joint: yield and income both have to be named.</p>
            <h2>Financing example: loan sizing, equity, and DSCR</h2>
            <p>Assume a $2,000,000 purchase, 65 percent LTV, a $1,300,000 loan, and interest-only debt so annual debt service equals the coupon times principal. At 6 percent, annual debt service is $78,000. At $120,000 NOI, DSCR is 1.54x and cash after debt service is $42,000 on $700,000 equity.</p>
            <p>At 8 percent on the same principal, annual debt service is $104,000. DSCR falls to 1.15x. Cash after debt service is $16,000. If a lender keeps a 1.25x coverage test, the loan must shrink: $120,000 ÷ 1.25 = $96,000 of allowed service, so principal at 8 percent is $1,200,000. Equity required rises to $800,000. Simplifying assumptions: interest-only, constant NOI, no fees, no amortization, no reserve. Real quotes add all four.</p>
            <div className="pv-table-shell" data-supporting-visual="refinance-stress">
              <table className="pv-fin-table">
                <caption className="pv-caption">Same $2,000,000 price, interest-only teaching sample</caption>
                <thead><tr><th scope="col">Coupon</th><th scope="col">Loan</th><th scope="col">Debt service</th><th scope="col">DSCR</th></tr></thead>
                <tbody>
                  <tr><th scope="row">6%</th><td>$1,300,000</td><td>$78,000</td><td>1.54x</td></tr>
                  <tr><th scope="row">8% same loan</th><td>$1,300,000</td><td>$104,000</td><td>1.15x</td></tr>
                  <tr><th scope="row">8% 1.25x cap</th><td>$1,200,000</td><td>$96,000</td><td>1.25x</td></tr>
                </tbody>
              </table>
            </div>
            <h2>Cap rate, yield on cost, and cash-on-cash</h2>
            <p>Going-in cap rate is current or stabilized NOI over price. Yield on cost is stabilized NOI over total project cost. Cash-on-cash is levered cash after debt service over equity. A higher rate can leave the cap-rate story intact while cash-on-cash falls because coverage tightened. Do not treat cash-on-cash as proof the building’s unlevered value moved by the same amount.</p>
            <h2>What Owners Should Review When Rates Change</h2>
            <ul data-blog-checklist="true">
              <li>Debt maturity schedule and balloon dates.</li>
              <li>Rate structure: fixed, floating, interest-only, or amortizing.</li>
              <li>DSCR, LTV, and debt yield at the new coupon.</li>
              <li>Tenant rollover, expense growth, and NOI assumptions after vacancy.</li>
              <li>Cap-rate scenarios with the same NOI and with a changed NOI.</li>
              <li>Refinance proceeds versus remaining principal.</li>
              <li>Comparable sales that actually cleared, not last year’s ask.</li>
              <li>Current lender quotes, not a remembered spread.</li>
            </ul>
            <p>Keep tenant occupancy comparisons on a lease NPV timeline. See <a href="/commercial-lease-npv/what-is-npv-in-a-commercial-lease/">what NPV means in a commercial lease</a> and <a href="/compare-commercial-leases">compare commercial leases</a> when the discount rate on occupancy cost is the question.</p>
            <h2>Decision support for buyers, owners, sellers, and operators</h2>
            <p>Buyers should show yield, NOI, and leverage cases before they treat a headline rate as a finished price. Owners should put refinance and rollover on one page. Sellers should price the bid they can clear, not the mark they remember. Operators should treat expense control and capex as NOI tools, not afterthoughts. None of this is personalized financial advice.</p>
            <h2>Common mistakes and misconceptions</h2>
            <ul>
              <li>Using a property cap rate as the discount rate for a tenant lease comparison.</li>
              <li>Assuming every asset reprices by the same percentage as a policy-rate move.</li>
              <li>Ignoring leverage, DSCR, and debt yield when the story is “rates.”</li>
              <li>Mixing trailing and projected NOI without saying which one sits in the numerator.</li>
              <li>Treating a Fed print as a commercial mortgage quote.</li>
            </ul>
            <h2>Limitations and tradeoffs</h2>
            <p>Cap rates are not mechanically tied to rates. Local market, property quality, tenant credit, lease structure, NOI assumptions, and debt structure all matter. This page does not replace an appraisal. OccupancyNPV compares occupancy-cost paths. When the discount-rate sensitivity of two leases is the job, use <a href="/discount-rate-sensitivity">discount-rate sensitivity</a>.</p>
            <div id="key-takeaways"><h2>Key takeaways</h2><p>Rates change required yields. Same NOI at a higher yield is a lower indicated value. NOI, leverage, and lease durability can offset or amplify that move. Fed rates are not commercial mortgage rates. Tenant NPV remains a different tool.</p></div>
            <section data-section-type="FAQ">
              <h2>FAQ</h2>
              ${faqs.map((row) => `<div><h3>${row.question}</h3><p>${row.answer}</p></div>`).join("\n              ")}
            </section>
            <section data-section-type="RELATED_CONTENT" aria-label="Related resources">
              <h2>Related resources</h2>
              <RelatedContent items={[
                { href: "/blog/", label: "Blog index" },
                { href: "/commercial-lease-npv/how-is-cap-rate-calculated/", label: "How is cap rate calculated?" },
                { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What is NPV in a commercial lease?" },
                { href: "/compare-commercial-leases", label: "Compare commercial leases" },
                { href: "/discount-rate-sensitivity", label: "Discount-rate sensitivity" },
                { href: "/resources", label: "Resource library" },
              ]} />
            </section>
            ${renderLatestBlogsCarouselHtml({ posts, excludePath: post.path, hideWhenNoDiscovery: true, surface: "article" })}
            ${occupancynpvBlogSequentialNavHtml(post.path, posts)}
          </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </article>
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(LATEST_BLOGS_CAROUSEL_SCRIPT)} }} />`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvBlogCategoryArchiveSource(category = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY): string {
  const page = occupancynpvBlogCategoryArchivePage(category);
  const posts = occupancynpvPublishedBlogPosts();
  const matching = posts.filter((post) => (post.primaryCategory ?? post.category) === category && !post.draft && !post.unpublished);
  const crumbs = occupancynpvBlogCategoryCrumbs(category).map((row) => ({ href: row.item, label: row.name }));
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Category",
          title: category,
          description: occupancynpvCategoryDescription(category),
          image: occupancynpvEntityCreative("category", category).src,
          image_alt: occupancynpvEntityCreative("category", category).alt,
        })}
        <section className="pv-section" data-section-type="INDEX">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial" data-blog-archive="category" data-blog-archive-count="${matching.length}">
            <div className="onpv-blog-main">
              ${renderTaxonomyArchiveRollHtml(matching, { kind: "category", slug: taxonomySlug(category) })}
              <section data-section-type="RELATED_CONTENT">
                <RelatedContent items={[
                  { href: "/blog/", label: "All blog posts" },
                  { href: "/commercial-lease-npv/how-is-cap-rate-calculated/", label: "How is cap rate calculated?" },
                  { href: "/resources", label: "Resource library" },
                ]} />
              </section>
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvBlogTagArchiveSource(tag: string): string {
  const page = occupancynpvBlogTagArchivePage(tag);
  const posts = occupancynpvPublishedBlogPosts();
  const matching = posts.filter((post) => post.tags.includes(tag) && !post.draft && !post.unpublished);
  const crumbs = occupancynpvBlogTagCrumbs(tag).map((row) => ({ href: row.item, label: row.name }));
  const related = occupancynpvActiveTags().filter((row) => row.tag !== tag).slice(0, 4);
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Topic",
          title: tag,
          description: occupancynpvTagDescription(tag),
          image: occupancynpvEntityCreative("tag", tag).src,
          image_alt: occupancynpvEntityCreative("tag", tag).alt,
        })}
        <section className="pv-section" data-section-type="INDEX">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial" data-blog-archive="tag" data-blog-archive-count="${matching.length}">
            <div className="onpv-blog-main">
              ${renderTaxonomyArchiveRollHtml(matching, { kind: "tag", slug: taxonomySlug(tag) })}
              <nav aria-label="Related topics" data-blog-related-topics="true">
                <h2 className="onpv-blog-section-heading">Related topics</h2>
                <p>${related.map((row) => taxonomyChipHtml("tag", row.tag)).join(" ") || taxonomyChipHtml("category", OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY)}</p>
              </nav>
              <section data-section-type="RELATED_CONTENT">
                <RelatedContent items={[
                  { href: "/blog/", label: "All blog posts" },
                  { href: "${blogCategoryArchivePath(OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY)}", label: "Valuation archive" },
                  { href: "/resources", label: "Resource library" },
                ]} />
              </section>
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvBlogTagHubSchema() {
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "TOPIC_HUB",
      url: "/blog/tag/",
      canonical: "/blog/tag/",
      title: "Blog topics — OccupancyNPV",
      description: "Browse OccupancyNPV blog topics and open the matching filtered archive.",
      breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
        { name: "Tag", item: "/blog/tag/" },
      ],
      visible_breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
        { name: "Tag", item: "/blog/tag/" },
      ],
      link_canonical: "/blog/tag/",
    },
  });
}

export function occupancynpvBlogTagHubSource(): string {
  const page: PlannedPage = {
    route: "/blog/tag",
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: "Blog topics — OccupancyNPV",
    metaDescription: "Browse OccupancyNPV blog topics and open the matching filtered archive.",
    canonical: "/blog/tag/",
    indexable: false,
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "editorial",
    pageOpportunityId: "occupancynpv-blog-tag-hub",
  };
  const posts = occupancynpvPublishedBlogPosts();
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/blog/tag/", label: "Tag" },
  ];
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Topics",
          title: "Blog topics",
          description: "Open a topic archive to see only the published notes assigned that tag.",
          image: "/media/blog/topic-hub.svg",
          image_alt: "Topic index graphic for OccupancyNPV blog archives.",
        })}
        <section className="pv-section">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial">
            <div className="onpv-blog-main">
              <div className="onpv-blog-cloud">${occupancynpvActiveTags().map((row) => taxonomyChipHtml("tag", row.tag)).join("")}</div>
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>`;
  return innerPageShell({ page, importDepth: "../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvInterestRateDraft(): OrganicDraft {
  const source = occupancynpvBlogArticleSource();
  const text = source.replace(/<[^>]+>/g, " ");
  return {
    title: occupancynpvBlogArticlePage().title,
    meta_description: occupancynpvBlogArticlePage().metaDescription,
    h1: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
    headings: [
      "Which interest rates are relevant to commercial real estate",
      "Why this matters commercially",
      "Why borrowing costs matter",
      "How interest rates influence required returns",
      "Valuation: NOI, cap rate, and property-specific risk",
      "Financing: LTV, DSCR, debt yield, and loan structure",
      "Buyer impact",
      "Seller impact",
      "Owner and operator impact",
      "How different property types can react",
      "Market context without a fake forecast",
      "Scenario analysis",
      "Financing example: loan sizing, equity, and DSCR",
      "Cap rate, yield on cost, and cash-on-cash",
      "What Owners Should Review When Rates Change",
      "Decision support for buyers, owners, sellers, and operators",
      "Common mistakes and misconceptions",
      "Limitations and tradeoffs",
      "Key takeaways",
      "FAQ",
    ],
    body: text,
    direct_answer:
      "When borrowing costs rise, buyers often require a higher unlevered income yield to pay the same price. Same NOI at a higher cap rate is a lower indicated value. That is not a tenant occupancy-cost NPV.",
    citations: [
      {
        source: "https://www.investopedia.com/terms/c/capitalizationrate.asp",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-17",
        claim: "Cap rate relates income to property value",
      },
    ],
    schema: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    breadcrumbs: ["Home", "Blog", OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY, OCCUPANCYNPV_BLOG_ARTICLE_QUESTION],
    internal_links: [
      "/blog/",
      "/commercial-lease-npv/how-is-cap-rate-calculated/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/compare-commercial-leases",
      "/discount-rate-sensitivity",
      "/resources",
    ],
    word_count: text.split(/\s+/).filter(Boolean).length,
    visible_faqs: occupancynpvBlogArticleFaqs(),
    speakable_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
    date_published: "2026-09-17",
    date_modified: "2026-09-17",
    page_kind: "BLOG_ARTICLE",
    origin: "https://occupancynpv.com",
    about: ["interest rates", "capitalization rate"],
    mentions: ["NOI", "commercial lease NPV"],
  };
}
