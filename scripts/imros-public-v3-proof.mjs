import { chromium } from "@playwright/test";

const url = process.argv[2] || "https://imros-public.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
const requests = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("request", (req) => requests.push(req.url()));
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
const proof = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    hero: /Infinity OS/.test(text) && /sanitized live operations view/i.test(text),
    observationLayer: /public observation layer/i.test(text),
    commandRail: Boolean(document.querySelector('[aria-label="Public command rail"]')),
    recentTitle: /Top 10 Most Recent Public Ventures/i.test(text),
    occupancy: text.includes("OccupancyNPV"),
    askReview: /AskReview/i.test(text),
    salesFloor: Boolean(document.querySelector("[data-public-sales-floor]")),
    salesRooms: [...document.querySelectorAll("[data-sales-room-id]")].map((el) => el.getAttribute("data-sales-room-id")),
    affiliate: Boolean(document.querySelector("[data-affiliate-capability]")),
    affiliateZone: Boolean(document.querySelector("[data-affiliate-zone]")),
    rooms: ["Operations", "Research", "Growth", "Validation", "Systems", "Finance", "Product", "Creative", "Sales"].every((name) => text.includes(name)),
    salesNames: ["Outbound Acquisition", "Inbound Conversion", "Expansion & Retention", "Partnerships & Channel", "Offer & Closing"].every((name) => text.includes(name)),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    privacy: Boolean(document.querySelector('a[href="/public/privacy"]')),
    terms: Boolean(document.querySelector('a[href="/public/terms"]')),
    buildingColumns: document.querySelector('[data-building-columns="3"]') != null,
    interiors: document.querySelectorAll("[data-room-interior]").length,
    workTables: document.querySelectorAll("[data-work-table]").length,
    agentCount: document.querySelectorAll("[data-public-agent-id]").length,
  };
});
const apiRes = await fetch(`${url.replace(/\/$/, "")}/api/public/operations`, { credentials: "omit" });
const apiJson = await apiRes.json();
const serialized = JSON.stringify(apiJson).toLowerCase();
await browser.close();
console.log(JSON.stringify({
  url,
  proof,
  errors,
  privateHits: requests.filter((row) => /treasury|dashboard|runtime\/tick|sse/i.test(row)),
  api: {
    status: apiRes.status,
    contract: apiJson.contract,
    ventures: (apiJson.public_ventures || []).map((row) => row.public_name),
    askReview: serialized.includes("askreview"),
    mercury: serialized.includes("mercury"),
    treasury: serialized.includes("treasury"),
  },
}, null, 2));
