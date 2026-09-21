const urls = {
  index: "https://occupancynpv.com/blog/",
  article: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  valuation: "https://occupancynpv.com/blog/category/valuation/",
  interest: "https://occupancynpv.com/blog/tag/interest-rates/",
  cap: "https://occupancynpv.com/blog/tag/cap-rates/",
  cre: "https://occupancynpv.com/blog/tag/commercial-real-estate/",
};

const rows = {};
for (const [key, url] of Object.entries(urls)) {
  const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } });
  const body = await res.text();
  rows[key] = {
    url,
    status: res.status,
    pills: (body.match(/data-blog-taxonomy-chip/g) || []).length,
    chip_class: body.includes("onpv-taxonomy-chip"),
    hero: body.includes("data-blog-hero"),
    hero_surface: body.includes('data-blog-taxonomy-surface="hero"'),
    photo_hero: body.includes("pv-hero-photo"),
    photo_chip: body.includes("pv-hero-photo") && body.includes("onpv-taxonomy-chip"),
    valuation: body.includes("[ VALUATION ]"),
    interest: body.includes("[ Interest Rates ]"),
    cap: body.includes("[ Cap Rates ]"),
    cre: body.includes("[ Commercial Real Estate ]"),
    valuation_svg: body.includes("/media/blog/valuation-category.svg"),
    interest_svg: body.includes("/media/blog/interest-rates.svg"),
    cap_svg: body.includes("/media/blog/cap-rates.svg"),
    cre_svg: body.includes("/media/blog/commercial-real-estate.svg"),
    article_img: body.includes("/media/hero-building.webp"),
    featured: body.includes("data-blog-featured-card"),
    latest: body.includes("data-blog-carousel") || body.includes("Latest Blogs"),
    topic_cloud: body.includes("data-blog-tag-cloud") || body.includes("data-blog-taxonomy-kind=\"tag\""),
    hover_css: body.includes("onpv-taxonomy-chip") && (body.includes(".onpv-taxonomy-chip:hover") || body.includes("onpv-taxonomy-chip")),
  };
}

const article = rows.article;
const allPills = Object.values(rows).every((row) => row.status === 200 && row.pills > 0 && row.chip_class);
console.log(JSON.stringify({
  all_pills_live: allPills,
  unique_creatives_live: rows.valuation.valuation_svg && rows.interest.interest_svg && rows.cap.cap_svg && rows.cre.cre_svg,
  article_same_entity: rows.article.article_img && rows.index.article_img,
  rows,
}, null, 2));
