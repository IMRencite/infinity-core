import { chromium } from "@playwright/test";

const url = process.argv[2] || "https://imros-public.vercel.app";
const outDir = process.argv[3] || "C:/Users/Antivist/Desktop/Infinity/imros-public-deploy/.proof";
const views = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "tablet", width: 900, height: 1100 },
  { name: "mobile", width: 390, height: 1100 },
];

const browser = await chromium.launch();
const results = [];
for (const view of views) {
  const page = await browser.newPage({ viewport: { width: view.width, height: view.height } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const proof = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      building: Boolean(document.querySelector("[data-public-operations-building]")),
      floors: document.querySelectorAll("[data-public-floor]").length,
      salesFloor: Boolean(document.querySelector("[data-public-sales-floor]")),
      salesRooms: document.querySelectorAll("[data-sales-room-id]").length,
      agents: document.querySelectorAll("[data-public-agent-id]").length,
      occupancy: text.includes("OccupancyNPV"),
      askReview: /AskReview/i.test(text),
      hero: /digital headquarters/i.test(text),
      rooms: ["Outbound Acquisition", "Inbound Conversion", "Expansion & Retention", "Partnerships & Channel", "Offer & Closing"].every((name) => text.includes(name)),
    };
  });
  const file = `${outDir}/imros-public-${view.name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  results.push({ ...view, ...proof, errors, file });
}
await browser.close();
console.log(JSON.stringify({ url, results }, null, 2));
