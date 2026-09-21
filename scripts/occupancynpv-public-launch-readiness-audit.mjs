const origin = "https://occupancynpv.com";
const paths = [
  "/",
  "/pricing",
  "/early-access",
  "/privacy-policy",
  "/terms-of-service",
  "/occupancynpv/app/login",
  "/how-it-works",
  "/faq",
  "/robots.txt",
  "/sitemap.xml",
];
const concepts = [
  { id: "if_product_is_built", re: /if the product is built/i },
  { id: "not_a_finished_product", re: /not a finished product/i },
  { id: "not_generally_available", re: /not generally available/i },
  { id: "payment_not_collected", re: /does not collect payment|payment is not collected/i },
  { id: "validation_stage", re: /validation-stage|validation \/ pilot|early validation \/ pilot/i },
  { id: "proposed_concept", re: /proposed early-access|pilot concept/i },
  { id: "waitlist", re: /waitlist/i },
];

async function fetchPage(path, redirect = "follow") {
  const res = await fetch(`${origin}${path}`, { redirect });
  const text = await res.text();
  return { status: res.status, location: res.headers.get("location"), text };
}

const pages = [];
for (const path of paths) {
  const page = await fetchPage(path);
  const hits = concepts.filter((row) => row.re.test(page.text)).map((row) => row.id);
  const title = (page.text.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
  const canon = (page.text.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || page.text.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) || [])[1] || "";
  pages.push({
    path,
    status: page.status,
    title,
    canon,
    footer: /Privacy Policy/.test(page.text) && /Terms of Service/.test(page.text) && /Sitemap/.test(page.text) && /An Infinity OS Venture/.test(page.text) && /By IMR/.test(page.text),
    imros: /https:\/\/imros\.io/.test(page.text),
    imr: /https:\/\/infinitemediaresources\.com/.test(page.text),
    support: /infinitemediaresources@gmail\.com/.test(page.text),
    unlimited: /\bunlimited\b/i.test(page.text) && !/does not include unlimited/i.test(page.text),
    hits,
  });
}
const www = await fetchPage("/", "manual").catch(() => null);
const wwwRes = await fetch("https://www.occupancynpv.com/", { redirect: "manual" });
const checkout = await fetch(`${origin}/api/checkout/start`);
const checkoutJson = await checkout.json();
const robots = pages.find((row) => row.path === "/robots.txt");
const sitemap = pages.find((row) => row.path === "/sitemap.xml");
const robotsText = (await fetchPage("/robots.txt")).text;
const sitemapText = (await fetchPage("/sitemap.xml")).text;

console.log(JSON.stringify({
  pages,
  www: { status: wwwRes.status, location: wwwRes.headers.get("location") },
  checkout: { status: checkout.status, body: checkoutJson },
  robotsHead: robotsText.slice(0, 400),
  sitemapHead: sitemapText.slice(0, 300),
  sitemapUrls: (sitemapText.match(/<loc>[^<]+<\/loc>/g) || []).length,
}, null, 2));
