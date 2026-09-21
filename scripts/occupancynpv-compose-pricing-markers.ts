import { writeFileSync } from "node:fs";
import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { pricingUxReady } from "../lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";

const composed = composeOccupancynpvPaymentReactivationFiles();
const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
writeFileSync(".infinity/venture-operating-scale/pricing-compose-dump.txt", pricing);
console.log(JSON.stringify({
  digest: composed.digest,
  artifactId: composed.artifactId,
  ready: pricingUxReady(pricing),
  compactHero: pricing.includes('data-commercial-hero="compact"'),
  photoHero: pricing.includes("pv-hero-photo"),
  split: pricing.includes("pv-pricing-split"),
  costQ: pricing.includes("What does OccupancyNPV cost?"),
  fake: /Primary offer · paid-first|data-offer-block/i.test(pricing),
  startProfessional: pricing.includes("Start Professional"),
  startOneDeal: pricing.includes("Start One Deal"),
}, null, 2));
