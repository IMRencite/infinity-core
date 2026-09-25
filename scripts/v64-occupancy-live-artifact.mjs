import { writeFileSync } from "node:fs";

const URL = "https://occupancynpv.com/blog/";
const started = new Date().toISOString();
const response = await fetch(URL, {
  headers: { "user-agent": "InfinityOS-LiveCarouselEscape/v64" },
  redirect: "follow",
});
const html = await response.text();
const headers = {};
for (const [key, value] of response.headers.entries()) headers[key] = value;

function pick(re) {
  return html.match(re)?.[1] ?? null;
}

const cssHref = pick(/href="(\/_next\/static\/chunks\/[^"]+\.css[^"]*)"/);
const featuredStart = html.indexOf("Featured Blogs");
const relatedStart = html.indexOf("Related questions");
const slice = html.slice(Math.max(0, featuredStart - 500), relatedStart > featuredStart ? relatedStart : featuredStart + 9000);

const report = {
  timestamp: started,
  url: URL,
  final_url: response.url,
  status: response.status,
  cache: headers["x-vercel-cache"] ?? null,
  age: headers["age"] ?? null,
  vercel_id: headers["x-vercel-id"] ?? null,
  cache_control: headers["cache-control"] ?? null,
  etag: headers["etag"] ?? null,
  server: headers["server"] ?? null,
  deployment_id: pick(/data-dpl-id="([^"]+)"/),
  canonical: pick(/rel="canonical" href="([^"]+)"/),
  css_href: cssHref,
  markers: {
    featured_blogs: html.includes("Featured Blogs"),
    popular_blogs: html.includes("Popular Blogs"),
    featured_rail_card: html.includes("onpv-blog-featured-rail-card"),
    featured_body: html.includes("onpv-blog-featured-body"),
    featured_media: html.includes("onpv-blog-featured-media"),
    carousel_body: html.includes("data-carousel-body"),
    css_featured_body: html.includes(".onpv-blog-featured-body"),
    css_rail_card: html.includes(".onpv-blog-featured-rail-card"),
    density: pick(/data-carousel-density="([^"]+)"/),
    mode: pick(/data-carousel-mode="([^"]+)"/),
  },
  serving_repaired_artifact:
    html.includes("onpv-blog-featured-body") && html.includes("data-carousel-body"),
};

writeFileSync(".infinity/blog-os/v64-occupancy-live-artifact.json", `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(".infinity/blog-os/v64-occupancy-featured-slice.html", slice);
console.log(JSON.stringify(report, null, 2));
console.log("\n---FEATURED SLICE---\n");
console.log(slice);
