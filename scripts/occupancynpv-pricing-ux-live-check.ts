import { pricingUxReady } from "../lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";

async function main() {
  const res = await fetch("https://occupancynpv.com/pricing", { redirect: "follow" });
  const html = await res.text();
  console.log(JSON.stringify({
    status: res.status,
    ready: pricingUxReady(html),
    offerBlock: html.includes("data-offer-block"),
    paidFirstLabel: /Primary offer · paid-first|entitlement remains ACTIVE/i.test(html),
    professional: html.includes("Start Professional"),
    perDeal: html.includes("Start One Deal"),
    professionalPrice: html.includes("$290"),
    perDealPrice: html.includes("$149"),
  }, null, 2));
}

main();
