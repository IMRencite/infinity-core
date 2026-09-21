import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const urls = {
  index: "https://occupancynpv.com/blog/",
  article: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  valuation: "https://occupancynpv.com/blog/category/valuation/",
  interest: "https://occupancynpv.com/blog/tag/interest-rates/",
  cap: "https://occupancynpv.com/blog/tag/cap-rates/",
  cre: "https://occupancynpv.com/blog/tag/commercial-real-estate/",
};

async function html(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } });
  return { status: res.status, body: await res.text(), url: res.url };
}

const pages = Object.fromEntries(
  await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await html(url)])),
);

const article = pages.article.body;
const index = pages.index.body;
const cssPresent = article.includes("onpv-taxonomy-chip") && article.includes("data-blog-taxonomy-chip");
const photoHero = article.includes("pv-hero-photo");
const photoChip = article.includes("pv-hero-photo") && (article.includes("onpv-taxonomy-chip") || /pv-hero-photo[\s\S]{0,4000}onpv-taxonomy-chip/.test(article));

const live = {
  pages: Object.fromEntries(Object.entries(pages).map(([key, row]) => [key, { status: row.status, pills: (row.body.match(/data-blog-taxonomy-chip/g) || []).length, hero: row.body.includes("data-blog-hero"), unique: {
    valuation: row.body.includes("/media/blog/valuation-category.svg"),
    interest: row.body.includes("/media/blog/interest-rates.svg"),
    cap: row.body.includes("/media/blog/cap-rates.svg"),
    cre: row.body.includes("/media/blog/commercial-real-estate.svg"),
    article: row.body.includes("/media/hero-building.webp"),
  } }])),
  article_hero_photo: photoHero,
  article_pills: (article.match(/data-blog-taxonomy-chip/g) || []).length,
  article_chip_class: article.includes("onpv-taxonomy-chip"),
  article_hover_css: article.includes("onpv-taxonomy-chip") && (article.includes(":hover") || article.includes("onpv-taxonomy-chip")),
  index_featured_pills: /data-blog-featured-card[\s\S]{0,4000}data-blog-taxonomy-chip/.test(index),
  index_latest_pills: /data-blog-carousel[\s\S]{0,8000}data-blog-taxonomy-chip/.test(index) || /Latest Blogs[\s\S]{0,8000}data-blog-taxonomy-chip/.test(index),
  index_topic_cloud_pills: /data-blog-tag-cloud[\s\S]{0,4000}data-blog-taxonomy-chip/.test(index) || /tag-cloud[\s\S]{0,4000}data-blog-taxonomy-chip/.test(index),
  photo_chip_contrast: photoChip,
  cssPresent,
};

console.log(JSON.stringify(live, null, 2));
