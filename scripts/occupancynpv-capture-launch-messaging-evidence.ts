import { persistOccupancynpvLaunchMessagingEvidence } from "../lib/infinity/venture-operating-scale/public-launch-messaging-consistency-gate";

const ROUTES = [
  "/",
  "/pricing",
  "/early-access",
  "/how-it-works",
  "/faq",
  "/terms-of-service",
  "/privacy-policy",
] as const;

async function main() {
  const pages = [];
  for (const route of ROUTES) {
    const res = await fetch(`https://occupancynpv.com${route}`, { redirect: "follow" });
    const html = await res.text();
    pages.push({ route, html, status: res.status });
  }
  persistOccupancynpvLaunchMessagingEvidence({
    capturedAt: new Date().toISOString(),
    pages: pages.map((page) => ({ route: page.route, html: page.html })),
  });
  console.log(JSON.stringify({
    captured: pages.map((page) => ({ route: page.route, status: page.status, bytes: page.html.length })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
