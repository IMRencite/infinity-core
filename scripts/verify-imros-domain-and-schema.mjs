import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const require = createRequire(import.meta.url);

async function loadTs(rel) {
  const url = pathToFileURL(join(root, rel)).href;
  return import(url);
}

const pages = [
  "https://occupancynpv.com/commercial-lease-npv/how-is-cap-rate-calculated",
  "https://occupancynpv.com/blog/",
  "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
];

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      blocks.push({ invalid: true });
    }
  }
  return blocks;
}

function typesOf(blocks) {
  const types = [];
  for (const block of blocks) {
    const graph = Array.isArray(block["@graph"]) ? block["@graph"] : [block];
    for (const node of graph) {
      const value = node?.["@type"];
      if (Array.isArray(value)) types.push(...value);
      else if (value) types.push(String(value));
    }
  }
  return types;
}

const SiteHome = await fetch("https://imros.io/", { redirect: "follow" });
const homeHtml = await SiteHome.text();
const dpl = /data-dpl-id="([^"]+)"/.exec(homeHtml)?.[1] ?? "unknown";

const audits = [];
for (const url of pages) {
  const response = await fetch(url, { redirect: "follow" });
  const html = await response.text();
  const blocks = extractJsonLd(html);
  audits.push({
    url,
    status: response.status,
    types: typesOf(blocks),
    has_jsonld: blocks.length > 0,
    has_breadcrumb_nav: /aria-label="Breadcrumb"|pv-breadcrumb/.test(html),
    speakable_ids: ["direct-answer", "summary", "key-takeaways"].filter((id) => html.includes(`id="${id}"`)),
    visible_faq: /<h2>FAQ<\/h2>/.test(html),
  });
}

const out = {
  generated_at: new Date().toISOString(),
  floor: {
    live: "https://imros.io/",
    status: SiteHome.status,
    dpl,
    package: "imros-public-deploy",
  },
  occupancynpv_live_schema: audits,
};

const dest = join(root, ".infinity", "organic-growth-engine", "occupancynpv-live-schema-audit.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
void require;
void loadTs;
